/**
 * Unit test — Payroll calculator edge: tax TER (bracket/ceiling), BPJS
 * (ceiling null, negatif, bundle), honorarium, PNS final.
 */
import { Decimal } from "@prisma/client/runtime/library";
import {
  computePph21Honorarium,
  computePph21PnsFinal,
  computePph21TerDaily,
  computePph21TerMonthly
} from "../../src/modules/payroll/calculator/tax";
import {
  computeBpjsBundle,
  computeBpjsContribution
} from "../../src/modules/payroll/calculator/bpjs";

const MONTHLY_BRACKETS = [
  { minGross: new Decimal("0"), maxGross: new Decimal("5000000"), ratePercent: new Decimal("2") },
  { minGross: new Decimal("5000000"), maxGross: null, ratePercent: new Decimal("5") }
];

const DAILY_BRACKETS = [
  { minDaily: new Decimal("0"), maxDaily: new Decimal("450000"), ratePercent: new Decimal("0") },
  {
    minDaily: new Decimal("450000"),
    maxDaily: new Decimal("2500000"),
    ratePercent: new Decimal("0.5")
  },
  { minDaily: new Decimal("2500000"), maxDaily: null, ratePercent: new Decimal("1") }
];

describe("tax — PPh21 TER bulanan", () => {
  it("gross 0/negatif → 0", () => {
    expect(computePph21TerMonthly({ gross: "0", brackets: MONTHLY_BRACKETS }).toString()).toBe("0");
    expect(computePph21TerMonthly({ gross: "-5000", brackets: MONTHLY_BRACKETS }).toString()).toBe(
      "0"
    );
  });

  it("bracket pertama (2%)", () => {
    expect(
      computePph21TerMonthly({ gross: "4000000", brackets: MONTHLY_BRACKETS }).toString()
    ).toBe("80000");
  });

  it("bracket kedua (5%) di atas ceiling", () => {
    expect(
      computePph21TerMonthly({ gross: "6000000", brackets: MONTHLY_BRACKETS }).toString()
    ).toBe("300000");
  });

  it("gross tepat di batas max bracket pertama (lt strict) → masuk bracket kedua", () => {
    expect(
      computePph21TerMonthly({ gross: "5000000", brackets: MONTHLY_BRACKETS }).toString()
    ).toBe("250000");
  });

  it("tanpa bracket cocok → rate 0", () => {
    expect(computePph21TerMonthly({ gross: "100", brackets: [] }).toString()).toBe("0");
  });
});

describe("tax — PPh21 TER harian", () => {
  it("<= 450.000 → 0 (bracket tarif 0)", () => {
    expect(
      computePph21TerDaily({
        dailyGross: "450000",
        brackets: [
          {
            minDaily: new Decimal("0"),
            maxDaily: new Decimal("450001"),
            ratePercent: new Decimal("0")
          },
          { minDaily: new Decimal("450001"), maxDaily: null, ratePercent: new Decimal("0.5") }
        ],
        pasal17RatePercent: "5"
      }).toString()
    ).toBe("0");
  });

  it("450.000 < x <= 2.500.000 → 0,5%", () => {
    expect(
      computePph21TerDaily({
        dailyGross: "1000000",
        brackets: DAILY_BRACKETS,
        pasal17RatePercent: "5"
      }).toString()
    ).toBe("5000");
  });

  it("di atas 2.500.000 → DPP 50% × Pasal 17", () => {
    // 3.000.000 * 0.5 * 5% = 75.000
    expect(
      computePph21TerDaily({
        dailyGross: "3000000",
        brackets: DAILY_BRACKETS,
        pasal17RatePercent: "5"
      }).toString()
    ).toBe("75000");
  });

  it("gross 0 → 0", () => {
    expect(
      computePph21TerDaily({
        dailyGross: "0",
        brackets: DAILY_BRACKETS,
        pasal17RatePercent: "5"
      }).toString()
    ).toBe("0");
  });
});

describe("tax — honorarium & PNS", () => {
  it("honorarium: DPP 50% × Pasal 17 (5%)", () => {
    expect(
      computePph21Honorarium({
        gross: "2000000",
        dppPercent: "50",
        pasal17RatePercent: "5"
      }).toString()
    ).toBe("50000");
  });

  it("honorarium dpp 100%", () => {
    expect(
      computePph21Honorarium({
        gross: "2000000",
        dppPercent: "100",
        pasal17RatePercent: "15"
      }).toString()
    ).toBe("300000");
  });

  it("honorarium gross 0 → 0", () => {
    expect(
      computePph21Honorarium({ gross: "0", dppPercent: "50", pasal17RatePercent: "5" }).toString()
    ).toBe("0");
  });

  it("PNS final 15%", () => {
    expect(computePph21PnsFinal("10000000", "15").toString()).toBe("1500000");
    expect(computePph21PnsFinal("0", "15").toString()).toBe("0");
  });
});

describe("bpjs — kontribusi", () => {
  it("base 0 → 0", () => {
    expect(
      computeBpjsContribution({
        base: "0",
        config: { employeeSharePercent: "1", ceiling: null }
      }).toString()
    ).toBe("0");
  });

  it("di bawah ceiling → base × rate", () => {
    expect(
      computeBpjsContribution({
        base: "1000000",
        config: { employeeSharePercent: "1", ceiling: "5000000" }
      }).toString()
    ).toBe("10000");
  });

  it("di atas ceiling → ceiling × rate", () => {
    expect(
      computeBpjsContribution({
        base: "10000000",
        config: { employeeSharePercent: "1", ceiling: "5000000" }
      }).toString()
    ).toBe("50000");
  });

  it("ceiling null → tanpa cap", () => {
    expect(
      computeBpjsContribution({
        base: "10000000",
        config: { employeeSharePercent: "1", ceiling: null }
      }).toString()
    ).toBe("100000");
  });

  it("ceiling 0/negatif diperlakukan sebagai tanpa cap", () => {
    expect(
      computeBpjsContribution({
        base: "10000000",
        config: { employeeSharePercent: "1", ceiling: "0" }
      }).toString()
    ).toBe("100000");
    expect(
      computeBpjsContribution({
        base: "10000000",
        config: { employeeSharePercent: "1", ceiling: "-1" }
      }).toString()
    ).toBe("100000");
  });

  it("bundle: kesehatan (1%) + jht (2%) + jp (1%)", () => {
    const bundle = computeBpjsBundle("5000000", {
      kesehatan: { employeeSharePercent: "1", ceiling: "5000000" },
      jht: { employeeSharePercent: "2", ceiling: "5000000" },
      jp: { employeeSharePercent: "1", ceiling: "5000000" }
    });
    expect(bundle.kesehatan.toString()).toBe("50000");
    expect(bundle.jht.toString()).toBe("100000");
    expect(bundle.jp.toString()).toBe("50000");
    expect(bundle.total.toString()).toBe("200000");
  });

  it("bundle dengan ceiling berbeda (jp lebih rendah)", () => {
    const bundle = computeBpjsBundle("10000000", {
      kesehatan: { employeeSharePercent: "1", ceiling: "5000000" },
      jht: { employeeSharePercent: "2", ceiling: "10000000" },
      jp: { employeeSharePercent: "1", ceiling: "3000000" }
    });
    expect(bundle.kesehatan.toString()).toBe("50000");
    expect(bundle.jht.toString()).toBe("200000");
    expect(bundle.jp.toString()).toBe("30000");
  });
});
