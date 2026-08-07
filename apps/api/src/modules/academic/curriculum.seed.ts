/**
 * Seed referensi CP/ATP untuk mapel umum (data referensi; bukan data operasional).
 * Fase E = kelas 10, Fase F = kelas 11-12 (kurikulum merdeka).
 */
import type { CurriculumReference } from "./curriculum.service";

export const SEED_CURRICULUM_REFERENCES: CurriculumReference[] = [
  {
    id: "cur:MAT:E",
    subjectCode: "MAT",
    subjectName: "Matematika",
    phase: "E",
    capaianPembelajaran:
      "Peserta didik mampu mengoperasikan bilangan real, aljabar, fungsi, dan statistika dasar untuk menyelesaikan masalah kontekstual.",
    alurTujuanPembelajaran: [
      "Menerapkan operasi bilangan real dan perpangkatan",
      "Menyelesaikan persamaan dan pertidaksamaan linear",
      "Membaca dan menyajikan data dalam tabel dan diagram",
      "Menerapkan relasi dan fungsi dasar"
    ]
  },
  {
    id: "cur:MAT:F",
    subjectCode: "MAT",
    subjectName: "Matematika",
    phase: "F",
    capaianPembelajaran:
      "Peserta didik mampu menggunakan trigonometri, barisan, peluang, dan statistika inferensial sederhana untuk pemodelan masalah.",
    alurTujuanPembelajaran: [
      "Menerapkan perbandingan trigonometri pada segitiga",
      "Menganalisis barisan dan deret",
      "Menghitung peluang kejadian majemuk",
      "Menggunakan statistika inferensial sederhana"
    ]
  },
  {
    id: "cur:BINDO:E",
    subjectCode: "BINDO",
    subjectName: "Bahasa Indonesia",
    phase: "E",
    capaianPembelajaran:
      "Peserta didik mampu memahami, mengapresiasi, dan memproduksi teks eksposisi, narasi, dan prosedur dengan struktur yang runtut.",
    alurTujuanPembelajaran: [
      "Mengidentifikasi struktur teks eksposisi",
      "Menyusun teks prosedur kompleks",
      "Menganalisis unsur kebahasaan teks narasi"
    ]
  },
  {
    id: "cur:BING:E",
    subjectCode: "BING",
    subjectName: "Bahasa Inggris",
    phase: "E",
    capaianPembelajaran:
      "Peserta didik mampu berkomunikasi lisan dan tulis dalam bahasa Inggris pada tingkat fungsional untuk konteks sehari-hari.",
    alurTujuanPembelajaran: [
      "Memahami ungkapan perkenalan dan sapaan",
      "Menulis deskripsi sederhana",
      "Berbicara tentang kegiatan harian"
    ]
  },
  {
    id: "cur:PROD:F",
    subjectCode: "PROD",
    subjectName: "Produktif Kejuruan",
    phase: "F",
    capaianPembelajaran:
      "Peserta didik mampu menerapkan kompetensi kejuruan sesuai bidang (SMK) melalui praktik dan penilaian UKK.",
    alurTujuanPembelajaran: [
      "Menerapkan K3 (Keselamatan dan Kesehatan Kerja)",
      "Melaksanakan praktik standar industri",
      "Menyusun laporan PKL"
    ]
  }
];
