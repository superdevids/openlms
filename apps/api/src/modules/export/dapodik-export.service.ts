import { Injectable, Logger } from "@nestjs/common";
import type { DataExportLog } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { prisma } from "@opensis/database";
import { buildCsv } from "../lms/grades/export-file";

/** BOM UTF-8 agar Excel mengenali encoding CSV (kolom Indonesia aman). */
const UTF8_BOM = "\uFEFF";

/**
 * DapodikExportService — generator ekspor Dapodik (3 CSV) via job
 * report.generate (DAPODIK): peserta_didik.csv, pendidik.csv, dan
 * rombongan_belajar.csv ditulis ke `exports/dapodik_<stamp>/`, lalu
 * DataExportLog → COMPLETED (file_url comma-separated) / FAILED.
 */
@Injectable()
export class DapodikExportService {
  private readonly logger = new Logger(DapodikExportService.name);
  private readonly exportDir: string;

  constructor() {
    this.exportDir = process.env.STORAGE_EXPORT_DIR ?? join(process.cwd(), "storage", "exports");
    mkdirSync(this.exportDir, { recursive: true });
  }

  async generate(log: DataExportLog, params: Record<string, unknown>): Promise<void> {
    const academicYear =
      typeof params.academicYear === "string" && params.academicYear.length > 0
        ? params.academicYear
        : undefined;

    try {
      const school = await prisma.schoolProfile.findFirst({ select: { name: true, npsn: true } });
      const npsn = school?.npsn ?? "";

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const dirName = `dapodik_${stamp}`;
      const dir = join(this.exportDir, dirName);
      mkdirSync(dir, { recursive: true });

      const [pesertaCsv, pendidikCsv, rombelCsv] = await Promise.all([
        this.buildPesertaDidik(npsn, academicYear),
        this.buildPendidik(npsn),
        this.buildRombonganBelajar(npsn, academicYear)
      ]);

      const files = ["peserta_didik.csv", "pendidik.csv", "rombongan_belajar.csv"];
      const contents = [pesertaCsv, pendidikCsv, rombelCsv];
      let recordCount = 0;
      files.forEach((file, i) => {
        const content = contents[i] ?? "";
        writeFileSync(join(dir, file), content, "utf8");
        recordCount += content.split(/\r?\n/).filter((line) => line.trim().length > 0).length - 1;
      });

      const urls = files.map((f) => `exports/${dirName}/${f}`);
      await prisma.dataExportLog.update({
        where: { id: log.id },
        data: {
          status: "COMPLETED",
          file_url: urls.join(","),
          record_count: recordCount,
          finished_at: new Date()
        }
      });
      this.logger.log(`DapodikExport ${log.id}: selesai (${recordCount} baris, ${dirName})`);
    } catch (err) {
      this.logger.error(
        `DapodikExport ${log.id} gagal: ${err instanceof Error ? err.message : String(err)}`
      );
      await prisma.dataExportLog.update({
        where: { id: log.id },
        data: { status: "FAILED", finished_at: new Date() }
      });
      throw err;
    }
  }

  /** peserta_didik.csv — NISN (nullable via PpdbApplicant), Nama, NIS/username,
   *  JK/TTL (PpdbApplicant), Rombel, Tahun Ajaran, Status, NPSN. */
  private async buildPesertaDidik(npsn: string, academicYear?: string): Promise<string> {
    const roles = await prisma.userRole.findMany({
      where: { role: "SISWA", status: "ACTIVE" },
      select: { user_id: true }
    });
    const studentIds = roles.map((r) => r.user_id);
    if (studentIds.length === 0) {
      return UTF8_BOM + buildCsv([], DAPODIK_PESERTA_HEADER);
    }

    const [students, enrollments, applicants] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, full_name: true, username: true }
      }),
      prisma.enrollment.findMany({
        where: {
          student_id: { in: studentIds },
          status: "ACTIVE",
          ...(academicYear ? { academic_year: { code: academicYear } } : {})
        },
        select: {
          student_id: true,
          class: { select: { name: true } },
          academic_year: { select: { code: true } }
        }
      }),
      prisma.ppdbApplicant.findMany({
        where: { user_id: { in: studentIds } },
        select: { user_id: true, nisn: true, gender: true, birth_place: true, birth_date: true }
      })
    ]);

    const enrollmentByStudent = new Map(enrollments.map((e) => [e.student_id, e]));
    const applicantByUser = new Map(applicants.map((a) => [a.user_id, a]));

    const rows = students
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .map((s) => {
        const enroll = enrollmentByStudent.get(s.id);
        const app = applicantByUser.get(s.id);
        const jkTtl = app
          ? `${app.gender} / ${app.birth_place}, ${app.birth_date.toISOString().slice(0, 10)}`
          : "";
        return [
          app?.nisn ?? "",
          s.full_name,
          s.username ?? "",
          jkTtl,
          enroll?.class.name ?? "",
          enroll?.academic_year.code ?? "",
          enroll ? "AKTIF" : "TIDAK TERDAFTAR",
          npsn
        ];
      });

    return UTF8_BOM + buildCsv(rows, DAPODIK_PESERTA_HEADER);
  }

  /** pendidik.csv — NIP Staff.nip, Nama, Jabatan, Status, NUPTK (kosong + catatan), NPSN. */
  private async buildPendidik(npsn: string): Promise<string> {
    const staffRows = await prisma.staff.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { full_name: true } } },
      orderBy: [{ position: "asc" }, { nip: "asc" }]
    });

    const rows = staffRows.map((st) => [
      st.nip ?? "",
      st.user?.full_name ?? "",
      st.position,
      st.status,
      "", // NUPTK belum tersedia
      "NUPTK belum tersedia di sistem",
      npsn
    ]);

    return UTF8_BOM + buildCsv(rows, DAPODIK_PENDIDIK_HEADER);
  }

  /** rombongan_belajar.csv — Class.name, grade_level, tahun, homeroom_teacher,
   *  Prodi.name, jumlah Enrollment ACTIVE, NPSN. */
  private async buildRombonganBelajar(npsn: string, academicYear?: string): Promise<string> {
    const classes = await prisma.class.findMany({
      where: {
        is_active: true,
        ...(academicYear ? { academic_year: { code: academicYear } } : {})
      },
      include: {
        academic_year: { select: { code: true } },
        homeroom_teacher: { select: { full_name: true } },
        prodi: { select: { name: true } },
        enrollments: { where: { status: "ACTIVE" }, select: { id: true } }
      },
      orderBy: [{ grade_level: "asc" }, { name: "asc" }]
    });

    const rows = classes.map((c) => [
      c.name,
      String(c.grade_level),
      c.academic_year.code,
      c.homeroom_teacher?.full_name ?? "",
      c.prodi?.name ?? "",
      String(c.enrollments.length),
      npsn
    ]);

    return UTF8_BOM + buildCsv(rows, DAPODIK_ROMBEL_HEADER);
  }
}

const DAPODIK_PESERTA_HEADER = [
  "NISN",
  "Nama",
  "NIS/Username",
  "JK/TTL",
  "Rombel",
  "Tahun Ajaran",
  "Status",
  "NPSN"
];

const DAPODIK_PENDIDIK_HEADER = ["NIP", "Nama", "Jabatan", "Status", "NUPTK", "Catatan", "NPSN"];

const DAPODIK_ROMBEL_HEADER = [
  "Nama Kelas",
  "Tingkat",
  "Tahun Ajaran",
  "Wali Kelas",
  "Kompetensi Keahlian",
  "Jumlah Siswa",
  "NPSN"
];
