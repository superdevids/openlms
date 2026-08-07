import { computeLateFee, chargeableDays } from "./late-fee";

describe("late-fee (denda keterlambatan — prd04 §5.F.3)", () => {
  it("masih dalam grace period -> denda 0", () => {
    const result = computeLateFee(
      { graceDays: 7, feeType: "NOMINAL", value: "50000", maxAmount: null },
      "1000000",
      3
    );
    expect(result.amount.toString()).toBe("0");
    expect(result.chargeableDays).toBe(0);
  });

  it("denda NOMINAL tetap setelah lewat grace period", () => {
    const result = computeLateFee(
      { graceDays: 7, feeType: "NOMINAL", value: "50000", maxAmount: null },
      "1000000",
      10
    );
    expect(result.amount.toString()).toBe("50000");
    expect(result.chargeableDays).toBe(3);
  });

  it("denda PERSEN_PER_HARI: outstanding x rate x hari lewat grace", () => {
    // 0,5% per hari x Rp1.000.000 x 3 hari = Rp15.000
    const result = computeLateFee(
      { graceDays: 7, feeType: "PERSEN_PER_HARI", value: "0.5", maxAmount: null },
      "1000000",
      10
    );
    expect(result.amount.toString()).toBe("15000");
  });

  it("denda maksimum (cap) membatasi nominal", () => {
    const result = computeLateFee(
      { graceDays: 0, feeType: "PERSEN_PER_HARI", value: "1", maxAmount: "100000" },
      "10000000",
      20
    );
    expect(result.amount.toString()).toBe("100000"); // 2.000.000 tanpa cap
    expect(result.capped).toBe(true);
  });

  it("daysLate <= 0 -> 0 denda; tidak pernah negatif", () => {
    expect(
      computeLateFee(
        { graceDays: 0, feeType: "NOMINAL", value: "50000", maxAmount: null },
        "1000000",
        0
      ).amount.toString()
    ).toBe("0");
  });

  it("chargeableDays menghitung hanya hari setelah grace", () => {
    expect(chargeableDays(10, 7)).toBe(3);
    expect(chargeableDays(5, 7)).toBe(0);
    expect(chargeableDays(0, 0)).toBe(0);
  });
});
