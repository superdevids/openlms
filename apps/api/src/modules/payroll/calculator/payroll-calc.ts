import { Decimal } from "@prisma/client/runtime/library";
import { ComponentKind } from "../payroll.types";
import { computePph21TerMonthly, TaxInput } from "./tax";
import { computeBpjsBundle } from "./bpjs";
import { money, MoneyInput, ZERO } from "./money";

/**
 * PayrollCalculator — perhitungan payroll run per pegawai (prd04 §5.E.2).
 * MODUL TERISOLASI & TERUJI. Murni; seluruh tarif dari PayrollPeriodConfig.
 *
 * Alur:
 * 1. Pendapatan kotor = komponen tetap ADDITIVE + komponen variabel
 *    (HONOR_MENGAJAR x JTM, LEMBUR) + tunjangan kehadiran (bila ada).
 * 2. PPh 21 TER = f(gross pajak, bracket TER bulanan).
 * 3. BPJS = f(dasar BPJS = gaji pokok + tunjangan tetap, config).
 * 4. Potongan lain = komponen SUBTRACTIVE (iuran, pinjaman, dll).
 * 5. Net = gross - total potongan.
 * 6. Validasi: net >= UMR regional (peringatan bila di bawah — prd04 §5.E.2).
 */

export interface ComponentInput {
  code: string;
  name: string;
  kind: ComponentKind;
  amount: MoneyInput;
  isTaxable: boolean;
  isBpjsApplicable: boolean;
}

export interface PayrollCalcConfig {
  umr: MoneyInput;
  terMonthly: TaxInput["brackets"];
  bpjsKesehatan: { employeeSharePercent: MoneyInput; ceiling: MoneyInput | null };
  bpjsJht: { employeeSharePercent: MoneyInput; ceiling: MoneyInput | null };
  bpjsJp: { employeeSharePercent: MoneyInput; ceiling: MoneyInput | null };
}

export interface PayrollCalcResult {
  gross: Decimal;
  taxableGross: Decimal;
  /** dasar BPJS = komponen tetap yang isBpjsApplicable */
  bpjsBase: Decimal;
  pph21: Decimal;
  bpjsKesehatan: Decimal;
  bpjsJht: Decimal;
  bpjsJp: Decimal;
  otherDeductions: Decimal;
  totalDeductions: Decimal;
  net: Decimal;
  belowUmr: boolean;
  warnings: string[];
}

function sum(values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), ZERO).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function computePayroll(
  fixed: ComponentInput[],
  variable: ComponentInput[],
  config: PayrollCalcConfig
): PayrollCalcResult {
  const allAdditive = [...fixed, ...variable].filter((c) => c.kind === "ADDITIVE");
  const subtractive = [...fixed, ...variable].filter((c) => c.kind === "SUBTRACTIVE");

  const gross = sum(allAdditive.map((c) => money(c.amount)));
  const taxableGross = sum(allAdditive.filter((c) => c.isTaxable).map((c) => money(c.amount)));
  const bpjsBase = sum(fixed.filter((c) => c.isBpjsApplicable).map((c) => money(c.amount)));

  const pph21 = computePph21TerMonthly({
    gross: taxableGross,
    brackets: config.terMonthly
  });

  const bpjs = computeBpjsBundle(bpjsBase, {
    kesehatan: config.bpjsKesehatan,
    jht: config.bpjsJht,
    jp: config.bpjsJp
  });

  const otherDeductions = sum(subtractive.map((c) => money(c.amount)));
  const totalDeductions = sum([pph21, bpjs.total, otherDeductions]);
  const net = gross.minus(totalDeductions).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const umr = money(config.umr);
  const belowUmr = net.lt(umr);
  const warnings: string[] = [];
  if (belowUmr) {
    warnings.push(`Gaji net Rp${net} di bawah UMR Rp${umr} (konfigurasi)`);
  }
  if (gross.lte(ZERO)) {
    warnings.push("Tidak ada komponen pendapatan (gross = 0)");
  }

  return {
    gross,
    taxableGross,
    bpjsBase,
    pph21,
    bpjsKesehatan: bpjs.kesehatan,
    bpjsJht: bpjs.jht,
    bpjsJp: bpjs.jp,
    otherDeductions,
    totalDeductions,
    net,
    belowUmr,
    warnings
  };
}

/** Hitung komponen variabel dari data kehadiran (prd04 §5.E.2). */
export interface AttendanceVariableInput {
  /** honor per jam mengajar (JTM) */
  honorPerJam: MoneyInput;
  /** total jam mengajar bulan berjalan */
  totalJtmHours: number;
  /** lembur per jam */
  lemburPerJam: MoneyInput;
  totalLemburHours: number;
}

export function buildVariableComponents(input: AttendanceVariableInput): ComponentInput[] {
  const result: ComponentInput[] = [];
  if (input.totalJtmHours > 0) {
    result.push({
      code: "HONOR_MENGAJAR",
      name: "Honor Mengajar",
      kind: "ADDITIVE",
      amount: money(input.honorPerJam).times(input.totalJtmHours),
      isTaxable: true,
      isBpjsApplicable: false
    });
  }
  if (input.totalLemburHours > 0) {
    result.push({
      code: "LEMBUR",
      name: "Lembur",
      kind: "ADDITIVE",
      amount: money(input.lemburPerJam).times(input.totalLemburHours),
      isTaxable: true,
      isBpjsApplicable: false
    });
  }
  return result;
}
