/**
 * Attendance — fungsi murni (tanpa IO) agar mudah diuji.
 * Token QR: raw token dikirim ke client; hanya SHA-256 hash yang disimpan di DB
 * (prd04 §5.A.7: "Token stateless, hash di DB"; 03-database-erd §3.7).
 */
import { createHash, randomBytes } from "node:crypto";

/** Buat raw token acak (base64url 32 char) untuk payload QR. */
export function generateRawToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Hash SHA-256 raw token — nilai yang disimpan di kolom token (@unique). */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Clamp integer; nilai NaN/undefined memakai fallback.
 * Dipakai untuk TTL token dan radius geofencing dari env.
 */
export function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  const n = value === undefined || Number.isNaN(value) ? fallback : Math.trunc(value);
  return Math.min(max, Math.max(min, n));
}

/** Jarak haversine dua koordinat (meter). */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // radius bumi (m)
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** True jika koordinat berada dalam radius (meter) dari pusat. */
export function isWithinRadiusMeters(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusM: number
): boolean {
  return haversineDistanceMeters(lat, lng, centerLat, centerLng) <= radiusM;
}

/** Awal bulan dalam UTC (inklusi) untuk rekap/kedisiplinan. */
export function startOfMonthUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Akhir bulan dalam UTC (eksklusi) untuk query date { gte, lt }. */
export function endOfMonthExclusiveUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}
