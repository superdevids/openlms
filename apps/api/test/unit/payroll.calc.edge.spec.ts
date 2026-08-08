/**
 * Payroll calculator — edge cases (prd04 §5.E.2/§5.E.3).
 * Melengkapi tax.spec/bpjs.spec/payroll-calc.spec: batas bracket,
 * pembulatan, ceiling, net negatif, prorate/komponen variabel.
 */
import { Decimal } from "@prisma/client/runtime/library";
import {
  computePph21TerMonthly,
  computePph21TerDaily,
  computePph21Honorarium
} from "../../src/modules/payroll/calculator/tax";
import {
  computeBpjsContribution,
  computeBpjsBundle
} from "../../src/modules/payroll/calculator/bpjs";
import { money, isPositive, clampToZero, ZERO } from "../../src/modules/payroll/calculator/money";
import {
  computePayroll,
  buildVariableComponents,
  ComponentInput
} from "../../src/modules/payroll/calculator/payroll-calc";
import { createDefaultPayrollPeriodConfig } from "../../src/modules/payroll/calculator/config-defaults";

const cfg = createDefaultPayrollPeriodConfig("2026-01");
const bracketsA = cfg.terMonthly.A;

function comp(code: string, amount: Moneyish, extra: Partial<ComponentInput> = {}): ComponentInput {
  return {
    code,
    name: code,
    kind: "ADDITIVE",
    amount,
    isTaxable: true,
    isBpjsApplicable: true,
    ...extra
  };
}
type Moneyish = Decimal | number | string;

describe("tax — batas bracket TER bulanan", () => {
  it("gross PERSIS di min bracket berikutnya memakai tarif bracket baru", () => {
    // 5.400.000 PERSIS -> bracket 0,25% (bukan 0%)
    const tax = computePph21TerMonthly({ gross: "5400000", brackets: bracketsA });
    expect(tax.toString()).toBe("13500"); // 5.400.000 x 0,25%
  });

  it("gross PERSIS maxGross-1 memakai tarif bracket itu (max eksklusif)", () => {
    // 5.649.999 di bracket 0,25% (max 5.650.000 eksklusif) -> 14.124,9975 -> 14125.00
    const tax = computePph21TerMonthly({ gross: "5649999", brackets: bracketsA });
    expect(tax.toString()).toBe("14125");
  });

  it("gross PERSIS di maxGross (5.650.000) masuk bracket 0,5%", () => {
    const tax = computePph21TerMonthly({ gross: "5650000", brackets: bracketsA });
    expect(tax.toString()).toBe("28250");
  });

  it("gross negatif diperlakukan seperti 0", () => {
    expect(computePph21TerMonthly({ gross: "-5000", brackets: bracketsA }).toString()).toBe("0");
  });

  it("gross desimal dibulatkan 2 digit", () => {
    // 5.650.001 x 0,5% = 28.250,005 -> 28.250,01 (ROUND_HALF_UP)
    const tax = computePph21TerMonthly({ gross: "5650001", brackets: bracketsA });
    expect(tax.toString()).toBe("28250.01");
  });

  it("bracket kosong -> 0", () => {
    expect(computePph21TerMonthly({ gross: "1000000", brackets: [] }).toString()).toBe("0");
  });

  it("gross di atas bracket tertinggi memakai tarif bracket teratas (35%)", () => {
    const tax = computePph21TerMonthly({ gross: "100000000", brackets: bracketsA });
    expect(tax.toString()).toBe("35000000");
  });
});

describe("tax — TER harian & honorarium", () => {
  it("harian PERSIS 450.000 -> bracket 0,5% (max eksklusif)", () => {
    const tax = computePph21TerDaily({
      dailyGross: "450000",
      brackets: cfg.terDaily,
      pasal17RatePercent: cfg.pasal17RatePercent
    });
    expect(tax.toString()).toBe("2250");
  });

  it("harian 450.000-1 (449.999) -> 0", () => {
    const tax = computePph21TerDaily({
      dailyGross: "449999",
      brackets: cfg.terDaily,
      pasal17RatePercent: cfg.pasal17RatePercent
    });
    expect(tax.toString()).toBe("0");
  });

  it("harian negatif -> 0", () => {
    expect(
      computePph21TerDaily({
        dailyGross: "-100",
        brackets: cfg.terDaily,
        pasal17RatePercent: "5"
      }).toString()
    ).toBe("0");
  });

  it("honorarium dppPercent 0 -> 0; dppPercent > 100 tidak crash", () => {
    expect(
      computePph21Honorarium({
        gross: "1000000",
        dppPercent: "0",
        pasal17RatePercent: "5"
      }).toString()
    ).toBe("0");
    const weird = computePph21Honorarium({
      gross: "1000000",
      dppPercent: "150",
      pasal17RatePercent: "5"
    });
    expect(weird.toString()).toBe("75000");
  });

  it("honorarium gross negatif -> 0", () => {
    expect(
      computePph21Honorarium({ gross: "-10", dppPercent: "50", pasal17RatePercent: "5" }).toString()
    ).toBe("0");
  });
});

describe("bpjs — ceiling & batas", () => {
  it("base PERSIS di ceiling -> dihitung penuh dari ceiling", () => {
    const r = computeBpjsContribution({ base: "12000000", config: cfg.bpjsKesehatan });
    expect(r.toString()).toBe("120000");
  });

  it("base di atas ceiling -> dihitung dari ceiling", () => {
    const r = computeBpjsContribution({ base: "13000000", config: cfg.bpjsKesehatan });
    expect(r.toString()).toBe("120000");
  });

  it("base negatif -> 0", () => {
    expect(computeBpjsContribution({ base: "-100", config: cfg.bpjsJht }).toString()).toBe("0");
  });

  it("employeeSharePercent 0 -> 0", () => {
    expect(
      computeBpjsContribution({
        base: "5000000",
        config: { employeeSharePercent: "0", ceiling: null }
      }).toString()
    ).toBe("0");
  });

  it("bundle dengan base negatif -> total 0", () => {
    const b = computeBpjsBundle("-5000", {
      kesehatan: cfg.bpjsKesehatan,
      jht: cfg.bpjsJht,
      jp: cfg.bpjsJp
    });
    expect(b.total.toString()).toBe("0");
  });

  it("ceilings null/0/negatif tidak memotong", () => {
    const noCap = computeBpjsContribution({
      base: "20000000",
      config: { employeeSharePercent: "2", ceiling: "0" }
    });
    expect(noCap.toString()).toBe("400000");
  });
});

describe("money — pembulatan & helper", () => {
  it("money membulatkan ke 2 desimal ROUND_HALF_UP", () => {
    expect(money("1.005").toString()).toBe("1.01");
    expect(money("1.004").toString()).toBe("1");
  });

  it("money menerima number, string, Decimal", () => {
    expect(money(1000).toString()).toBe("1000");
    expect(money("1000.5").toString()).toBe("1000.5");
    expect(money(new Decimal("1000.50")).toString()).toBe("1000.5");
  });

  it("money string tidak valid -> NaN tanpa throw (Decimal semantics)", () => {
    expect(money("abc").toString()).toBe("NaN");
  });

  it("isPositive false untuk 0 dan negatif", () => {
    expect(isPositive(0)).toBe(false);
    expect(isPositive("-1")).toBe(false);
    expect(isPositive("1")).toBe(true);
  });

  it("clampToZero menolak negatif", () => {
    expect(clampToZero("-100").toString()).toBe("0");
    expect(clampToZero("100").toString()).toBe("100");
    expect(ZERO.toString()).toBe("0");
  });
});

describe("payroll-calc — komponen & net", () => {
  const calcConfig = {
    umr: cfg.umr,
    terMonthly: bracketsA,
    bpjsKesehatan: cfg.bpjsKesehatan,
    bpjsJht: cfg.bpjsJht,
    bpjsJp: cfg.bpjsJp
  };

  it("net negatif bila potongan melebihi pendapatan", () => {
    const result = computePayroll(
      [comp("GAPOK", "1000000"), { ...comp("PINJAMAN", "2000000"), kind: "SUBTRACTIVE" }],
      [],
      calcConfig
    );
    expect(result.net.isNegative()).toBe(true);
    expect(result.belowUmr).toBe(true);
  });

  it("komponen variabel nol jam tidak menghasilkan baris", () => {
    const v = buildVariableComponents({
      honorPerJam: "50000",
      totalJtmHours: 0,
      lemburPerJam: "30000",
      totalLemburHours: 0
    });
    expect(v).toEqual([]);
  });

  it("jam desimal dihitung proporsional (prorate 0.5 jam)", () => {
    const v = buildVariableComponents({
      honorPerJam: "50000",
      totalJtmHours: 0.5,
      lemburPerJam: "0",
      totalLemburHours: 0
    });
    expect(v[0]?.amount.toString()).toBe("25000");
  });

  it("honorPerJam 0 -> honor 0 tetap dibuat bila jam > 0", () => {
    const v = buildVariableComponents({
      honorPerJam: "0",
      totalJtmHours: 10,
      lemburPerJam: "0",
      totalLemburHours: 0
    });
    expect(v[0]?.amount.toString()).toBe("0");
  });

  it("potongan SUBTRACTIVE di variable ikut dipotong", () => {
    const result = computePayroll(
      [comp("GAPOK", "1000000")],
      [{ ...comp("DENDA", "50000"), kind: "SUBTRACTIVE" }],
      calcConfig
    );
    expect(result.otherDeductions.toString()).toBe("50000");
  });

  it("komponen ADDITIVE yang tidak taxable tidak masuk taxableGross", () => {
    const result = computePayroll(
      [
        comp("GAPOK", "1000000"),
        comp("BANTUAN", "500000", { isTaxable: false, isBpjsApplicable: false })
      ],
      [],
      calcConfig
    );
    expect(result.gross.toString()).toBe("1500000");
    expect(result.taxableGross.toString()).toBe("1000000");
  });

  it("bpjsBase hanya fixed komponen isBpjsApplicable (variabel dikecualikan)", () => {
    const result = computePayroll(
      [comp("GAPOK", "1000000", { isBpjsApplicable: true })],
      [comp("HONOR", "1000000", { isBpjsApplicable: false })],
      calcConfig
    );
    expect(result.gross.toString()).toBe("2000000");
    expect(result.bpjsBase.toString()).toBe("1000000");
  });

  it("net dibulatkan 2 desimal", () => {
    // decimalPlaces() mengukur digit desimal SIGNIFIKAN — untuk nilai bulat
    // (mis. 960000) hasilnya 0 meski sudah dibulatkan 2 dp. Gunakan komponen
    // ber-fraksi agar presisi 2 dp terlihat nyata, lalu cek invarian pembulatan.
    const result = computePayroll([comp("GAPOK", "1000000.55")], [], calcConfig);
    expect(result.net.decimalPlaces()).toBe(2);
    expect(result.net.toDecimalPlaces(2).eq(result.net)).toBe(true);
  });
});

describe("config-defaults — integritas konfigurasi periode", () => {
  it("bracket bulanan berurutan dan tumpang-tindih hanya di batas", () => {
    for (const [i, b] of bracketsA.entries()) {
      if (i > 0) {
        const prev = bracketsA[i - 1] as (typeof bracketsA)[number];
        // min bracket saat ini == max bracket sebelumnya (kontigu)
        expect(b.minGross.toString()).toBe(prev.maxGross?.toString() ?? "∞");
      }
    }
  });

  it("kategori A/B/C identik di default", () => {
    expect(cfg.terMonthly.A.map((b) => b.ratePercent.toString())).toEqual(
      cfg.terMonthly.B.map((b) => b.ratePercent.toString())
    );
    expect(cfg.terMonthly.A.map((b) => b.ratePercent.toString())).toEqual(
      cfg.terMonthly.C.map((b) => b.ratePercent.toString())
    );
  });

  it("umr default 2.500.000", () => {
    expect(cfg.umr.toString()).toBe("2500000");
  });

  it("bracket terakhir maxGross null", () => {
    const last = bracketsA[bracketsA.length - 1];
    expect(last?.maxGross).toBeNull();
    expect(last?.ratePercent.toString()).toBe("35");
  });
});
