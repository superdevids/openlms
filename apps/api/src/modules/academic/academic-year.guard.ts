/**
 * Guard tahun ajaran (arsip).
 *
 * Semua tulis ke entitas yang terikat academic_year WAJIB melewati guard ini:
 * tahun berstatus CLOSED adalah arsip -> tulis ditolak 403 ARCHIVED_YEAR.
 *
 * Catatan: AllExceptionsFilter global (common/filters) masih memetakan 403 ke
 * kode FORBIDDEN. Sampai filter diubah (di luar scope tugas ini), HTTP body
 * akan berisi FORBIDDEN; kontrak layanan tetap menegaskan ARCHIVED_YEAR pada
 * exception.getResponse() (lihat test/academic-year.guard.spec.ts).
 */
import { ForbiddenException } from "@nestjs/common";
import type { AcademicYearStatus } from "@opensis/types";
import type { DatabaseClient } from "../database/database.constants";

export const ARCHIVED_YEAR_CODE = "ARCHIVED_YEAR";

export class ArchivedYearException extends ForbiddenException {
  constructor(yearCode: string) {
    super({
      error: {
        code: ARCHIVED_YEAR_CODE,
        message: `Tahun ajaran ${yearCode} sudah diarsipkan (CLOSED); data tidak dapat diubah`
      }
    });
  }
}

export class AcademicYearGuard {
  constructor(private readonly db: DatabaseClient) {}

  /** Tolak tulis bila tahun berstatus CLOSED. */
  async assertWritable(yearId: string): Promise<void> {
    const year = await this.db.academicYear.findUnique({ where: { id: yearId } });
    if (!year) {
      throw new ForbiddenException({
        error: { code: "NOT_FOUND", message: "Tahun ajaran tidak ditemukan" }
      });
    }
    this.assertStatusWritable(year.status, year.code);
  }

  /** Versi murni tanpa DB — dipakai untuk unit test langsung. */
  assertStatusWritable(status: AcademicYearStatus, yearCode: string): void {
    if (status === "CLOSED") {
      throw new ArchivedYearException(yearCode);
    }
  }
}
