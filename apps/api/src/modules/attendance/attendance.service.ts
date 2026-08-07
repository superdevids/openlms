import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import type { AttendanceMethod, AttendanceStatus } from "@openlms/types";
import { AttendanceRekapService } from "./attendance-rekap.service";
import {
  GEOFENCE_RADIUS_M_DEFAULT,
  QR_TOKEN_TTL_MIN_DEFAULT,
  QR_TOKEN_TTL_MIN_MAX,
  QR_TOKEN_TTL_MIN_MIN,
  SESSION_DEFAULT_DURATION_MIN
} from "./attendance.constants";
import type { ActorContext } from "./current-actor";
import type { CreateAttendanceDto } from "./dto/create-attendance.dto";
import type { CreatePermitDto } from "./dto/create-permit.dto";
import type { CreateSessionDto } from "./dto/create-session.dto";
import type { DisciplineQueryDto } from "./dto/discipline-query.dto";
import type { GenerateTokenDto } from "./dto/generate-token.dto";
import type { RekapQueryDto } from "./dto/rekap-query.dto";
import type { ScanRecordDto } from "./dto/scan-record.dto";
import type { VerifyPermitDto } from "./dto/verify-permit.dto";
import type {
  AttendanceRekapSummary,
  DisciplineStudentSummary,
  ManualAttendanceEntry,
  PermitNotePayload,
  ScanResponse
} from "./attendance.types";
import { clampInt, generateRawToken, hashToken, isWithinRadiusMeters } from "./attendance.utils";

const PERMIT_VERIFIER_ROLES = new Set(["GURU", "GURU_BK", "WAKEPSEK", "KEPSEK", "SUPERADMIN"]);

/**
 * AttendanceService — absensi manual + sesi QR + izin/sakit online + rekap & kedisiplinan.
 * Acuan: prd04 §5.A.7; tek-05 M-ABSQR-T1..T9.
 * RBAC aktif: guard @RequirePermission (AuthGuard → PermissionsGuard) +
 * scope per metode di service (isSelfScope/isSchoolScope/assertClassSubjectInScope).
 */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly rekapService: AttendanceRekapService
  ) {}

  // ============================================================
  // Absensi manual (MVP) — guru mencatat per kelas-pertemuan
  // ============================================================

  /**
   * Catat absensi manual bulk. Idempotent per (student_id, class_subject_id, date):
   * baris yang sudah ada di-update (re-upload hari yang sama aman).
   * RBAC: attendance:record:class (GURU/GURU_BK/WAKEPSEK/KEPSEK/SUPERADMIN — prd04 §4.3).
   * Scope KELAS: GURU hanya boleh mencatat class_subject yang dia ampu
   * (actor.classIds); role sekolah (KEPSEK/WAKEPSEK/OPERATOR/GURU_BK/SUPERADMIN) bebas.
   */
  async recordManual(
    dto: CreateAttendanceDto,
    actor: ActorContext
  ): Promise<ManualAttendanceEntry[]> {
    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("date tidak valid");
    }
    if (!dto.records || dto.records.length === 0) {
      throw new BadRequestException("records tidak boleh kosong");
    }
    this.assertClassSubjectInScope(dto.class_subject_id ?? null, actor);

    const seen = new Set<string>();
    for (const record of dto.records) {
      if (seen.has(record.student_id)) {
        throw new ConflictException(`duplikat student_id ${record.student_id} dalam satu request`);
      }
      seen.add(record.student_id);
    }

    const entries: ManualAttendanceEntry[] = dto.records.map((record) => ({
      student_id: record.student_id,
      class_subject_id: dto.class_subject_id ?? null,
      date,
      status: record.status,
      note: record.note ?? null,
      method: "MANUAL",
      recorded_by: actor.userId
    }));

    const saved: ManualAttendanceEntry[] = [];
    for (const entry of entries) {
      saved.push(await this.upsertAttendance(entry));
    }
    return saved;
  }

  /** Upsert memakai unique (student_id, class_subject_id, date); NULL class_subject ditangani manual. */
  private async upsertAttendance(entry: ManualAttendanceEntry): Promise<ManualAttendanceEntry> {
    if (entry.class_subject_id) {
      return this.prisma.attendance.upsert({
        where: {
          student_id_class_subject_id_date: {
            student_id: entry.student_id,
            class_subject_id: entry.class_subject_id,
            date: entry.date
          }
        },
        create: entry,
        update: {
          status: entry.status,
          note: entry.note,
          method: entry.method,
          recorded_by: entry.recorded_by
        }
      });
    }

    // Harian (class_subject_id NULL): unique constraint Postgres menganggap NULL berbeda,
    // jadi guard dilakukan manual di service.
    const existing = await this.prisma.attendance.findFirst({
      where: { student_id: entry.student_id, class_subject_id: null, date: entry.date }
    });
    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: entry.status,
          note: entry.note,
          method: entry.method,
          recorded_by: entry.recorded_by
        }
      });
    }
    return this.prisma.attendance.create({ data: entry });
  }

  // ============================================================
  // Sesi absensi QR + token sekali pakai (M-ABSQR-T1/T2)
  // ============================================================

  /**
   * Buat sesi absensi (QR_CODE/GEOFENCING/MANUAL).
   * RBAC: attendance:session:write:class (GURU) — scope KELAS: class_subject
   * harus dalam actor.classIds; role sekolah bebas.
   */
  async createSession(dto: CreateSessionDto, actor: ActorContext) {
    const now = new Date();
    const startsAt = dto.starts_at ? new Date(dto.starts_at) : now;
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException("starts_at tidak valid");
    }
    const endsAt = dto.ends_at
      ? new Date(dto.ends_at)
      : new Date(startsAt.getTime() + SESSION_DEFAULT_DURATION_MIN * 60_000);
    if (Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException("ends_at tidak valid");
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException("ends_at harus setelah starts_at");
    }
    this.assertClassSubjectInScope(dto.class_subject_id ?? null, actor);

    return this.prisma.attendanceSession.create({
      data: {
        class_subject_id: dto.class_subject_id ?? null,
        title: dto.title,
        method: dto.method,
        starts_at: startsAt,
        ends_at: endsAt,
        created_by: actor.userId
      }
    });
  }

  /** Detail sesi + hasil scan (status live untuk guru). */
  async getSession(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        records: {
          select: { id: true, student_id: true, recorded_at: true, status: true, method: true }
        }
      }
    });
    if (!session) {
      throw new NotFoundException("Sesi absensi tidak ditemukan");
    }
    return session;
  }

  /**
   * Generate token QR sekali pakai untuk sesi. TTL 5-10 menit, default 7.
   * Hanya SHA-256 hash token yang disimpan (prd04 §5.A.7).
   * RBAC: attendance:session:write:class — pembuat sesi ATAU scope KELAS/SEKOLAH.
   */
  async generateSessionToken(sessionId: string, dto: GenerateTokenDto, actor: ActorContext) {
    const session = await this.prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException("Sesi absensi tidak ditemukan");
    }
    if (session.created_by !== actor.userId && !actor.roles.includes("SUPERADMIN")) {
      // Scope KELAS: guru boleh generate token untuk sesi kelas yang dia ampu.
      if (session.class_subject_id) {
        this.assertClassSubjectInScope(session.class_subject_id, actor);
      } else if (!this.isSchoolScope(actor)) {
        throw new ForbiddenException("Hanya pembuat sesi yang dapat generate token");
      }
    }

    const ttlMinutes = clampInt(
      dto.ttl_minutes,
      QR_TOKEN_TTL_MIN_MIN,
      QR_TOKEN_TTL_MIN_MAX,
      QR_TOKEN_TTL_MIN_DEFAULT
    );
    const raw = generateRawToken();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    const token = await this.prisma.attendanceQrToken.create({
      data: { attendance_session_id: session.id, token: hashToken(raw), expires_at: expiresAt }
    });

    return {
      attendance_session_id: session.id,
      token_id: token.id,
      token: raw, // hanya raw yang dikirim ke client (payload QR)
      expires_at: expiresAt,
      ttl_minutes: ttlMinutes
    };
  }

  /**
   * Scan QR (M-ABSQR-T2/T8). Aturan:
   * - Duplikat Idempotency-Key (queue offline IndexedDB) -> 200 record lama.
   * - Token sudah dipakai orang lain -> 409 (anti-titip).
   * - Token sudah dipakai user yang sama (retry) -> 200 idempotent.
   * - Token kedaluwarsa -> 410 (validasi waktu SERVER, bukan device).
   * - Sesi belum aktif/berakhir -> 409.
   * - Sudah check-in sesi ini -> 200 idempotent.
   * RBAC (attendance:scan:self): SISWA — student_id SELALU actor.userId
   * (student_id dari client DIIGNOR, anti-IDOR); GURU/staff — boleh scan atas
   * nama siswa hanya bila sesi berada dalam scope KELAS (actor.classIds).
   */
  async scan(dto: ScanRecordDto, actor: ActorContext): Promise<ScanResponse> {
    if (!dto.token) {
      throw new BadRequestException("token wajib diisi");
    }
    if (this.isSelfScope(actor) && !actor.userId) {
      throw new BadRequestException("student_id tidak dapat ditentukan dari aktor");
    }
    if (!this.isSelfScope(actor) && !dto.student_id) {
      throw new BadRequestException("student_id wajib diisi untuk scan atas nama siswa");
    }
    // Anti-IDOR: SISWA mengerjakan sebagai dirinya sendiri.
    const studentId = this.isSelfScope(actor) ? actor.userId : dto.student_id;

    const tokenRow = await this.prisma.attendanceQrToken.findUnique({
      where: { token: hashToken(dto.token) },
      include: { attendance_session: true }
    });
    if (!tokenRow) {
      throw new NotFoundException("Token QR tidak ditemukan");
    }

    const session = tokenRow.attendance_session;
    const now = new Date();

    // Scope KELAS: GURU hanya boleh scan/merekam untuk sesi kelas yang dia ampu.
    if (!this.isSelfScope(actor) && session.class_subject_id) {
      this.assertClassSubjectInScope(session.class_subject_id, actor);
    }

    // 1) Idempotency-Key: duplikat key dari offline queue -> 200 dengan record lama
    if (dto.idempotency_key) {
      const existingByKey = await this.prisma.attendanceRecord.findFirst({
        where: { idempotency_key: dto.idempotency_key }
      });
      if (existingByKey) {
        return this.toScanResponse(existingByKey, true);
      }
    }

    // 2) Token sudah dipakai
    if (tokenRow.used_at) {
      if (tokenRow.used_by === studentId) {
        const existing = await this.prisma.attendanceRecord.findFirst({
          where: { attendance_session_id: session.id, student_id: studentId }
        });
        if (existing) {
          return this.toScanResponse(existing, true);
        }
      }
      throw new ConflictException("Token QR sudah digunakan");
    }

    // 3) Kedaluwarsa — waktu SERVER (toleransi jam device tidak dipakai)
    if (now.getTime() > tokenRow.expires_at.getTime()) {
      throw new GoneException("Token QR sudah kedaluwarsa");
    }

    // 4) Jendela waktu sesi — waktu SERVER
    if (now.getTime() < session.starts_at.getTime() || now.getTime() > session.ends_at.getTime()) {
      throw new ConflictException("Sesi absensi belum aktif atau sudah berakhir");
    }

    // 5) Sudah check-in sesi ini (retry tanpa key) -> 200 idempotent
    const existingRecord = await this.prisma.attendanceRecord.findFirst({
      where: { attendance_session_id: session.id, student_id: studentId }
    });
    if (existingRecord) {
      return this.toScanResponse(existingRecord, true);
    }

    // 6) Geofencing sebagai sinyal (native, tanpa map API; bisa di-spoof)
    await this.assertGeofence(session.method, dto.latitude, dto.longitude);

    const method = session.method as AttendanceMethod;
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        // Claim token secara atomik: hanya sukses jika belum dipakai
        const claim = await tx.attendanceQrToken.updateMany({
          where: { id: tokenRow.id, used_at: null },
          data: { used_at: now, used_by: studentId }
        });
        if (claim.count === 0) {
          throw new ConflictException("Token QR sudah digunakan");
        }
        return tx.attendanceRecord.create({
          data: {
            attendance_session_id: session.id,
            student_id: studentId,
            recorded_at: now,
            method,
            status: "HADIR",
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            idempotency_key: dto.idempotency_key ?? null
          }
        });
      });
      return this.toScanResponse(record, false);
    } catch (err) {
      // Race: unique (session, student) — kembalikan record yang sudah ada
      if (this.isUniqueViolation(err)) {
        const existing = await this.prisma.attendanceRecord.findFirst({
          where: { attendance_session_id: session.id, student_id: studentId }
        });
        if (existing) {
          return this.toScanResponse(existing, true);
        }
      }
      throw err;
    }
  }

  /**
   * Geofencing sinyal: metode GEOFENCING wajib menyertakan koordinat; di luar radius -> 403.
   * Pusat sekolah dari env SCHOOL_LATITUDE/SCHOOL_LONGITUDE; tanpa pusat -> izinkan (sinyal lemah).
   */
  private async assertGeofence(
    method: AttendanceMethod,
    latitude?: number | null,
    longitude?: number | null
  ): Promise<void> {
    if (method !== "GEOFENCING") return;

    const centerLat = Number(process.env.SCHOOL_LATITUDE ?? NaN);
    const centerLng = Number(process.env.SCHOOL_LONGITUDE ?? NaN);
    const radiusM = clampInt(
      Number(process.env.GEOFENCE_RADIUS_M ?? NaN),
      1,
      10_000,
      GEOFENCE_RADIUS_M_DEFAULT
    );

    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null
    ) {
      throw new ForbiddenException("Koordinat wajib diisi untuk metode GEOFENCING");
    }
    if (Number.isNaN(centerLat) || Number.isNaN(centerLng)) {
      return; // pusat sekolah belum dikonfigurasi -> sinyal opsional, jangan tolak
    }
    if (!isWithinRadiusMeters(latitude, longitude, centerLat, centerLng, radiusM)) {
      throw new ForbiddenException("Lokasi di luar radius sekolah");
    }
  }

  // ============================================================
  // Izin/sakit online (M-ABSQR-T7)
  // Schema TIDAK memiliki entitas Permit → record disimpan di tabel `attendance`
  // (status IZIN/SAKIT + method MANUAL + note JSON PermitNotePayload).
  // ============================================================

  /**
   * Ajukan izin/sakit + path surat. Idempotent: bila sudah ada record hari itu,
   * record di-update menjadi PENDING (tidak membuat duplikat).
   * RBAC (permit:request:self): SISWA — student_id SELALU actor.userId
   * (student_id dari client DIIGNOR, anti-IDOR); staff boleh mengajukan atas
   * nama siswa (guard permit:request:self hanya untuk SISWA).
   */
  async requestPermit(dto: CreatePermitDto, actor: ActorContext) {
    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("date tidak valid");
    }
    const classSubjectId = dto.class_subject_id ?? null;
    // Anti-IDOR: SISWA mengajukan sebagai dirinya sendiri.
    const studentId = this.isSelfScope(actor) ? actor.userId : dto.student_id;
    if (!this.isSelfScope(actor) && !dto.student_id) {
      throw new BadRequestException("student_id wajib diisi");
    }

    const existing = await this.prisma.attendance.findFirst({
      where: { student_id: studentId, class_subject_id: classSubjectId, date }
    });
    if (existing) {
      const existingNote = this.parsePermitNote(existing.note);
      if (existingNote && existingNote.status === "PENDING") {
        throw new ConflictException("Sudah ada pengajuan izin/sakit yang menunggu verifikasi");
      }
    }

    const payload: PermitNotePayload = {
      kind: "permit",
      type: dto.type,
      reason: dto.reason,
      attachmentPath: dto.attachment_path,
      status: "PENDING"
    };

    if (existing) {
      const updated = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: { status: dto.type, note: JSON.stringify(payload) }
      });
      return { ...updated, note: payload };
    }

    const created = await this.prisma.attendance.create({
      data: {
        student_id: studentId,
        class_subject_id: classSubjectId,
        date,
        status: dto.type,
        note: JSON.stringify(payload),
        method: "MANUAL",
        recorded_by: actor.userId
      }
    });
    return { ...created, note: payload };
  }

  /**
   * Verifikasi pengajuan izin oleh homeroom/GURU_BK.
   * Approve -> status IZIN/SAKIT sesuai pengajuan; Reject -> ALPA.
   * RBAC (permit:verify:class): guard membatasi role; scope KELAS belum
   * diverifikasi terhadap homeroom di sini (cek homeroom mengikuti F1-T4 scope
   * resolver — homeroomClassId tersedia di RequestContext).
   */
  async verifyPermit(attendanceId: string, dto: VerifyPermitDto, actor: ActorContext) {
    if (!actor.roles.some((role) => PERMIT_VERIFIER_ROLES.has(role))) {
      throw new ForbiddenException("Hanya homeroom/GURU_BK yang dapat memverifikasi izin");
    }

    const record = await this.prisma.attendance.findUnique({ where: { id: attendanceId } });
    if (!record) {
      throw new NotFoundException("Pengajuan izin tidak ditemukan");
    }
    const note = this.parsePermitNote(record.note);
    if (!note) {
      throw new BadRequestException("Record ini bukan pengajuan izin/sakit");
    }
    if (note.status !== "PENDING") {
      throw new ConflictException("Pengajuan sudah diverifikasi");
    }

    const updatedNote: PermitNotePayload = {
      ...note,
      status: dto.approved ? "APPROVED" : "REJECTED",
      verifiedBy: actor.userId,
      verifiedAt: new Date().toISOString(),
      rejectReason: dto.approved ? undefined : (dto.reason ?? "Ditolak")
    };

    const updated = await this.prisma.attendance.update({
      where: { id: record.id },
      data: { status: dto.approved ? note.type : "ALPA", note: JSON.stringify(updatedNote) }
    });
    return { ...updated, note: updatedNote };
  }

  // ============================================================
  // Rekap & kedisiplinan (M-ABSQR-T5/T6)
  // ============================================================

  /** Rekap kehadiran per siswa/mapel/periode + ringkasan per siswa. */
  async rekap(
    dto: RekapQueryDto,
    actor: ActorContext
  ): Promise<{
    period: { start: Date | null; end: Date | null };
    summary: AttendanceRekapSummary;
    perStudent: { studentId: string; summary: AttendanceRekapSummary }[];
  }> {
    const where: Prisma.AttendanceWhereInput = {};
    // Scope RBAC (attendance:rekap:self/class/school):
    // - SISWA: rekap SELALU dirinya sendiri (dto.student_id diabaikan).
    // - GURU (KELAS): hanya siswa di kelas yang dia ampu (actor.classIds).
    // - Role sekolah (KEPSEK/WAKEPSEK/OPERATOR/GURU_BK/SUPERADMIN): bebas.
    if (this.isSelfScope(actor)) {
      where.student_id = actor.userId;
    } else if (actor.roles.includes("GURU") && actor.classIds.length > 0) {
      if (dto.student_id) where.student_id = dto.student_id;
      where.class_subject_id = { in: actor.classIds };
    } else {
      if (dto.student_id) where.student_id = dto.student_id;
    }
    if (dto.class_subject_id) where.class_subject_id = dto.class_subject_id;
    if (dto.start_date || dto.end_date) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (dto.start_date) dateFilter.gte = new Date(dto.start_date);
      if (dto.end_date) dateFilter.lte = new Date(dto.end_date);
      where.date = dateFilter;
    }

    const records = await this.prisma.attendance.findMany({
      where,
      select: { student_id: true, status: true }
    });

    const summary = this.rekapService.computeRekap(records.map((record) => record.status));

    const byStudent = new Map<string, AttendanceStatus[]>();
    for (const record of records) {
      const list = byStudent.get(record.student_id) ?? [];
      list.push(record.status);
      byStudent.set(record.student_id, list);
    }
    const perStudent = Array.from(byStudent.entries()).map(([studentId, statuses]) => ({
      studentId,
      summary: this.rekapService.computeRekap(statuses)
    }));

    return {
      period: {
        start: dto.start_date ? new Date(dto.start_date) : null,
        end: dto.end_date ? new Date(dto.end_date) : null
      },
      summary,
      perStudent
    };
  }

  /** Dashboard kedisiplinan: jumlah ALPA per siswa per bulan; highlight siswa berisiko. */
  async discipline(
    dto: DisciplineQueryDto
  ): Promise<{ month: string; threshold: number; students: DisciplineStudentSummary[] }> {
    const now = new Date();
    const year = dto.year ?? now.getUTCFullYear();
    const month = dto.month ?? now.getUTCMonth() + 1;
    if (month < 1 || month > 12) {
      throw new BadRequestException("month harus 1-12");
    }
    const threshold = dto.resolvedThreshold;

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const records = await this.prisma.attendance.findMany({
      where: { status: "ALPA", date: { gte: start, lt: end } },
      select: { student_id: true, status: true }
    });

    const students = this.rekapService.computeDiscipline(
      records.map((record) => ({ studentId: record.student_id, status: record.status })),
      threshold
    );

    return {
      month: `${year}-${String(month).padStart(2, "0")}`,
      threshold,
      students
    };
  }

  // ============================================================
  // Helpers
  // ============================================================

  /** Role dengan scope SEKOLAH di area absensi (prd04 §4.3 attendance:rekap:school). */
  private static readonly SCHOOL_SCOPED_ROLES = new Set([
    "SUPERADMIN",
    "KEPSEK",
    "WAKEPSEK",
    "OPERATOR",
    "GURU_BK"
  ]);

  /** Scope SENDIRI: SISWA (attendance:scan:self / rekap:self / permit:request:self). */
  private isSelfScope(actor: ActorContext): boolean {
    return actor.roles.includes("SISWA");
  }

  private isSchoolScope(actor: ActorContext): boolean {
    return actor.roles.some((r) => AttendanceService.SCHOOL_SCOPED_ROLES.has(r));
  }

  /**
   * Scope KELAS: GURU hanya boleh mencatat/scan sesi untuk class_subject yang
   * dia ampu (actor.classIds). NULL class_subject diizinkan (rekap harian).
   * Role sekolah bebas; SISWA tidak melewati jalur ini.
   */
  private assertClassSubjectInScope(classSubjectId: string | null, actor: ActorContext): void {
    if (this.isSchoolScope(actor) || this.isSelfScope(actor)) return;
    if (!classSubjectId) return;
    if (actor.classIds.length > 0 && !actor.classIds.includes(classSubjectId)) {
      throw new ForbiddenException("Akses ditolak: kelas/mapel di luar scope");
    }
  }

  private toScanResponse(
    record: {
      id: string;
      attendance_session_id: string;
      student_id: string;
      status: AttendanceStatus;
      method: AttendanceMethod;
      recorded_at: Date;
    },
    idempotent: boolean
  ): ScanResponse {
    return { ...record, idempotent };
  }

  private parsePermitNote(note: string | null): PermitNotePayload | null {
    if (!note) return null;
    try {
      const parsed = JSON.parse(note) as Partial<PermitNotePayload>;
      if (parsed.kind !== "permit") return null;
      return parsed as PermitNotePayload;
    } catch {
      return null;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
  }
}
