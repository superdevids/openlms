import { Injectable } from "@nestjs/common";
import type { AttendanceStatus } from "@opensis/types";
import type { AttendanceRekapSummary, DisciplineStudentSummary } from "./attendance.types";

/**
 * AttendanceRekapService — perhitungan murni rekap & kedisiplinan (M-ABSQR-T5/T6).
 * Tanpa IO sehingga mudah diuji unit.
 */
@Injectable()
export class AttendanceRekapService {
  /** Rekap status kehadiran + persentase (non-alpa = kehadiran). */
  computeRekap(statuses: readonly AttendanceStatus[]): AttendanceRekapSummary {
    const total = statuses.length;
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    let terlambat = 0;

    for (const status of statuses) {
      switch (status) {
        case "HADIR":
          hadir += 1;
          break;
        case "IZIN":
          izin += 1;
          break;
        case "SAKIT":
          sakit += 1;
          break;
        case "ALPA":
          alpa += 1;
          break;
        case "TERLAMBAT":
          terlambat += 1;
          break;
      }
    }

    const round1 = (n: number): number => Math.round(n * 10) / 10;
    const kehadiranPercent =
      total === 0 ? 0 : round1(((hadir + terlambat + izin + sakit) / total) * 100);
    const alpaPercent = total === 0 ? 0 : round1((alpa / total) * 100);

    return { total, hadir, izin, sakit, alpa, terlambat, kehadiranPercent, alpaPercent };
  }

  /**
   * Hitung jumlah ALPA per siswa. Hanya siswa dengan alpa > 0 dikembalikan;
   * `atRisk = alpaCount >= threshold` (ambang default 3/bulan, M-ABSQR-T6).
   */
  computeDiscipline(
    entries: readonly { studentId: string; status: AttendanceStatus }[],
    threshold: number
  ): DisciplineStudentSummary[] {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.status !== "ALPA") continue;
      counts.set(entry.studentId, (counts.get(entry.studentId) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([studentId, alpaCount]) => ({
      studentId,
      alpaCount,
      atRisk: alpaCount >= threshold
    }));
  }
}
