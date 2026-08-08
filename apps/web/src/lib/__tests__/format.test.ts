import { describe, expect, it } from "vitest";
import {
  formatRupiah,
  formatNumber,
  formatPercent,
  formatDate,
  formatDuration,
  initials
} from "../format";

describe("lib/format (R-39)", () => {
  it("formatRupiah: nilai null/undefined → '-'", () => {
    expect(formatRupiah(null)).toBe("-");
    expect(formatRupiah(undefined)).toBe("-");
  });

  it("formatRupiah: angka diformat id-ID tanpa desimal", () => {
    expect(formatRupiah(1_500_000)).toContain("1.500.000");
  });

  it("formatNumber: null → '-', angka dikelompokkan", () => {
    expect(formatNumber(null)).toBe("-");
    expect(formatNumber(1234567)).toContain("1.234.567");
  });

  it("formatPercent: null → '-' dan presisi default 1", () => {
    expect(formatPercent(null)).toBe("-");
    expect(formatPercent(12.345)).toBe("12.3%");
  });

  it("formatDate: invalid/null → '-'", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("not-a-date")).toBe("-");
  });

  it("formatDuration: detik → MM:SS / HH:MM:SS", () => {
    expect(formatDuration(90)).toBe("01:30");
    expect(formatDuration(3661)).toBe("01:01:01");
    expect(formatDuration(-5)).toBe("00:00");
  });

  it("initials: nama → inisial 2 kata, null → '?'", () => {
    expect(initials("Budi Santoso")).toBe("BS");
    expect(initials(null)).toBe("?");
  });
});
