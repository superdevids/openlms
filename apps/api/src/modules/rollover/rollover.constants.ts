/** Konstanta rollover tahun ajaran (prd04 §5.R; 05 M-ROLLOVER-T1..T6). */

/** Jendela rollback setelah execute sukses (hari). */
export const ROLLBACK_WINDOW_DAYS = 7;

/** Urutan langkah eksekusi rollover. Setiap langkah transaksi terpisah. */
export const ROLLOVER_STEPS = [
  "close-source",
  "create-classes",
  "copy-curriculum",
  "graduate",
  "promote",
  "ppdb-enroll",
  "set-current"
] as const;

export type RolloverStepName = (typeof ROLLOVER_STEPS)[number];

/** Nilai ambang kelulusan UKK (SMK). */
export const COMPETENCY_PASSING_SCORE = 70;

/** Banyak hari sekolah default untuk menghitung persentase absensi. */
export const DEFAULT_EXPECTED_SCHOOL_DAYS = 200;
