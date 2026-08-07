/**
 * Data referensi aset (F0-T4): kategori aset + umur manfaat (bulan).
 *
 * CATATAN: tabel AssetCategory/AssetDepreciationConfig belum ada di ERD v1.1.
 * Kategori aset adalah enum AssetCategory (03-database-erd.md §5); umur manfaat
 * dipakai untuk depresiasi garis lurus (prd04 §7.3) — dihitung saat laporan.
 * Konstanta ini disiapkan untuk dikonsumsi modul aset (gelombang 2).
 */

export interface AssetCategorySeed {
  category: string; // AssetCategory enum
  name: string;
  /** umur manfaat default dalam bulan (depresiasi garis lurus) */
  useful_life_months: number;
  description: string;
}

export const ASSET_CATEGORY_SEEDS: AssetCategorySeed[] = [
  {
    category: "RUANG",
    name: "Ruang / Gedung",
    useful_life_months: 480,
    description: "Gedung, ruang kelas, ruang kantor (40 tahun)"
  },
  {
    category: "LAB",
    name: "Laboratorium",
    useful_life_months: 60,
    description: "Peralatan laboratorium (5 tahun)"
  },
  {
    category: "ALAT",
    name: "Alat / Elektronik",
    useful_life_months: 48,
    description: "Komputer, proyektor, AC, furnitur (4 tahun)"
  },
  {
    category: "LAINNYA",
    name: "Aset Lainnya",
    useful_life_months: 36,
    description: "Aset yang tidak termasuk kategori lain (3 tahun)"
  }
];
