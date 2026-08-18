import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { AuditAction, ImportType, JobStatus, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@opensis/database";
import { ImportRowsDto } from "./dto/import.dto";
import { generateTemporaryPassword, hashPassword } from "../auth/password.util";
import { resolveActorRole } from "../lms/lms-audit";
import { JOB_NAMES, QUEUE_TOKEN, type IJobQueue } from "../queue/queue.types";

export interface ImportTemplateColumn {
  key: string;
  label: string;
  required: boolean;
  description: string;
  example?: string;
}

export interface ImportTemplate {
  type: ImportType;
  name: string;
  columns: ImportTemplateColumn[];
}

export interface ImportRowError {
  rowNumber: number;
  field: string | null;
  message: string;
}

export interface ImportPreviewResult {
  importType: ImportType;
  totalRows: number;
  validCount: number;
  errorCount: number;
  validRows: Record<string, unknown>[];
  errors: ImportRowError[];
}

export interface ImportRunResult {
  batchId: string;
  importType: ImportType;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: JobStatus;
  errors: ImportRowError[];
}

/** Payload job import.commit (dienqueue REST, dieksekusi ImportProcessor). */
export interface ImportCommitPayload {
  batchId: string;
  importType: ImportType;
  /** baris yang lolos validasi (sudah ber-_rowNumber) */
  rows: (Record<string, unknown> & { _rowNumber: number })[];
  actorId: string;
  ip?: string;
  /** Role aktor untuk actor_role AuditLog (R-13, deterministik). */
  actorRoles?: string[];
  totalRows: number;
  /** jumlah error validasi yang sudah ditulis REST (createMany) */
  validationErrorsCount: number;
}

/** Ukuran chunk createMany per $transaction — impor besar dibagi agar tidak
 *  melewati batas parameter SQL (mis. 500 baris x ~5 kolom per query). */
const IMPORT_COMMIT_CHUNK_SIZE = 500;

const IMPORT_TEMPLATES: ImportTemplate[] = [
  {
    type: ImportType.STUDENT,
    name: "Template Impor Siswa",
    columns: [
      {
        key: "nisn",
        label: "NISN",
        required: true,
        description: "10 digit, unik",
        example: "1234567890"
      },
      {
        key: "nama",
        label: "Nama Lengkap",
        required: true,
        description: "Nama siswa",
        example: "Budi Santoso"
      },
      {
        key: "kelas",
        label: "Kelas/Rombel",
        required: true,
        description: "Harus sudah ada di sekolah",
        example: "X IPA 1"
      },
      { key: "namaOrtu", label: "Nama Orang Tua", required: false, description: "Opsional" },
      { key: "kontakOrtu", label: "Kontak Orang Tua", required: false, description: "Opsional" }
    ]
  },
  {
    type: ImportType.TEACHER,
    name: "Template Impor Guru/Staf",
    columns: [
      {
        key: "nuptk",
        label: "NUPTK",
        required: false,
        description: "16 digit, opsional tapi wajib untuk ekspor Dapodik",
        example: "1234567890123456"
      },
      { key: "nama", label: "Nama Lengkap", required: true, description: "Nama guru/staf" },
      {
        key: "mapel",
        label: "Mata Pelajaran",
        required: false,
        description: "Opsional (untuk guru)"
      },
      {
        key: "jabatan",
        label: "Jabatan",
        required: false,
        description: "GURU / OPERATOR / KEUANGAN / BK / KEPSEK / WAKEPSEK / LAINNYA"
      }
    ]
  },
  {
    type: ImportType.CLASS,
    name: "Template Impor Kelas/Rombel",
    columns: [
      {
        key: "nama",
        label: "Nama Kelas",
        required: true,
        description: "Unik per tahun ajaran",
        example: "X IPA 1"
      },
      {
        key: "grade_level",
        label: "Tingkat (10-13)",
        required: true,
        description: "10/11/12/13",
        example: "10"
      },
      {
        key: "homeroom",
        label: "Wali Kelas",
        required: false,
        description: "Opsional (nama wali kelas)"
      }
    ]
  }
];

/**
 * ImportService — wizard impor dasar (prd04 §9.2, 03-database-erd §4.10/4.11).
 * Preview: validasi NISN/NUPTK + deteksi duplikat format; commit: ImportBatch +
 * ImportError + pembuatan data dasar (siswa/guru/kelas). Impor idempoten: batch
 * baru per commit; baris gagal tidak membatalkan batch (parsial aman).
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaClient,
    @Inject(QUEUE_TOKEN) private readonly queue: IJobQueue
  ) {}

  getTemplates(): ImportTemplate[] {
    return IMPORT_TEMPLATES;
  }

  preview(dto: ImportRowsDto): ImportPreviewResult {
    const rows = Array.isArray(dto.rows) ? dto.rows : [];
    const validRows: Record<string, unknown>[] = [];
    const errors: ImportRowError[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // baris 1 = header
      const validation = this.validateRow(dto.importType, row);
      if (validation.ok) {
        validRows.push({ ...row, _rowNumber: rowNumber });
      } else {
        for (const err of validation.errors) {
          errors.push({ rowNumber, field: err.field, message: err.message });
        }
      }
    });

    return {
      importType: dto.importType,
      totalRows: rows.length,
      validCount: validRows.length,
      errorCount: errors.length,
      validRows: validRows.slice(0, 100),
      errors: errors.slice(0, 100)
    };
  }

  async run(
    dto: ImportRowsDto,
    actorId: string,
    ip?: string,
    roles: string[] = []
  ): Promise<ImportRunResult> {
    if (dto.importType === ImportType.ASSIGNMENT) {
      throw new BadRequestException("Impor ASSIGNMENT belum didukung di fase ini.");
    }

    const all = this.validateAll(dto);
    const batch = await this.prisma.importBatch.create({
      data: {
        import_type: dto.importType,
        filename: dto.filename ?? "upload.xlsx",
        status: JobStatus.PROCESSING,
        total_rows: all.totalRows,
        imported_by: actorId,
        started_at: new Date()
      }
    });

    // Error validasi ditulis SEKALI (createMany), bukan create per baris.
    if (all.errors.length > 0) {
      await this.prisma.importError.createMany({
        data: all.errors.map((err) => ({
          import_batch_id: batch.id,
          row_number: err.rowNumber,
          field: err.field,
          message: err.message
        }))
      });
    }

    // Proses berat (loop per baris + pembuatan data) dipindah ke queue agar
    // HTTP cepat; batch tetap berstatus PROCESSING sampai processor selesai.
    const payload: ImportCommitPayload = {
      batchId: batch.id,
      importType: dto.importType,
      rows: all.valid,
      actorId,
      ip,
      actorRoles: roles,
      totalRows: all.totalRows,
      validationErrorsCount: all.errors.length
    };
    await this.queue.enqueue(JOB_NAMES.IMPORT_COMMIT, payload);

    return {
      batchId: batch.id,
      importType: dto.importType,
      totalRows: all.totalRows,
      successRows: 0,
      failedRows: all.errors.length,
      status: JobStatus.PROCESSING,
      errors: all.errors.slice(0, 100)
    };
  }

  /**
   * Commit impor (dipanggil ImportProcessor via queue) — batch per tipe:
   * pre-check duplikat via findMany `in` + createMany user/role/enrollment
   * (sebelumnya loop per baris = N+1). Error per baris TETAP dikumpulkan
   * (ImportError) — fungsionalitas tidak berubah.
   */
  async commit(payload: ImportCommitPayload): Promise<ImportRunResult> {
    const school = await this.prisma.schoolProfile.findFirst();
    const academicYearId = school?.current_academic_year_id ?? null;

    const errors: ImportRowError[] = [];

    if (payload.importType === ImportType.STUDENT) {
      await this.commitStudentRows(payload, academicYearId, errors);
    } else if (payload.importType === ImportType.TEACHER) {
      await this.commitTeacherRows(payload, errors);
    } else if (payload.importType === ImportType.CLASS) {
      await this.commitClassRows(payload, academicYearId, errors);
    }

    const successRows = payload.rows.length - errors.length;
    const failedRows = errors.length;

    // Error runtime baris ditulis SEKALI (createMany) — bukan create per baris.
    if (errors.length > 0) {
      await this.prisma.importError.createMany({
        data: errors.map((err) => ({
          import_batch_id: payload.batchId,
          row_number: err.rowNumber,
          field: err.field,
          message: err.message,
          raw_row: (payload.rows.find((r) => (r._rowNumber ?? 0) === err.rowNumber) ??
            undefined) as Prisma.InputJsonValue | undefined
        }))
      });
    }

    const totalFailed = payload.validationErrorsCount + failedRows;
    const status = totalFailed === 0 ? JobStatus.COMPLETED : JobStatus.FAILED;
    const updated = await this.prisma.importBatch.update({
      where: { id: payload.batchId },
      data: {
        status,
        success_rows: successRows,
        failed_rows: totalFailed,
        finished_at: new Date()
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: payload.actorId,
        actor_role: resolveActorRole(payload.actorRoles ?? []) ?? undefined,
        action: AuditAction.CREATE,
        entity: "import_batch",
        entity_id: payload.batchId,
        after: {
          import_type: payload.importType,
          total: payload.totalRows,
          success: successRows,
          failed: totalFailed
        } as unknown as Prisma.InputJsonValue,
        ip_address: payload.ip
      }
    });

    this.logger.log(
      `Impor batch ${payload.batchId}: ${successRows} berhasil, ${totalFailed} gagal (status ${status})`
    );

    return {
      batchId: updated.id,
      importType: payload.importType,
      totalRows: payload.totalRows,
      successRows,
      failedRows: totalFailed,
      status: updated.status,
      errors: errors.slice(0, 100)
    };
  }

  async listBatches(limit = 20): Promise<
    {
      id: string;
      importType: ImportType;
      filename: string;
      status: JobStatus;
      totalRows: number | null;
      successRows: number | null;
      failedRows: number | null;
      createdAt: Date;
    }[]
  > {
    const rows = await this.prisma.importBatch.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        import_type: true,
        filename: true,
        status: true,
        total_rows: true,
        success_rows: true,
        failed_rows: true,
        created_at: true
      }
    });
    return rows.map((r) => ({
      id: r.id,
      importType: r.import_type,
      filename: r.filename,
      status: r.status,
      totalRows: r.total_rows,
      successRows: r.success_rows,
      failedRows: r.failed_rows,
      createdAt: r.created_at
    }));
  }

  private validateAll(dto: ImportRowsDto): {
    totalRows: number;
    valid: (Record<string, unknown> & { _rowNumber: number })[];
    errors: ImportRowError[];
  } {
    const rows = Array.isArray(dto.rows) ? dto.rows : [];
    const valid: (Record<string, unknown> & { _rowNumber: number })[] = [];
    const errors: ImportRowError[] = [];
    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const validation = this.validateRow(dto.importType, row);
      if (validation.ok) {
        valid.push({ ...row, _rowNumber: rowNumber });
      } else {
        for (const err of validation.errors) {
          errors.push({ rowNumber, field: err.field, message: err.message });
        }
      }
    });
    return { totalRows: rows.length, valid, errors };
  }

  private validateRow(
    type: ImportType,
    row: Record<string, unknown>
  ): { ok: true } | { ok: false; errors: { field: string; message: string }[] } {
    const errors: { field: string; message: string }[] = [];
    const text = (key: string): string =>
      row[key] === undefined || row[key] === null ? "" : String(row[key]).trim();

    if (type === ImportType.STUDENT) {
      const nisn = text("nisn");
      if (!/^\d{10}$/.test(nisn)) {
        errors.push({ field: "nisn", message: "NISN harus 10 digit angka" });
      }
      if (!text("nama")) {
        errors.push({ field: "nama", message: "Nama wajib diisi" });
      }
      if (!text("kelas")) {
        errors.push({ field: "kelas", message: "Kelas wajib diisi" });
      }
    } else if (type === ImportType.TEACHER) {
      const nuptk = text("nuptk");
      if (nuptk && !/^\d{16}$/.test(nuptk)) {
        errors.push({ field: "nuptk", message: "NUPTK harus 16 digit angka" });
      }
      if (!text("nama")) {
        errors.push({ field: "nama", message: "Nama wajib diisi" });
      }
    } else if (type === ImportType.CLASS) {
      if (!text("nama")) {
        errors.push({ field: "nama", message: "Nama kelas wajib diisi" });
      }
      const grade = Number(row["grade_level"]);
      if (!Number.isInteger(grade) || grade < 10 || grade > 13) {
        errors.push({ field: "grade_level", message: "Tingkat kelas harus 10-13" });
      }
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  private text(row: Record<string, unknown>, key: string): string {
    return row[key] === undefined || row[key] === null ? "" : String(row[key]).trim();
  }

  /** Pecah array menjadi potongan `size` untuk createMany ter-chunk. */
  private chunks<T>(rows: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < rows.length; i += size) {
      out.push(rows.slice(i, i + size));
    }
    return out;
  }

  /**
   * Commit baris STUDENT dalam batch:
   * 1) deteksi duplikat NISN intra-file (baris pertama menang);
   * 2) pre-check duplikat terhadap DB via 1 findMany `in`;
   * 3) pre-check kelas via 1 findMany `in`;
   * 4) createMany user (id eksplisit agar bisa dipetakan tanpa fetch ulang),
   *    userRole SISWA, dan enrollment — dalam satu $transaction ter-chunk.
   */
  private async commitStudentRows(
    payload: ImportCommitPayload,
    academicYearId: string | null,
    errors: ImportRowError[]
  ): Promise<void> {
    const fail = (rowNumber: number, field: string, message: string) => {
      errors.push({ rowNumber, field, message });
    };

    // 1) duplikat intra-file: NISN pertama yang diproses menang.
    const seenNisn = new Set<string>();
    const freshRows: (Record<string, unknown> & { _rowNumber: number })[] = [];
    for (const row of payload.rows) {
      const nisn = this.text(row, "nisn");
      const rowNumber = row._rowNumber ?? 0;
      if (seenNisn.has(nisn)) {
        fail(rowNumber, "nisn", "NISN sudah terdaftar (duplikat).");
        continue;
      }
      seenNisn.add(nisn);
      freshRows.push(row);
    }
    if (freshRows.length === 0) return;

    // 2) pre-check NISN terhadap DB (1 query, bukan findUnique per baris).
    const nisns = freshRows.map((r) => this.text(r, "nisn"));
    const existingUsers = await this.prisma.user.findMany({
      where: { username: { in: nisns } },
      select: { username: true }
    });
    const existingNisn = new Set(existingUsers.map((u) => u.username));
    const dbFresh: (Record<string, unknown> & { _rowNumber: number })[] = [];
    for (const row of freshRows) {
      const nisn = this.text(row, "nisn");
      if (existingNisn.has(nisn)) {
        fail(row._rowNumber ?? 0, "nisn", "NISN sudah terdaftar (duplikat).");
        continue;
      }
      dbFresh.push(row);
    }
    if (dbFresh.length === 0) return;

    // 3) pre-check kelas (1 query) — kelas harus ada di tahun ajaran berjalan.
    const classNames = [...new Set(dbFresh.map((r) => this.text(r, "kelas")))];
    const classes = academicYearId
      ? await this.prisma.class.findMany({
          where: { name: { in: classNames }, academic_year_id: academicYearId }
        })
      : [];
    const classByName = new Map(classes.map((c) => [c.name, c.id]));
    const withClass: (Record<string, unknown> & { _rowNumber: number })[] = [];
    for (const row of dbFresh) {
      const className = this.text(row, "kelas");
      if (className && !classByName.has(className)) {
        fail(
          row._rowNumber ?? 0,
          "kelas",
          `Kelas "${className}" tidak ditemukan pada tahun ajaran berjalan.`
        );
        continue;
      }
      withClass.push(row);
    }
    if (withClass.length === 0) return;

    // 4) createMany user (id eksplisit → petakan tanpa fetch ulang) dalam
    //    SATU $transaction ter-chunk (hindari N+1 DAN batas parameter SQL
    //    untuk impor besar); skipDuplicates = resume/idempoten aman.
    const userIdByNisn = new Map<string, string>();
    const usersData: Prisma.UserCreateManyInput[] = [];
    for (const row of withClass) {
      const id = randomUUID();
      userIdByNisn.set(this.text(row, "nisn"), id);
      usersData.push({
        id,
        username: this.text(row, "nisn"),
        password_hash: await hashPassword(generateTemporaryPassword()),
        must_change_password: true,
        full_name: this.text(row, "nama")
      });
    }
    const userRoleData: Prisma.UserRoleCreateManyInput[] = withClass.map((row) => ({
      user_id: userIdByNisn.get(this.text(row, "nisn")) as string,
      role: Role.SISWA,
      status: "ACTIVE",
      invited_by: payload.actorId,
      joined_at: new Date()
    }));

    const enrollmentsData: Prisma.EnrollmentCreateManyInput[] = [];
    for (const row of withClass) {
      const className = this.text(row, "kelas");
      const classId = className ? classByName.get(className) : undefined;
      if (classId && academicYearId) {
        enrollmentsData.push({
          student_id: userIdByNisn.get(this.text(row, "nisn")) as string,
          class_id: classId,
          academic_year_id: academicYearId,
          status: "ACTIVE"
        });
      }
    }

    const studentTxCalls = [
      ...this.chunks(usersData, IMPORT_COMMIT_CHUNK_SIZE).map((chunk) =>
        this.prisma.user.createMany({ data: chunk, skipDuplicates: true })
      ),
      ...this.chunks(userRoleData, IMPORT_COMMIT_CHUNK_SIZE).map((chunk) =>
        this.prisma.userRole.createMany({ data: chunk, skipDuplicates: true })
      ),
      ...this.chunks(enrollmentsData, IMPORT_COMMIT_CHUNK_SIZE).map((chunk) =>
        this.prisma.enrollment.createMany({ data: chunk, skipDuplicates: true })
      )
    ];
    if (studentTxCalls.length > 0) {
      await this.prisma.$transaction(studentTxCalls);
    }
  }

  /**
   * Commit baris TEACHER dalam batch: duplikat NUPTK intra-file + pre-check
   * staff `in` + createMany user (id eksplisit), userRole GURU, dan staff.
   */
  private async commitTeacherRows(
    payload: ImportCommitPayload,
    errors: ImportRowError[]
  ): Promise<void> {
    const fail = (rowNumber: number, field: string, message: string) => {
      errors.push({ rowNumber, field, message });
    };

    const seenNuptk = new Set<string>();
    const freshRows: (Record<string, unknown> & { _rowNumber: number })[] = [];
    for (const row of payload.rows) {
      const nuptk = this.text(row, "nuptk");
      const rowNumber = row._rowNumber ?? 0;
      if (nuptk && seenNuptk.has(nuptk)) {
        fail(rowNumber, "nuptk", "NUPTK/NIP sudah terdaftar (duplikat).");
        continue;
      }
      if (nuptk) seenNuptk.add(nuptk);
      freshRows.push(row);
    }
    if (freshRows.length === 0) return;

    const nuptks = freshRows.map((r) => this.text(r, "nuptk")).filter(Boolean);
    const existingStaff = nuptks.length
      ? await this.prisma.staff.findMany({
          where: { nip: { in: nuptks } },
          select: { nip: true, user_id: true }
        })
      : [];
    const existingNip = new Set(existingStaff.map((s) => s.nip));
    const dbFresh: (Record<string, unknown> & { _rowNumber: number })[] = [];
    for (const row of freshRows) {
      const nuptk = this.text(row, "nuptk");
      if (nuptk && existingNip.has(nuptk)) {
        fail(row._rowNumber ?? 0, "nuptk", "NUPTK/NIP sudah terdaftar (duplikat).");
        continue;
      }
      dbFresh.push(row);
    }
    if (dbFresh.length === 0) return;

    const userIdByRow = new Map<number, string>();
    const usersData: Prisma.UserCreateManyInput[] = [];
    for (const row of dbFresh) {
      const id = randomUUID();
      userIdByRow.set(row._rowNumber ?? 0, id);
      usersData.push({
        id,
        username: this.text(row, "nuptk") || undefined,
        password_hash: await hashPassword(generateTemporaryPassword()),
        must_change_password: true,
        full_name: this.text(row, "nama")
      });
    }

    // createMany user/role/staff dalam SATU $transaction ter-chunk
    // (sebelumnya create serial + terpisah = N+1; kini atomik + aman parameter).
    const userRoleData: Prisma.UserRoleCreateManyInput[] = dbFresh.map((row) => ({
      user_id: userIdByRow.get(row._rowNumber ?? 0) as string,
      role: Role.GURU,
      status: "ACTIVE",
      invited_by: payload.actorId,
      joined_at: new Date()
    }));

    const staffData: Prisma.StaffCreateManyInput[] = dbFresh.map((row) => ({
      user_id: userIdByRow.get(row._rowNumber ?? 0) as string,
      nip: this.text(row, "nuptk") || undefined,
      position: this.text(row, "jabatan") || "GURU",
      status: "ACTIVE"
    }));

    await this.prisma.$transaction([
      ...this.chunks(usersData, IMPORT_COMMIT_CHUNK_SIZE).map((chunk) =>
        this.prisma.user.createMany({ data: chunk, skipDuplicates: true })
      ),
      ...this.chunks(userRoleData, IMPORT_COMMIT_CHUNK_SIZE).map((chunk) =>
        this.prisma.userRole.createMany({ data: chunk, skipDuplicates: true })
      ),
      ...this.chunks(staffData, IMPORT_COMMIT_CHUNK_SIZE).map((chunk) =>
        this.prisma.staff.createMany({ data: chunk, skipDuplicates: true })
      )
    ]);
  }

  /**
   * Commit baris CLASS dalam batch: duplikat nama intra-file + pre-check
   * `in` + createMany kelas.
   */
  private async commitClassRows(
    payload: ImportCommitPayload,
    academicYearId: string | null,
    errors: ImportRowError[]
  ): Promise<void> {
    const fail = (rowNumber: number, field: string, message: string) => {
      errors.push({ rowNumber, field, message });
    };

    if (!academicYearId) {
      for (const row of payload.rows) {
        fail(row._rowNumber ?? 0, "kelas", "Tahun ajaran berjalan belum diatur.");
      }
      return;
    }

    const seenName = new Set<string>();
    const freshRows: (Record<string, unknown> & { _rowNumber: number })[] = [];
    for (const row of payload.rows) {
      const name = this.text(row, "nama");
      const rowNumber = row._rowNumber ?? 0;
      if (seenName.has(name)) {
        fail(rowNumber, "nama", `Kelas "${name}" sudah ada pada tahun ajaran ini (duplikat).`);
        continue;
      }
      seenName.add(name);
      freshRows.push(row);
    }
    if (freshRows.length === 0) return;

    const names = freshRows.map((r) => this.text(r, "nama"));
    const existingClasses = await this.prisma.class.findMany({
      where: { name: { in: names }, academic_year_id: academicYearId },
      select: { name: true }
    });
    const existingNames = new Set(existingClasses.map((c) => c.name));
    const dbFresh: (Record<string, unknown> & { _rowNumber: number })[] = [];
    for (const row of freshRows) {
      const name = this.text(row, "nama");
      if (existingNames.has(name)) {
        fail(
          row._rowNumber ?? 0,
          "nama",
          `Kelas "${name}" sudah ada pada tahun ajaran ini (duplikat).`
        );
        continue;
      }
      dbFresh.push(row);
    }
    if (dbFresh.length === 0) return;

    // createMany kelas dalam $transaction ter-chunk (impor besar aman).
    const classData: Prisma.ClassCreateManyInput[] = dbFresh.map((row) => ({
      name: this.text(row, "nama"),
      grade_level: Number(row["grade_level"]),
      academic_year_id: academicYearId,
      is_active: true
    }));
    await this.prisma.$transaction(
      this.chunks(classData, IMPORT_COMMIT_CHUNK_SIZE).map((chunk) =>
        this.prisma.class.createMany({ data: chunk })
      )
    );
  }
}
