/**
 * Konfigurasi CORS terpusat (REST + Socket.IO) — satu sumber kebenaran (R-30).
 * - `CORS_ORIGINS` (koma-pisah) → array origin whitelist.
 * - Bila env kosong: fallback localhost dev; di production fail-fast saat boot
 *   (sama pola jwt.util — jangan memakai fallback localhost di production).
 * Dipakai main.ts (REST /api/v1) dan realtime.gateway.ts (Socket.IO /ws).
 */

/** Fallback origin dev (api 3000 / web 3000-3001) bila CORS_ORIGINS tidak diset. */
export const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
];

/**
 * Origin yang diizinkan (CORS) — dari env CORS_ORIGINS (koma-pisah);
 * default localhost saat env kosong (whitelist, bukan origin:true).
 * Di production, CORS_ORIGINS WAJIB diset — fail-fast.
 */
export function allowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || raw.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CORS_ORIGINS wajib dikonfigurasi di production (fail-fast). " +
          "Jangan memakai fallback localhost di lingkungan production."
      );
    }
    return DEFAULT_CORS_ORIGINS;
  }
  const parts = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : DEFAULT_CORS_ORIGINS;
}
