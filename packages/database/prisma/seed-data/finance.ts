/**
 * Data referensi Fase 0 (F0-T4):
 * - Komponen gaji standar sekolah Indonesia.
 * - Template tagihan dasar.
 *
 * CATATAN: tabel payroll/aset (PayrollComponent, PayrollRun, Payslip, InvoiceTemplate)
 * belum ada di ERD v1.1 (03-database-erd.md) — prd04 §16.3 menetapkan sinkronisasi
 * entitas W2 sebagai task prasyarat. Konstanta ini disiapkan sebagai data seed yang
 * siap dikonsumsi saat tabel W2 ditambahkan; tidak di-insert ke DB pada F0.
 */

export type SalaryComponentKind = "ADDITIVE" | "SUBTRACTIVE";

export interface SalaryComponentSeed {
  code: string;
  name: string;
  kind: SalaryComponentKind;
  is_taxable: boolean;
  is_bpjs_applicable: boolean;
  /** nilai default diambil dari pengaturan sekolah saat payroll run */
  default_amount: number | null;
  description: string;
}

/** Komponen gaji standar — umum di sekolah swasta Indonesia. */
export const SALARY_COMPONENT_SEEDS: SalaryComponentSeed[] = [
  {
    code: "GAPOK",
    name: "Gaji Pokok",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: true,
    default_amount: null,
    description: "Gaji pokok per bulan sesuai kesepakatan"
  },
  {
    code: "TUNJANGAN_JABATAN",
    name: "Tunjangan Jabatan",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: true,
    default_amount: null,
    description: "Tunjangan struktural/fungsional"
  },
  {
    code: "TUNJANGAN_FUNGSIONAL",
    name: "Tunjangan Fungsional",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: true,
    default_amount: null,
    description: "Tunjangan guru bersertifikat"
  },
  {
    code: "TUNJANGAN_KELUARGA",
    name: "Tunjangan Keluarga",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: true,
    default_amount: null,
    description: "Tunjangan istri/suami & anak"
  },
  {
    code: "TUNJANGAN_MASA_KERJA",
    name: "Tunjangan Masa Kerja",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: true,
    default_amount: null,
    description: "Berdasarkan masa kerja"
  },
  {
    code: "TUNJANGAN_KEHADIRAN",
    name: "Tunjangan Kehadiran",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: false,
    default_amount: null,
    description: "Berdasarkan kehadiran (absensi staf)"
  },
  {
    code: "INSENTIF_MENGAJAR",
    name: "Insentif Mengajar",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: false,
    default_amount: null,
    description: "Insentif per jam mengajar"
  },
  {
    code: "HONOR_JAM_MENGAJAR",
    name: "Honor Jam Mengajar",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: false,
    default_amount: null,
    description: "Honor guru honorer per jam"
  },
  {
    code: "TUNJANGAN_SERTIFIKASI",
    name: "Tunjangan Sertifikasi",
    kind: "ADDITIVE",
    is_taxable: true,
    is_bpjs_applicable: false,
    default_amount: null,
    description: "Tunjangan profesi guru"
  },
  {
    code: "BPJS_KESEHATAN",
    name: "BPJS Kesehatan (potongan)",
    kind: "SUBTRACTIVE",
    is_taxable: false,
    is_bpjs_applicable: false,
    default_amount: null,
    description: "Iuran BPJS Kesehatan peserta (1% s.d. 4%)"
  },
  {
    code: "BPJS_KETENAGAKERJAAN",
    name: "BPJS Ketenagakerjaan (potongan)",
    kind: "SUBTRACTIVE",
    is_taxable: false,
    is_bpjs_applicable: false,
    default_amount: null,
    description: "Iuran JHT/JKK/JKM/JKP peserta"
  },
  {
    code: "POTONGAN_PAJAK",
    name: "PPh 21",
    kind: "SUBTRACTIVE",
    is_taxable: false,
    is_bpjs_applicable: false,
    default_amount: null,
    description: "Pajak penghasilan pasal 21"
  },
  {
    code: "POTONGAN_LAIN",
    name: "Potongan Lain",
    kind: "SUBTRACTIVE",
    is_taxable: false,
    is_bpjs_applicable: false,
    default_amount: null,
    description: "Potongan kasbon/administrasi/dll"
  }
];

export interface InvoiceTemplateSeed {
  type: string; // InvoiceType
  name: string;
  description: string;
  /** format periode, mis. "2026-08" untuk SPP bulanan */
  period_format: "MONTHLY" | "ONE_TIME" | "CUSTOM";
  default_amount: number | null;
}

/** Template tagihan dasar — dikonsumsi FinanceModule (Fase 2/gelombang 2). */
export const INVOICE_TEMPLATE_SEEDS: InvoiceTemplateSeed[] = [
  {
    type: "SPP",
    name: "SPP Bulanan",
    description: "Iuran SPP per bulan siswa",
    period_format: "MONTHLY",
    default_amount: null
  },
  {
    type: "UANG_KEGIATAN",
    name: "Uang Kegiatan",
    description: "Iuran kegiatan (study tour, dll.)",
    period_format: "ONE_TIME",
    default_amount: null
  },
  {
    type: "UANG_DAFTAR",
    name: "Uang Daftar",
    description: "Biaya pendaftaran siswa baru",
    period_format: "ONE_TIME",
    default_amount: null
  },
  {
    type: "UANG_SERAGAM",
    name: "Uang Seragam",
    description: "Pembelian seragam",
    period_format: "ONE_TIME",
    default_amount: null
  },
  {
    type: "LAINNYA",
    name: "Tagihan Lainnya",
    description: "Tagihan lain sesuai kebutuhan",
    period_format: "CUSTOM",
    default_amount: null
  }
];
