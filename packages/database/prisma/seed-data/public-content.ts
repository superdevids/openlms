/**
 * Seed data tabel domain halaman publik (R-37) — ekstrakurikuler & prestasi.
 * Dipakai endpoint /public/* (modul public-content) agar tiap halaman landing
 * punya data NYATA dari tabel domain, bukan hanya LandingContent.extra.
 *
 * Idempotent: di-seed via upsert (findFirst by name/title → update/create)
 * karena tabel tidak punya kunci unik selain id — aman dijalankan berulang.
 */

export interface ExtracurricularSeed {
  name: string;
  description: string;
  schedule: { day: string; time: string }[];
}

export const EXTRACURRICULARS_SEED: ExtracurricularSeed[] = [
  {
    name: "Basket",
    description: "Olahraga basket — latihan teknik dasar, strategi permainan, dan pertandingan.",
    schedule: [
      { day: "Senin", time: "15.30–17.30 WIB" },
      { day: "Rabu", time: "15.30–17.30 WIB" }
    ]
  },
  {
    name: "Futsal",
    description: "Olahraga futsal — latihan teknik, taktik, dan kompetisi antar kelas/sekolah.",
    schedule: [
      { day: "Selasa", time: "15.30–17.30 WIB" },
      { day: "Kamis", time: "15.30–17.30 WIB" }
    ]
  },
  {
    name: "Pramuka",
    description: "Kepramukaan & kepemimpinan — latihan rutin, perkemahan, dan bakti sosial.",
    schedule: [{ day: "Sabtu", time: "07.30–10.00 WIB" }]
  },
  {
    name: "Paskibra",
    description: "Baris-berbaris & upacara — persiapan petugas upacara dan Paskibraka.",
    schedule: [{ day: "Sabtu", time: "07.30–10.00 WIB" }]
  },
  {
    name: "Rohis",
    description: "Kerohanian Islam — kajian, mentoring, dan kegiatan keagamaan.",
    schedule: [{ day: "Jumat", time: "14.00–16.00 WIB" }]
  },
  {
    name: "PMR",
    description: "Palang Merah Remaja — pertolongan pertama, kesehatan remaja, dan donor darah.",
    schedule: [{ day: "Rabu", time: "14.00–16.00 WIB" }]
  },
  {
    name: "Seni Tari",
    description: "Tari tradisional & modern — latihan koreografi dan pementasan.",
    schedule: [{ day: "Jumat", time: "14.00–16.00 WIB" }]
  },
  {
    name: "Robotik",
    description: "Perakitan & pemrograman robot — persiapan lomba robotik tingkat nasional.",
    schedule: [{ day: "Jumat", time: "14.00–16.00 WIB" }]
  }
];

export interface AchievementSeed {
  title: string;
  level: "SEKOLAH" | "KABUPATEN" | "PROVINSI" | "NASIONAL";
  /** Tanggal prestasi (ISO yyyy-mm-dd). */
  date: string;
}

export const ACHIEVEMENTS_SEED: AchievementSeed[] = [
  { title: "Juara 1 OSN Matematika", level: "KABUPATEN", date: "2026-03-15" },
  { title: "Juara 2 Futsal", level: "PROVINSI", date: "2026-05-20" },
  { title: "Juara Harapan Lomba Robotik", level: "NASIONAL", date: "2026-06-10" },
  { title: "Peringkat 1 Raport", level: "SEKOLAH", date: "2026-06-30" },
  { title: "Juara 1 Paskibra", level: "KABUPATEN", date: "2026-07-25" }
];
