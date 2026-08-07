import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, ImportType, JobStatus, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import { ImportRowsDto } from "./dto/import.dto";
import { generateTemporaryPassword, hashPassword } from "../auth/password.util";

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
  constructor(private readonly prisma: PrismaClient) {}

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

  async run(dto: ImportRowsDto, actorId: string, ip?: string): Promise<ImportRunResult> {
    if (dto.importType === ImportType.ASSIGNMENT) {
      throw new BadRequestException("Impor ASSIGNMENT belum didukung di fase ini.");
    }

    const school = await this.prisma.schoolProfile.findFirst();
    const academicYearId = school?.current_academic_year_id ?? null;

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

    let successRows = 0;
    let failedRows = 0;
    const errors: ImportRowError[] = [];

    for (const row of all.valid) {
      const rowNumber = row._rowNumber ?? 0;
      try {
        await this.importRow(dto.importType, row, actorId, academicYearId);
        successRows += 1;
      } catch (error) {
        failedRows += 1;
        const message =
          error instanceof Error
            ? error.message
            : "Gagal menyimpan baris (duplikat atau data tidak valid).";
        errors.push({ rowNumber, field: null, message });
        await this.prisma.importError.create({
          data: {
            import_batch_id: batch.id,
            row_number: rowNumber,
            message,
            raw_row: row as Prisma.InputJsonValue
          }
        });
      }
    }

    for (const err of all.errors) {
      failedRows += 1;
      errors.push(err);
      await this.prisma.importError.create({
        data: {
          import_batch_id: batch.id,
          row_number: err.rowNumber,
          field: err.field,
          message: err.message
        }
      });
    }

    const status = failedRows === 0 ? JobStatus.COMPLETED : JobStatus.FAILED;
    const updated = await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status,
        success_rows: successRows,
        failed_rows: failedRows,
        finished_at: new Date()
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: actorId,
        action: AuditAction.CREATE,
        entity: "import_batch",
        entity_id: batch.id,
        after: {
          import_type: dto.importType,
          total: all.totalRows,
          success: successRows,
          failed: failedRows
        } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });

    return {
      batchId: updated.id,
      importType: dto.importType,
      totalRows: all.totalRows,
      successRows,
      failedRows,
      status: updated.status,
      errors: errors.slice(0, 100)
    };
  }

  async listBatches(
    limit = 20
  ): Promise<
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

  private async importRow(
    type: ImportType,
    row: Record<string, unknown>,
    actorId: string,
    academicYearId: string | null
  ): Promise<void> {
    const text = (key: string): string =>
      row[key] === undefined || row[key] === null ? "" : String(row[key]).trim();

    if (type === ImportType.STUDENT) {
      const nisn = text("nisn");
      const existing = await this.prisma.user.findUnique({ where: { username: nisn } });
      if (existing) {
        throw new Error("NISN sudah terdaftar (duplikat).");
      }
      const temporaryPassword = generateTemporaryPassword();
      const user = await this.prisma.user.create({
        data: {
          username: nisn,
          password_hash: await hashPassword(temporaryPassword),
          must_change_password: true,
          full_name: text("nama")
        }
      });
      await this.prisma.userRole.create({
        data: {
          user_id: user.id,
          role: Role.SISWA,
          status: "ACTIVE",
          invited_by: actorId,
          joined_at: new Date()
        }
      });

      const className = text("kelas");
      if (className) {
        const cls = academicYearId
          ? await this.prisma.class.findFirst({
              where: { name: className, academic_year_id: academicYearId }
            })
          : null;
        if (!cls) {
          throw new Error(`Kelas "${className}" tidak ditemukan pada tahun ajaran berjalan.`);
        }
        await this.prisma.enrollment.create({
          data: {
            student_id: user.id,
            class_id: cls.id,
            academic_year_id: academicYearId as string,
            status: "ACTIVE"
          }
        });
      }
      return;
    }

    if (type === ImportType.TEACHER) {
      const nuptk = text("nuptk");
      const byNuptk = nuptk ? await this.prisma.staff.findUnique({ where: { nip: nuptk } }) : null;
      if (byNuptk?.user_id) {
        throw new Error("NUPTK/NIP sudah terdaftar (duplikat).");
      }
      const temporaryPassword = generateTemporaryPassword();
      const user = await this.prisma.user.create({
        data: {
          username: nuptk || undefined,
          password_hash: await hashPassword(temporaryPassword),
          must_change_password: true,
          full_name: text("nama")
        }
      });
      await this.prisma.userRole.create({
        data: {
          user_id: user.id,
          role: Role.GURU,
          status: "ACTIVE",
          invited_by: actorId,
          joined_at: new Date()
        }
      });
      await this.prisma.staff.create({
        data: {
          user_id: user.id,
          nip: nuptk || undefined,
          position: text("jabatan") || "GURU",
          status: "ACTIVE"
        }
      });
      return;
    }

    if (type === ImportType.CLASS) {
      if (!academicYearId) {
        throw new NotFoundException("Tahun ajaran berjalan belum diatur.");
      }
      const name = text("nama");
      const gradeLevel = Number(row["grade_level"]);
      const existing = await this.prisma.class.findFirst({
        where: { name, academic_year_id: academicYearId }
      });
      if (existing) {
        throw new Error(`Kelas "${name}" sudah ada pada tahun ajaran ini (duplikat).`);
      }
      await this.prisma.class.create({
        data: { name, grade_level: gradeLevel, academic_year_id: academicYearId, is_active: true }
      });
      return;
    }

    throw new BadRequestException("Tipe impor tidak didukung.");
  }
}
