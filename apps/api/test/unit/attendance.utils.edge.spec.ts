/**
 * Unit test — attendance.utils: token format, clampInt edge, haversine
 * jarak dikenal, isWithinRadius, start/end bulan UTC.
 */
import {
  clampInt,
  endOfMonthExclusiveUTC,
  generateRawToken,
  hashToken,
  haversineDistanceMeters,
  isWithinRadiusMeters,
  startOfMonthUTC
} from "../../src/modules/attendance/attendance.utils";

describe("attendance.utils — token", () => {
  it("generateRawToken menghasilkan base64url 32 karakter", () => {
    const token = generateRawToken();
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("generateRawToken acak (dua panggilan berbeda)", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });

  it("hashToken SHA-256 hex 64 deterministik", () => {
    const h1 = hashToken("abc");
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).toBe(h1);
  });
});

describe("attendance.utils — clampInt", () => {
  it("mengembalikan nilai dalam rentang", () => {
    expect(clampInt(30, 5, 60, 10)).toBe(30);
    expect(clampInt(5, 5, 60, 10)).toBe(5);
    expect(clampInt(60, 5, 60, 10)).toBe(60);
  });

  it("meng-clamp di bawah min / di atas max", () => {
    expect(clampInt(1, 5, 60, 10)).toBe(5);
    expect(clampInt(999, 5, 60, 10)).toBe(60);
  });

  it("undefined / NaN memakai fallback", () => {
    expect(clampInt(undefined, 5, 60, 10)).toBe(10);
    expect(clampInt(Number.NaN, 5, 60, 10)).toBe(10);
  });

  it("desimal di-truncate", () => {
    expect(clampInt(30.9, 5, 60, 10)).toBe(30);
  });
});

describe("attendance.utils — haversine", () => {
  it("jarak 0 untuk koordinat sama", () => {
    expect(haversineDistanceMeters(-6.2, 106.8, -6.2, 106.8)).toBe(0);
  });

  it("jarak antar koordinat Jakarta (≈ 0.5 derajat ≈ 55.5 km)", () => {
    // -6.2,106.8 → -6.7,106.8 (sekitar 55.6 km ke selatan)
    const d = haversineDistanceMeters(-6.2, 106.8, -6.7, 106.8);
    expect(d).toBeGreaterThan(55000);
    expect(d).toBeLessThan(56000);
  });

  it("isWithinRadiusMeters benar dalam/melewati radius", () => {
    const lat = -6.2;
    const lng = 106.8;
    expect(isWithinRadiusMeters(lat, lng, lat, lng, 10)).toBe(true);
    // 0.001 derajat ≈ 111 m — radius 200 m dalam, radius 50 m luar
    expect(isWithinRadiusMeters(lat + 0.001, lng, lat, lng, 200)).toBe(true);
    expect(isWithinRadiusMeters(lat + 0.001, lng, lat, lng, 50)).toBe(false);
  });

  it("simetris (jarak A→B = B→A)", () => {
    const a = haversineDistanceMeters(-6.2, 106.8, -7.0, 110.4);
    const b = haversineDistanceMeters(-7.0, 110.4, -6.2, 106.8);
    expect(a).toBeCloseTo(b, 5);
  });
});

describe("attendance.utils — batas bulan UTC", () => {
  it("startOfMonthUTC awal bulan inklusi", () => {
    expect(startOfMonthUTC(2026, 8)).toEqual(new Date(Date.UTC(2026, 7, 1)));
    expect(startOfMonthUTC(2026, 1)).toEqual(new Date(Date.UTC(2026, 0, 1)));
  });

  it("endOfMonthExclusiveUTC bulan berikutnya", () => {
    expect(endOfMonthExclusiveUTC(2026, 8)).toEqual(new Date(Date.UTC(2026, 8, 1)));
    expect(endOfMonthExclusiveUTC(2026, 12)).toEqual(new Date(Date.UTC(2027, 0, 1)));
  });
});
