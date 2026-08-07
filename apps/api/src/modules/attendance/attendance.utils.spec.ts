import {
  clampInt,
  generateRawToken,
  hashToken,
  haversineDistanceMeters,
  isWithinRadiusMeters,
  startOfMonthUTC,
  endOfMonthExclusiveUTC
} from "./attendance.utils";

describe("attendance.utils — fungsi murni token & geofence", () => {
  describe("token", () => {
    it("hashToken deterministik dan berbeda antar input", () => {
      const h1 = hashToken("abc");
      const h2 = hashToken("abc");
      const h3 = hashToken("abd");
      expect(h1).toBe(h2);
      expect(h1).not.toBe(h3);
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generateRawToken menghasilkan string acak unik", () => {
      const a = generateRawToken();
      const b = generateRawToken();
      expect(a).not.toBe(b);
      expect(a).toHaveLength(32); // base64url dari 24 byte
    });
  });

  describe("clampInt", () => {
    it("clamp TTL ke rentang 5-10 menit", () => {
      expect(clampInt(2, 5, 10, 7)).toBe(5);
      expect(clampInt(12, 5, 10, 7)).toBe(10);
      expect(clampInt(7, 5, 10, 7)).toBe(7);
      expect(clampInt(undefined, 5, 10, 7)).toBe(7);
      expect(clampInt(Number.NaN, 5, 10, 7)).toBe(7);
    });
  });

  describe("haversine / geofence", () => {
    it("jarak 0.01 derajat di khatulistiwa ~ 1112 meter", () => {
      const distance = haversineDistanceMeters(0, 0, 0, 0.01);
      expect(distance).toBeGreaterThan(1110);
      expect(distance).toBeLessThan(1115);
    });

    it("isWithinRadiusMeters: di dalam -> true, di luar -> false", () => {
      const centerLat = -6.2;
      const centerLng = 106.8;
      // ~110 m di utara pusat
      expect(isWithinRadiusMeters(centerLat + 0.001, centerLng, centerLat, centerLng, 200)).toBe(
        true
      );
      // ~1112 m -> di luar radius 100 m
      expect(isWithinRadiusMeters(centerLat, centerLng + 0.01, centerLat, centerLng, 100)).toBe(
        false
      );
    });
  });

  describe("batas bulan", () => {
    it("startOfMonthUTC & endOfMonthExclusiveUTC membentuk rentang bulan", () => {
      const start = startOfMonthUTC(2026, 8);
      const end = endOfMonthExclusiveUTC(2026, 8);
      expect(start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
      expect(end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    });
  });
});
