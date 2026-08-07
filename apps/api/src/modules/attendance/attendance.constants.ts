/**
 * Attendance — konstanta domain absensi (prd04 §5.A.7; tek-05 M-ABSQR-T1..T9).
 * Sumber nilai: 03-database-erd §3.6/3.7, prd04 §5.A.7 (QR token 5-10 menit, default 7).
 */

/** TTL default token QR sekali pakai (menit). */
export const QR_TOKEN_TTL_MIN_DEFAULT = 7;
/** Batas bawah TTL (prd04 §5.A.7: 5-10 menit). */
export const QR_TOKEN_TTL_MIN_MIN = 5;
/** Batas atas TTL (prd04 §5.A.7: 5-10 menit). */
export const QR_TOKEN_TTL_MIN_MAX = 10;

/** Durasi sesi default jika ends_at tidak diberikan (menit). */
export const SESSION_DEFAULT_DURATION_MIN = 50;

/** Radius geofencing default (meter) — sinyal native tanpa map API. */
export const GEOFENCE_RADIUS_M_DEFAULT = 100;

/** Ambang alpa default untuk dashboard kedisiplinan (prd04 §5.A.7: default 3/bulan). */
export const DISCIPLINE_ALPA_THRESHOLD_DEFAULT = 3;

/** Header Idempotency-Key (queue offline, M-ABSQR-T8). */
export const IDEMPOTENCY_HEADER = "idempotency-key";

/** Metode yang valid untuk AttendanceSession (RFID butuh hardware — DITUNDA). */
export const ALLOWED_SESSION_METHODS = ["QR_CODE", "GEOFENCING", "MANUAL"] as const;

/** Tipe pengajuan izin/sakit online (M-ABSQR-T7). */
export const PERMIT_TYPES = ["IZIN", "SAKIT"] as const;
