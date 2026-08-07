import { Decimal } from "@prisma/client/runtime/library";

/**
 * Tipe domain Payroll (prd04 §5.E).
 *
 * CATATAN PENTING (lihat ISSUES): entitas W2 berikut BELUM ada di schema.prisma
 * (03-database-erd v1.1) dan BUKAN model Prisma:
 *   JobPosition, PayrollComponent, SalaryStructure, PayrollRun, PayrollRunItem,
 *   Payslip, PayrollPeriodConfig.
 * Tipe di file ini adalah KONTRAK domain; persistence memakai PayrollStore
 * (saat ini InMemoryPayrollStore — lihat payroll.store.ts) sampai integration
 * coder menambahkan skema + adapter Prisma. Staff & StaffAttendance memakai
 * model Prisma yang sudah ada (schema §3.15/§3.16).
 */

export type ComponentKind = "ADDITIVE" | "SUBTRACTIVE";

/** Jabatan (prd04 §5.E.1) — Staff.position adalah free text; JobPosition master. */
export interface JobPositionRecord {
  id: string;
  code: string; // GURU / OPERATOR / KEUANGAN / BK / WAKEPSEK / KEPSEK / LAINNYA
  name: string;
  /** tunjangan jabatan default (decimal) — dapat ditimpa SalaryStructure */
  defaultJabatanAllowance: Decimal;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollComponentRecord {
  id: string;
  code: string; // GAJI_POKOK, TUNJANGAN_TETAP, ..., HONOR_MENGAJAR, LEMBUR
  name: string;
  category: "TUNJANGAN_TETAP" | "POTONGAN" | "VARIABEL";
  kind: ComponentKind;
  isTaxable: boolean;
  isBpjsApplicable: boolean;
  /** unit perhitungan untuk komponen variabel */
  unit: "BULANAN" | "JAM" | "JTM" | null;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryStructureRecord {
  id: string;
  staffId: string;
  /** periode mulai berlaku "YYYY-MM" — riwayat revisi gaji tercatat */
  effectiveFrom: string;
  /** komponen tetap: code -> nominal */
  components: Record<string, Decimal>;
  /** tunjangan kehadiran per hari (opsional, dipakai dari StaffAttendance) */
  attendanceAllowancePerDay: Decimal | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PayrollRunState =
  "DRAFT" | "CALCULATED" | "VALIDATED" | "APPROVED_KEUANGAN" | "REKAP_KEPSEK" | "PAID";

export interface PayrollRunItemRecord {
  id: string;
  runId: string;
  staffId: string;
  gross: Decimal;
  pph21: Decimal;
  bpjsKesehatan: Decimal;
  bpjsJht: Decimal;
  bpjsJp: Decimal;
  otherDeductions: Decimal;
  totalDeductions: Decimal;
  net: Decimal;
  attendanceDays: number;
  belowUmr: boolean;
  warnings: string[];
  detailComponents: Array<{ code: string; name: string; kind: ComponentKind; amount: Decimal }>;
}

export interface PayrollRunRecord {
  id: string;
  period: string; // "YYYY-MM" — kunci idempotensi (satu run per bulan)
  status: PayrollRunState;
  totalGross: Decimal;
  totalDeductions: Decimal;
  totalNet: Decimal;
  staffCount: number;
  approvedByKeuangan: string | null;
  approvedByKepsek: string | null;
  paidAt: Date | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  items: PayrollRunItemRecord[];
}

export type PayslipStatus = "DRAFT" | "ISSUED" | "ARCHIVED";

export interface PayslipRecord {
  id: string;
  runId: string;
  staffId: string;
  period: string;
  status: PayslipStatus;
  /** snapshot slip saat diterbitkan (field-level access payslip:read:self) */
  snapshots: Array<{
    gross: Decimal;
    pph21: Decimal;
    bpjsKesehatan: Decimal;
    bpjsJht: Decimal;
    bpjsJp: Decimal;
    otherDeductions: Decimal;
    net: Decimal;
    issuedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/** Tarif TER bulanan (PMK 168/2023) — bracket per kategori. */
export interface TerMonthlyBracket {
  minGross: Decimal;
  maxGross: Decimal | null; // null = tanpa batas atas
  ratePercent: Decimal;
}

/** Tarif TER harian. */
export interface TerDailyBracket {
  minDaily: Decimal;
  maxDaily: Decimal | null;
  ratePercent: Decimal;
}

/**
 * Konfigurasi pajak/BPJS PER PERIODE (prd04 §5.E.3 — nilai terkonfigurasi,
 * BUKAN hardcode). Disimpan PayrollStore; kalkulator hanya menerima input.
 */
export interface PayrollPeriodConfigRecord {
  id: string;
  period: string; // "YYYY-MM"
  umr: Decimal;
  /** TER bulanan per kategori A/B/C */
  terMonthly: {
    A: TerMonthlyBracket[];
    B: TerMonthlyBracket[];
    C: TerMonthlyBracket[];
  };
  terDaily: TerDailyBracket[];
  /** honorarium bukan pegawai: persentase DPP (default 50%) */
  honorDppPercent: Decimal;
  /** PNS: final 15% */
  pnsFinalRatePercent: Decimal;
  /** BPJS Kesehatan PPU: total 5% (4% perusahaan + 1% pekerja), ceiling upah */
  bpjsKesehatan: { employeeSharePercent: Decimal; ceiling: Decimal };
  /** BPJS JHT: pekerja 2% */
  bpjsJht: { employeeSharePercent: Decimal; ceiling: Decimal | null };
  /** BPJS JP: pekerja 1%, ceiling */
  bpjsJp: { employeeSharePercent: Decimal; ceiling: Decimal };
  /** tarif Pasal 17 untuk bukan pegawai (lapisan atas) */
  pasal17RatePercent: Decimal;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  note: string | null;
  createdAt: Date;
}
