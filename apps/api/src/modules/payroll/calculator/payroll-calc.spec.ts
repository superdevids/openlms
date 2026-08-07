import { computePayroll, buildVariableComponents, ComponentInput } from "./payroll-calc";
import { createDefaultPayrollPeriodConfig } from "./config-defaults";

const cfg = createDefaultPayrollPeriodConfig("2026-01");

const fixed: ComponentInput[] = [
  {
    code: "GAJI_POKOK",
    name: "Gaji Pokok",
    kind: "ADDITIVE",
    amount: "3000000",
    isTaxable: true,
    isBpjsApplicable: true
  },
  {
    code: "TUNJANGAN_JABATAN",
    name: "Tunjangan Jabatan",
    kind: "ADDITIVE",
    amount: "500000",
    isTaxable: true,
    isBpjsApplicable: true
  },
  {
    code: "TRANSPORT",
    name: "Transport",
    kind: "ADDITIVE",
    amount: "300000",
    isTaxable: true,
    isBpjsApplicable: true
  },
  {
    code: "MAKAN",
    name: "Makan",
    kind: "ADDITIVE",
    amount: "200000",
    isTaxable: true,
    isBpjsApplicable: true
  },
  {
    code: "IURAN",
    name: "Iuran",
    kind: "SUBTRACTIVE",
    amount: "100000",
    isTaxable: false,
    isBpjsApplicable: false
  }
];

const calcConfig = {
  umr: cfg.umr,
  terMonthly: cfg.terMonthly.A,
  bpjsKesehatan: cfg.bpjsKesehatan,
  bpjsJht: cfg.bpjsJht,
  bpjsJp: cfg.bpjsJp
};

describe("payroll-calc — perhitungan run per pegawai (prd04 §5.E.2)", () => {
  it("gross = jumlah komponen ADDITIVE tetap + variabel", () => {
    const variable = buildVariableComponents({
      honorPerJam: "50000",
      totalJtmHours: 10,
      lemburPerJam: "30000",
      totalLemburHours: 5
    });
    const result = computePayroll(fixed, variable, calcConfig);
    // 3jt + 500rb + 300rb + 200rb + 500rb (honor) + 150rb (lembur) = 4.650.000
    expect(result.gross.toString()).toBe("4650000");
    expect(variable).toHaveLength(2);
  });

  it("net = gross - (PPh21 + BPJS + potongan lain); dasar BPJS hanya tunjangan tetap", () => {
    const result = computePayroll(fixed, [], calcConfig);
    // gross = 4jt; bpjsBase = 3jt + 500rb + 300rb + 200rb = 4jt
    expect(result.bpjsBase.toString()).toBe("4000000");
    // BPJS: kes 1% x 4jt = 40.000; jht 2% = 80.000; jp 1% = 40.000; total 160.000
    expect(result.bpjsKesehatan.toString()).toBe("40000");
    expect(result.bpjsJht.toString()).toBe("80000");
    expect(result.bpjsJp.toString()).toBe("40000");
    // taxable gross = 4jt -> TER 0% (<= 5,4jt) => PPh 0
    expect(result.pph21.toString()).toBe("0");
    // potongan lain IURAN 100.000
    expect(result.otherDeductions.toString()).toBe("100000");
    expect(result.totalDeductions.toString()).toBe("260000");
    expect(result.net.toString()).toBe("3740000");
  });

  it("peringatan UMR bila net < UMR konfigurasi", () => {
    const poor: ComponentInput[] = [
      {
        code: "GAJI_POKOK",
        name: "Gaji Pokok",
        kind: "ADDITIVE",
        amount: "1000000",
        isTaxable: true,
        isBpjsApplicable: true
      }
    ];
    const result = computePayroll(poor, [], calcConfig);
    expect(result.belowUmr).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("komponen variabel honor/lembur dihitung dari jam", () => {
    const variable = buildVariableComponents({
      honorPerJam: "75000",
      totalJtmHours: 24,
      lemburPerJam: "40000",
      totalLemburHours: 10
    });
    const honor = variable.find((c) => c.code === "HONOR_MENGAJAR");
    const lembur = variable.find((c) => c.code === "LEMBUR");
    expect(honor?.amount.toString()).toBe("1800000"); // 75rb x 24
    expect(lembur?.amount.toString()).toBe("400000"); // 40rb x 10
  });

  it("gross 0 (tanpa komponen) -> warning dan net negatif tidak terjadi", () => {
    const result = computePayroll([], [], calcConfig);
    expect(result.gross.toString()).toBe("0");
    expect(result.warnings.some((w) => w.includes("gross = 0"))).toBe(true);
    expect(result.net.toString()).toBe("0");
  });

  it("tarif TER bekerja pada gross pajak tinggi", () => {
    const rich: ComponentInput[] = [
      {
        code: "GAJI_POKOK",
        name: "Gaji Pokok",
        kind: "ADDITIVE",
        amount: "20000000",
        isTaxable: true,
        isBpjsApplicable: true
      }
    ];
    const result = computePayroll(rich, [], calcConfig);
    // 20jt di bracket 18% (19,575jt <= 20jt < 20,075jt)
    expect(result.pph21.toString()).toBe("3600000"); // 20jt x 18%
  });
});
