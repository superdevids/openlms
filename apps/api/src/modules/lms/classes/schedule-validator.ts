/**
 * Validator bentrok jadwal (F2-T3) — murni, tanpa I/O agar mudah diuji unit.
 * Aturan (docs/03 §2.7): dalam satu hari, guru tidak boleh mengajar dua slot
 * yang periodenya tumpang tindih; ruang tidak boleh dipakai dua kelas dalam
 * slot yang tumpang tindih; satu kelas tidak boleh punya dua mapel di slot
 * yang tumpang tindih.
 */

export interface PeriodRange {
  start: number;
  end: number;
}

/** Dua interval [start,end) saling tumpang tindih. */
export function periodsOverlap(a: PeriodRange, b: PeriodRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export interface ScheduleSlot {
  id?: string;
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  teacherId: string;
  room: string | null;
  classId: string;
}

export type ScheduleConflictType = "TEACHER" | "ROOM" | "CLASS";

export interface ScheduleConflict {
  type: ScheduleConflictType;
  refId: string;
  conflictId: string;
}

/** Cari seluruh bentrok antara kandidat slot dengan kumpulan slot yang sudah ada. */
export function findConflicts(
  entries: ScheduleSlot[],
  candidate: ScheduleSlot
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (const e of entries) {
    if (e.id !== undefined && candidate.id !== undefined && e.id === candidate.id) continue;
    if (e.dayOfWeek !== candidate.dayOfWeek) continue;
    if (
      !periodsOverlap(
        { start: e.startPeriod, end: e.endPeriod },
        { start: candidate.startPeriod, end: candidate.endPeriod }
      )
    )
      continue;

    if (e.teacherId === candidate.teacherId) {
      conflicts.push({ type: "TEACHER", refId: e.teacherId, conflictId: e.id ?? "" });
    }
    if (candidate.room && e.room === candidate.room) {
      conflicts.push({ type: "ROOM", refId: e.room, conflictId: e.id ?? "" });
    }
    if (e.classId === candidate.classId) {
      conflicts.push({ type: "CLASS", refId: e.classId, conflictId: e.id ?? "" });
    }
  }
  return conflicts;
}
