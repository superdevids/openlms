import { Decimal } from "@prisma/client/runtime/library";
import {
  computePph21TerMonthly,
  computePph21TerDaily,
  computePph21Honorarium,
  computePph21PnsFinal
} from "./tax";
import { createDefaultPayrollPeriodConfig } from "./config-defaults";

const cfg = createDefaultPayrollPeriodConfig("2026-01");

describe("tax — PPh 21 skema TER (prd04 §5.E.3, nilai dari konfigurasi)", () => {
  it("penghasilan di bawah bracket pertama -> PPh 0", () => {
    // gross 5jt <= 5,4jt -> tarif 0%
    const tax = computePph21TerMonthly({
      gross: "5000000",
      brackets: cfg.terMonthly.A
    });
    expect(tax.toString()).toBe("0");
  });

  it("bracket 0,5% (5,65jt < gross <= 5,95jt) -> gross x 0,5%", () => {
    const gross = new Decimal("5800000");
    const tax = computePph21TerMonthly({
      gross,
      brackets: cfg.terMonthly.A
    });
    // 5.800.000 x 0,5% = 29.000
    expect(tax.toString()).toBe("29000");
  });

  it("bracket 1,25% (6,75jt < gross <= 7,5jt)", () => {
    const tax = computePph21TerMonthly({
      gross: "7000000",
      brackets: cfg.terMonthly.A
    });
    // 7.000.000 x 1,25% = 87.500
    expect(tax.toString()).toBe("87500");
  });

  it("TER harian: <= Rp450.000 -> 0; > 450.000 <= 2,5jt -> 0,5%", () => {
    const low = computePph21TerDaily({
      dailyGross: "400000",
      brackets: cfg.terDaily,
      pasal17RatePercent: cfg.pasal17RatePercent
    });
    expect(low.toString()).toBe("0");

    const mid = computePph21TerDaily({
      dailyGross: "1000000",
      brackets: cfg.terDaily,
      pasal17RatePercent: cfg.pasal17RatePercent
    });
    expect(mid.toString()).toBe("5000"); // 1jt x 0,5%
  });

  it("TER harian di atas bracket tertinggi -> DPP 50% x Pasal 17", () => {
    const high = computePph21TerDaily({
      dailyGross: "10000000",
      brackets: cfg.terDaily,
      pasal17RatePercent: "5"
    });
    // 10jt x 50% x 5% = 250.000
    expect(high.toString()).toBe("250000");
  });

  it("honorarium bukan pegawai: DPP 50% x tarif Pasal 17", () => {
    const tax = computePph21Honorarium({
      gross: "2000000",
      dppPercent: cfg.honorDppPercent,
      pasal17RatePercent: "5"
    });
    // 2jt x 50% x 5% = 50.000
    expect(tax.toString()).toBe("50000");
  });

  it("PNS final 15%", () => {
    expect(computePph21PnsFinal("10000000", cfg.pnsFinalRatePercent).toString()).toBe("1500000");
  });

  it("gross <= 0 -> 0", () => {
    expect(computePph21TerMonthly({ gross: "0", brackets: cfg.terMonthly.A }).toString()).toBe("0");
  });
});
