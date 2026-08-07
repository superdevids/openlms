/**
 * Konstanta modul Maintenance (global dev/maintenance mode).
 * Baris status tunggal (single-school) di tabel system_status.
 */

/** ID baris status sistem tunggal (di-seed dengan maintenance OFF). */
export const SYSTEM_STATUS_ID = "system_status_default";

/** TTL cache in-memory status (ms) — middleware TIDAK menyentuh DB per request. */
export const MAINTENANCE_CACHE_TTL_MS = 5_000;

/** Pesan maintenance default (Bahasa Indonesia, formal). */
export const DEFAULT_MAINTENANCE_MESSAGE =
  "Sistem sedang dalam pemeliharaan. Silakan coba lagi dalam beberapa saat.";

/** Retry-After default (detik) bila ETA tidak bisa diparse sebagai tanggal. */
export const MAINTENANCE_RETRY_AFTER_DEFAULT_SEC = 300;
