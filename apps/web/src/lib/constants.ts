/**
 * Konstanta aplikasi openlms — satu sumber kebenaran.
 * Jangan definisikan ulang FALLBACK_LANDING / FALLBACK_BRANDING / APP_NAME
 * / DEFAULT_APP_NAME di file lain.
 */

import type { BrandingView } from "./api-client";

/**
 * Identitas aplikasi.
 * - DEFAULT_APP_NAME: nilai default produk (openlms).
 * - APP_NAME: identitas runtime — override via env NEXT_PUBLIC_APP_NAME
 *   (lihat .env.example; diurus agent lain, dokumentasikan di sini).
 *   Hanya NEXT_PUBLIC_* yang bisa dibaca di client components.
 */
export const DEFAULT_APP_NAME = "openlms";
export const APP_NAME: string = process.env.NEXT_PUBLIC_APP_NAME ?? DEFAULT_APP_NAME;

/** Default & timeout API publik (ms). */
export const API_BASE_FALLBACK = "http://localhost:3001";
export const API_TIMEOUT_MS = 3000;

/** Urutan default section landing (hero → tentang → piagam → kontak). */
export const LANDING_DEFAULT_SECTION_ORDER = [
  "hero",
  "sambutan-kepsek",
  "tentang",
  "visi-misi",
  "piagam",
  "program-keahlian",
  "ekstrakurikuler",
  "prestasi",
  "fasilitas",
  "galeri",
  "faq",
  "kontak"
] as const;

// ============================================================
// Branding fallback (offline / API mati) — identitas openlms default.
// ============================================================

export const FALLBACK_BRANDING: BrandingView = {
  appName: DEFAULT_APP_NAME,
  tagline: "LMS & SIS Sekolah",
  logoUrl: null,
  faviconUrl: null,
  colors: { primary: "#2563eb", secondary: "#1d4ed8", accent: "#0ea5e9" },
  radius: null,
  configVersion: 1
};

// ============================================================
// Landing default (offline / API mati) — konten halaman depan sekolah.
// ============================================================

export interface LandingSection {
  slug: string;
  title: string;
  subtitle: string | null;
  body: string;
  imagePath: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  extra: Record<string, unknown> | null;
  sectionOrder: number;
}

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImagePath: string | null;
  category: string | null;
  author: string | null;
  publishedAt: string | null;
}

export interface LandingPageData {
  sections: LandingSection[];
  berita: NewsItem[];
  beritaTotal: number;
}

export const FALLBACK_LANDING: LandingPageData = {
  sections: [
    {
      slug: "hero",
      title: "Selamat Datang",
      subtitle: "Sekolah unggulan dengan teknologi digital",
      body: "Sistem Informasi Sekolah (SIS) dan Learning Management System (LMS) terpadu untuk mendukung pembelajaran, administrasi, dan pelayanan sekolah yang modern, transparan, dan akuntabel.",
      imagePath: null,
      linkUrl: "/ppdb",
      linkLabel: "Daftar PPDB",
      extra: {
        stats: [
          { label: "Peserta Didik", value: "1.200+" },
          { label: "Guru & Staf", value: "86" },
          { label: "Kelas", value: "48" },
          { label: "Tahun Berdiri", value: "1965" }
        ]
      },
      sectionOrder: 0
    },
    {
      slug: "sambutan-kepsek",
      title: "Sambutan Kepala Sekolah",
      subtitle: "Kata sambutan dari pimpinan sekolah",
      body: "Selamat datang di website resmi sekolah kami. Kami berkomitmen menyelenggarakan pendidikan yang bermutu, berkarakter, dan relevan dengan kebutuhan zaman.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: { name: "Nama Kepala Sekolah", position: "Kepala Sekolah", image: null },
      sectionOrder: 5
    },
    {
      slug: "tentang",
      title: "Tentang Kami",
      subtitle: "Profil singkat sekolah",
      body: "Kami adalah sekolah yang berkomitmen mencetak generasi cerdas, berkarakter, dan siap menghadapi tantangan zaman. Kurikulum kami mengintegrasikan penguasaan ilmu pengetahuan, penguatan karakter, dan kecakapan digital agar setiap peserta didik berkembang optimal.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        features: [
          { title: "Pembelajaran modern", desc: "Kurikulum aktif, kreatif, dan menyenangkan." },
          { title: "Teknologi terpadu", desc: "LMS & SIS dalam satu platform digital." },
          { title: "Karakter unggul", desc: "Pembiasaan positif dan penguatan budi pekerti." }
        ]
      },
      sectionOrder: 10
    },
    {
      slug: "visi-misi",
      title: "Visi & Misi",
      subtitle: "Arah dan komitmen kami",
      body: "Visi dan misi sekolah menjadi pedoman seluruh warga sekolah dalam menyelenggarakan pendidikan.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        visi: "Terwujudnya peserta didik yang beriman, bertakwa, cerdas, terampil, mandiri, dan berwawasan lingkungan.",
        misi: [
          "Menyelenggarakan pembelajaran aktif, kreatif, dan menyenangkan.",
          "Menumbuhkan budaya literasi dan numerasi.",
          "Membangun karakter peserta didik melalui pembiasaan positif.",
          "Mengembangkan bakat dan minat peserta didik.",
          "Mewujudkan lingkungan sekolah yang sehat, hijau, dan ramah anak."
        ]
      },
      sectionOrder: 15
    },
    {
      slug: "piagam",
      title: "Piagam Sekolah",
      subtitle: "Landasan pendirian & akreditasi",
      body: "Piagam pendirian dan akreditasi sekolah sebagai pengakuan resmi atas penyelenggaraan pendidikan.\n\nNPSN: 00000001\nStatus Akreditasi: A\nTahun Pendirian: 1965",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: null,
      sectionOrder: 20
    },
    {
      slug: "program-keahlian",
      title: "Program Keahlian",
      subtitle: "Kompetensi keahlian yang diselenggarakan (SMK)",
      body: "Sekolah menyelenggarakan program keahlian yang selaras dengan kebutuhan dunia usaha dan dunia industri (DUDI).",
      imagePath: null,
      linkUrl: "/ppdb",
      linkLabel: "Daftar Sekarang",
      extra: {
        programs: [
          {
            title: "Teknik Komputer & Jaringan",
            desc: "Instalasi jaringan, administrasi server, dan keamanan siber dasar.",
            icon: "database"
          },
          {
            title: "Rekayasa Perangkat Lunak",
            desc: "Pengembangan aplikasi web, mobile, dan basis data.",
            icon: "file"
          },
          {
            title: "Teknik Kendaraan Ringan",
            desc: "Perawatan dan perbaikan kendaraan ringan.",
            icon: "settings"
          }
        ]
      },
      sectionOrder: 25
    },
    {
      slug: "ekstrakurikuler",
      title: "Ekstrakurikuler",
      subtitle: "Wadah pengembangan bakat & minat",
      body: "Beragam kegiatan ekstrakurikuler untuk mengembangkan bakat, minat, dan karakter peserta didik di luar jam pelajaran.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        items: [
          { title: "Pramuka", desc: "Kepramukaan & kepemimpinan", icon: "flag" },
          { title: "Paskibra", desc: "Baris-berbaris & upacara", icon: "flag" },
          { title: "Futsal", desc: "Olahraga futsal", icon: "chart" },
          { title: "Basket", desc: "Olahraga basket", icon: "chart" },
          { title: "Robotik", desc: "Perakitan & pemrograman robot", icon: "rocket" },
          { title: "Seni Tari", desc: "Tari tradisional & modern", icon: "camera" },
          { title: "Paduan Suara", desc: "Vokal grup & kor", icon: "grade" },
          { title: "English Club", desc: "Pendalaman bahasa Inggris", icon: "book" }
        ]
      },
      sectionOrder: 30
    },
    {
      slug: "prestasi",
      title: "Prestasi",
      subtitle: "Kebanggaan warga sekolah",
      body: "Prestasi peserta didik dan guru di tingkat kabupaten, provinsi, nasional, hingga internasional.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        items: [
          { title: "Juara 1 LKS Web Technologies", level: "Provinsi", year: "2026" },
          { title: "Juara 2 OSN Matematika", level: "Kabupaten", year: "2025" },
          { title: "Medali Perak Robotik", level: "Nasional", year: "2024" }
        ]
      },
      sectionOrder: 35
    },
    {
      slug: "fasilitas",
      title: "Fasilitas",
      subtitle: "Sarana & prasarana pendukung",
      body: "Fasilitas belajar yang memadai untuk mendukung proses pembelajaran yang nyaman dan berkualitas.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        items: [
          {
            title: "Laboratorium Komputer",
            desc: "Lab komputer dengan internet",
            icon: "database"
          },
          { title: "Perpustakaan", desc: "Koleksi buku & ruang baca", icon: "book" },
          { title: "Masjid Sekolah", desc: "Tempat ibadah & kegiatan keagamaan", icon: "settings" },
          { title: "Lapangan Olahraga", desc: "Lapangan basket & futsal", icon: "chart" }
        ]
      },
      sectionOrder: 40
    },
    {
      slug: "galeri",
      title: "Galeri",
      subtitle: "Dokumentasi kegiatan sekolah",
      body: "Momen kegiatan pembelajaran, upacara, dan acara sekolah dalam dokumentasi foto.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        images: [
          { title: "Kegiatan MPLS", src: null },
          { title: "Pembelajaran Kelas", src: null }
        ]
      },
      sectionOrder: 45
    },
    {
      slug: "faq",
      title: "Pertanyaan Umum",
      subtitle: "Informasi yang sering ditanyakan",
      body: "Kumpulan pertanyaan dan jawaban seputar pendaftaran, pembelajaran, dan layanan sekolah.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        faq: [
          {
            question: "Bagaimana cara mendaftar PPDB?",
            answer:
              "Pendaftaran dilakukan secara daring melalui menu PPDB di website ini. Siapkan dokumen seperti akta kelahiran, KK, dan ijazah/SKHU."
          },
          {
            question: "Apakah ada beasiswa?",
            answer:
              "Sekolah menyediakan beasiswa prestasi dan bantuan biaya pendidikan bagi peserta didik yang memenuhi kriteria."
          }
        ]
      },
      sectionOrder: 50
    },
    {
      slug: "kontak",
      title: "Hubungi Kami",
      subtitle: "Informasi kontak sekolah",
      body: "Silakan hubungi kami untuk informasi lebih lanjut seputar penerimaan peserta didik baru dan layanan sekolah.",
      imagePath: null,
      linkUrl: "/ppdb",
      linkLabel: "Daftar PPDB",
      extra: {
        phone: "021-0000000",
        email: "info@openlms.local",
        address: "Jl. Pendidikan No. 1",
        hours: "Senin–Jumat, 07.00–15.00 WIB"
      },
      sectionOrder: 60
    }
  ],
  berita: [],
  beritaTotal: 0
};

// ============================================================
// Role-group map (label navigasi) — konstanta; fungsi role tetap di roles.ts.
// ============================================================

export type RoleGroup = "siswa" | "guru" | "admin" | "superadmin" | "ortu";

export const ROLE_GROUP_LABEL: Record<RoleGroup, string> = {
  siswa: "Siswa",
  guru: "Guru",
  admin: "Tata Usaha / Admin",
  superadmin: "Superadmin",
  ortu: "Orang Tua"
};
