import { isTimeOverlap } from "./asset-booking.service";

describe("asset-booking — cek bentrok jadwal (prd04 §5.G.3)", () => {
  const aStart = new Date("2026-08-10T08:00:00Z");
  const aEnd = new Date("2026-08-10T10:00:00Z");

  it("jadwal identik -> bentrok", () => {
    expect(isTimeOverlap(aStart, aEnd, aStart, aEnd)).toBe(true);
  });

  it("tumpang tindih sebagian (B mulai di tengah A) -> bentrok", () => {
    const bStart = new Date("2026-08-10T09:00:00Z");
    const bEnd = new Date("2026-08-10T11:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("B tepat setelah A selesai (bersinggungan) -> TIDAK bentrok", () => {
    const bStart = new Date("2026-08-10T10:00:00Z");
    const bEnd = new Date("2026-08-10T12:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  it("B sebelum A -> TIDAK bentrok", () => {
    const bStart = new Date("2026-08-10T06:00:00Z");
    const bEnd = new Date("2026-08-10T08:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  it("A berada di dalam rentang B -> bentrok", () => {
    const bStart = new Date("2026-08-10T07:00:00Z");
    const bEnd = new Date("2026-08-10T11:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("tanggal berbeda -> TIDAK bentrok", () => {
    const bStart = new Date("2026-08-11T08:00:00Z");
    const bEnd = new Date("2026-08-11T10:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });
});
