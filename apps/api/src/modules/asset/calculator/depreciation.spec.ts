import { calculateDepreciation, monthsSince } from "./depreciation";

describe("depreciation — garis lurus dihitung saat laporan (prd04 §5.G.2)", () => {
  it("nilai buku = harga - (harga/masa_manfaat x bulan)", () => {
    // harga 12jt, 48 bulan, 12 bulan berjalan -> akumulasi 3jt -> buku 9jt
    const result = calculateDepreciation({
      cost: "12000000",
      usefulLifeMonths: 48,
      monthsElapsed: 12
    });
    expect(result.monthlyDepreciation.toString()).toBe("250000");
    expect(result.accumulatedDepreciation.toString()).toBe("3000000");
    expect(result.bookValue.toString()).toBe("9000000");
    expect(result.fullyDepreciated).toBe(false);
  });

  it("aset habis disusutkan -> nilai buku = 0 (residu default 0)", () => {
    const result = calculateDepreciation({
      cost: "12000000",
      usefulLifeMonths: 48,
      monthsElapsed: 60 // melebihi umur
    });
    expect(result.bookValue.toString()).toBe("0");
    expect(result.fullyDepreciated).toBe(true);
  });

  it("nilai sisa (residu) dibatasi: buku tidak pernah di bawah residu", () => {
    const result = calculateDepreciation({
      cost: "12000000",
      usefulLifeMonths: 48,
      monthsElapsed: 60,
      residualValue: "1000000"
    });
    expect(result.bookValue.toString()).toBe("1000000");
    expect(result.fullyDepreciated).toBe(true);
  });

  it("bulan 0 -> akumulasi 0, nilai buku = harga", () => {
    const result = calculateDepreciation({
      cost: "5000000",
      usefulLifeMonths: 36,
      monthsElapsed: 0
    });
    expect(result.accumulatedDepreciation.toString()).toBe("0");
    expect(result.bookValue.toString()).toBe("5000000");
  });

  it("penyusutan per bulan dibulatkan HALF_UP 2 desimal", () => {
    const result = calculateDepreciation({
      cost: "10000000",
      usefulLifeMonths: 3, // 3.333.333,33/bulan
      monthsElapsed: 1
    });
    expect(result.monthlyDepreciation.toString()).toBe("3333333.33");
  });

  it("monthsSince menghitung bulan sejak tanggal perolehan", () => {
    expect(monthsSince(new Date("2024-01-15"), new Date("2026-03-10"))).toBe(26);
    expect(monthsSince(new Date("2025-12-01"), new Date("2025-06-01"))).toBe(0); // belum berlalu
  });
});
