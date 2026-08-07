/**
 * Konstanta keamanan auth (F0-T8).
 * Cookie httpOnly+Secure+SameSite=Lax — docs/02 §6.2, prd04 §5.P.
 * Dipakai AuthModule saat Fase 1 (F1-T1).
 */

export const ACCESS_COOKIE_NAME = "openlms_access";
export const REFRESH_COOKIE_NAME = "openlms_refresh";

export const JWT_ACCESS_TTL_MINUTES = Number(process.env.JWT_ACCESS_TTL_MINUTES ?? 30);
export const JWT_REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);

/** Durasi cookie (milidetik) mengikuti TTL JWT. */
export const ACCESS_COOKIE_MAX_AGE_MS = JWT_ACCESS_TTL_MINUTES * 60_000;
export const REFRESH_COOKIE_MAX_AGE_MS = JWT_REFRESH_TTL_DAYS * 24 * 60 * 60_000;

/** Opsi cookie access — Express maxAge dalam milidetik (30 mnt). */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ACCESS_COOKIE_MAX_AGE_MS
};

/** Ambang lockout brute-force (prd04 §5.P): 5 gagal -> lock 15 menit */
export const LOGIN_FAIL_LIMIT = 5;
export const LOGIN_LOCK_MINUTES = 15;
