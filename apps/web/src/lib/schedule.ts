/**
 * Helper jadwal pelajaran (GET /schedules).
 * API mengembalikan baris ScheduleEntry Prisma:
 * { day_of_week: 1..7, start_period, end_period, room, class:{name}, subject:{name}, teacher:{full_name} }.
 * Map ke bentuk ringan untuk UI (kalender + "jadwal hari ini" di dashboard).
 */

export interface ScheduleEntryView {
  id: string;
  day: string;
  dayOfWeek: number; // 1 = Senin .. 7 = Minggu
  periods: string; // "1–2"
  subject: string;
  className?: string;
  room?: string | null;
  teacher?: string;
}

export const SCHEDULE_DAY_NAMES: readonly string[] = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu"
];

/** day_of_week (1=Senin) → nama hari Indonesia. */
export function dayName(dayOfWeek: number): string {
  return SCHEDULE_DAY_NAMES[dayOfWeek - 1] ?? `Hari ${dayOfWeek}`;
}

/** Hari ini (lokal) dalam format day_of_week 1..7 (Senin=1 .. Minggu=7). */
export function todayDayOfWeek(): number {
  const jsDay = new Date().getDay(); // 0 = Minggu .. 6 = Sabtu
  return jsDay === 0 ? 7 : jsDay;
}

interface RawScheduleEntry {
  id: string;
  day_of_week: number;
  start_period: number;
  end_period: number;
  room?: string | null;
  class?: { id: string; name: string } | null;
  subject?: { id: string; code: string; name: string } | null;
  teacher?: { id: string; full_name: string } | null;
}

export function mapScheduleEntry(entry: RawScheduleEntry): ScheduleEntryView {
  return {
    id: entry.id,
    day: dayName(entry.day_of_week),
    dayOfWeek: entry.day_of_week,
    periods: `${entry.start_period}–${entry.end_period}`,
    subject: entry.subject?.name ?? "—",
    className: entry.class?.name,
    room: entry.room,
    teacher: entry.teacher?.full_name
  };
}
