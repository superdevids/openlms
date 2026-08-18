/**
 * Konstanta aplikasi opensis — satu sumber kebenaran.
 * Jangan definisikan ulang FALLBACK_LANDING / FALLBACK_BRANDING / APP_NAME
 * / DEFAULT_APP_NAME di file lain.
 */

import type { BrandingView } from "./api-client";
import type { BadgeVariant } from "@opensis/ui";

/**
 * Identitas aplikasi.
 * - DEFAULT_APP_NAME: nilai default produk (opensis).
 * - APP_NAME: identitas runtime — override via env NEXT_PUBLIC_APP_NAME
 *   (lihat .env.example; diurus agent lain, dokumentasikan di sini).
 *   Hanya NEXT_PUBLIC_* yang bisa dibaca di client components.
 */
export const DEFAULT_APP_NAME = "Opensis";
export const APP_NAME: string = process.env.NEXT_PUBLIC_APP_NAME ?? DEFAULT_APP_NAME;

/**
 * URL absolut aplikasi (untuk metadataBase / OG image / JSON-LD).
 * Override via NEXT_PUBLIC_APP_URL; fallback dev localhost:3000.
 */
export const APP_URL: string = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** URL absolut aset di public/ (landing) untuk OG/JSON-LD. Absolute URL diteruskan apa adanya. */
export function appAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${APP_URL.replace(/\/+$/, "")}${clean}`;
}

/**
 * Foto asli landing sekolah (item 16) — dihasilkan scripts/generate-landing-images.mjs
 * ke apps/web/public/landing/school/*.jpg (hero 1600x900, lainnya 800x600).
 */
export const LANDING_SCHOOL_IMAGES = {
  hero: "/landing/school/hero.jpg",
  facility: "/landing/school/facility.jpg",
  activity: "/landing/school/activity.jpg",
  library: "/landing/school/library.jpg",
  classroom: "/landing/school/classroom.jpg"
} as const;

/** Default & timeout API publik (ms). */
export const API_BASE_FALLBACK = "http://localhost:3001";
export const API_TIMEOUT_MS = 3000;

// ============================================================
// Branding fallback (offline / API mati) — identitas opensis default.
// ============================================================

export const FALLBACK_BRANDING: BrandingView = {
  appName: DEFAULT_APP_NAME,
  tagline: "Platform Digital Terpadu Sekolah",
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
      slug: "statistik",
      title: "Statistik Sekolah",
      subtitle: "Angka nyata dari lapangan",
      body: "Data profil sekolah yang diperbarui setiap tahun ajaran agar masyarakat dapat melihat capaian dan fasilitas kami secara transparan.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        stats: [
          { label: "Peserta Didik Aktif", value: "1.247", desc: "Tahun ajaran 2026/2027" },
          { label: "Guru & Tenaga Kependidikan", value: "86", desc: "92% guru tersertifikasi" },
          { label: "Rombongan Belajar", value: "36", desc: "Kelas X–XII" },
          { label: "Akreditasi", value: "A", desc: "BAN-S/M 2023" },
          { label: "Lulusan Terserap DUDI", value: "94%", desc: "Tracer study 2025" },
          { label: "Beasiswa Tersalurkan", value: "Rp480 Juta", desc: "Tahun 2025/2026" }
        ]
      },
      sectionOrder: 3
    },
    {
      slug: "sambutan-kepsek",
      title: "Sambutan Kepala Sekolah",
      subtitle: "Kata sambutan dari pimpinan sekolah",
      body: "Selamat datang di website resmi sekolah kami. Kami berkomitmen menyelenggarakan pendidikan yang bermutu, berkarakter, dan relevan dengan kebutuhan zaman.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: { name: "Drs. H. Ahmad Fauzi, M.Pd.", position: "Kepala Sekolah", image: null },
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
          { title: "Karakter unggul", desc: "Pembiasaan positif dan penguatan budi pekerti." },
          { title: "Lingkungan ramah anak", desc: "Sekolah sehat, hijau, dan bebas perundungan." },
          { title: "Kemitraan industri", desc: "Guru tamu dan magang dari DUDI." },
          { title: "Layanan inklusif", desc: "Dukungan belajar untuk semua peserta didik." }
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
          "Memperkuat kemitraan dengan dunia usaha dan dunia industri (DUDI).",
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
      slug: "struktur-organisasi",
      title: "Struktur Organisasi",
      subtitle: "Susunan pengurus dan pembagian tugas",
      body: "Struktur organisasi sekolah menggambarkan pembagian tugas dan tanggung jawab setiap unit kerja agar pelayanan pendidikan berjalan tertib dan akuntabel.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        groups: [
          {
            title: "Pimpinan",
            items: [
              { name: "Drs. H. Ahmad Fauzi, M.Pd.", position: "Kepala Sekolah" },
              { name: "Hj. Siti Nurhaliza, S.Pd., M.M.", position: "Ketua Komite Sekolah" }
            ]
          },
          {
            title: "Wakil Kepala Sekolah",
            items: [
              { name: "Dedi Kurniawan, S.T.", position: "Waka Bidang Kurikulum" },
              { name: "Budi Santoso, M.Pd.", position: "Waka Bidang Kesiswaan" },
              { name: "Rina Marlina, S.Pd.", position: "Waka Bidang Sarana & Prasarana" },
              { name: "Eko Prasetyo, S.Sn.", position: "Waka Bidang Humas & Industri" }
            ]
          }
        ]
      },
      sectionOrder: 22
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
            icon: "database",
            kompetensi: [
              "Instalasi LAN/WAN dan nirkabel",
              "Administrasi server Linux & Windows",
              "Keamanan jaringan dasar",
              "Konfigurasi perangkat Mikrotik"
            ],
            mitra_dudi: ["PT Telkom Indonesia", "Mikrotik Academy", "PT Nusantara Network"],
            prospek: ["Teknisi Jaringan", "Network Administrator", "Teknisi Komputer"]
          },
          {
            title: "Rekayasa Perangkat Lunak",
            desc: "Pengembangan aplikasi web, mobile, dan basis data.",
            icon: "file",
            kompetensi: [
              "Pemrograman web (HTML, CSS, JavaScript)",
              "Pengembangan aplikasi mobile",
              "Perancangan basis data",
              "Pengujian perangkat lunak"
            ],
            mitra_dudi: ["Dicoding", "PT Maju Teknologi", "Coding Camp Indonesia"],
            prospek: ["Web Developer", "Mobile Developer", "QA Engineer"]
          },
          {
            title: "Teknik Kendaraan Ringan",
            desc: "Perawatan dan perbaikan kendaraan ringan.",
            icon: "settings",
            kompetensi: [
              "Perawatan mesin kendaraan ringan",
              "Kelistrikan kendaraan",
              "Chassis dan pemindah tenaga",
              "Diagnosa kerusakan dasar"
            ],
            mitra_dudi: ["Astra Honda Motor", "Toyota Service Center", "Bengkel Mitra"],
            prospek: ["Teknisi Otomotif", "Mekanik", "Wirausaha bengkel"]
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
          {
            title: "Pramuka",
            desc: "Kepramukaan & kepemimpinan",
            icon: "flag",
            schedule: "Sabtu, 07.30–10.00 WIB",
            pembina: "Budi Santoso, M.Pd.",
            kuota: "100 peserta"
          },
          {
            title: "Paskibra",
            desc: "Baris-berbaris & upacara",
            icon: "flag",
            schedule: "Sabtu, 07.30–10.00 WIB",
            pembina: "Kapten (Purn.) Joko Prasetyo",
            kuota: "40 peserta"
          },
          {
            title: "Futsal",
            desc: "Olahraga futsal",
            icon: "chart",
            schedule: "Selasa & Kamis, 15.30–17.30 WIB",
            pembina: "Andi Wijaya, S.Or.",
            kuota: "30 peserta"
          },
          {
            title: "Basket",
            desc: "Olahraga basket",
            icon: "chart",
            schedule: "Senin & Rabu, 15.30–17.30 WIB",
            pembina: "Rina Marlina, S.Pd.",
            kuota: "30 peserta"
          },
          {
            title: "Robotik",
            desc: "Perakitan & pemrograman robot",
            icon: "rocket",
            schedule: "Jumat, 14.00–16.00 WIB",
            pembina: "Dedi Kurniawan, S.T.",
            kuota: "25 peserta"
          },
          {
            title: "Seni Tari",
            desc: "Tari tradisional & modern",
            icon: "camera",
            schedule: "Jumat, 14.00–16.00 WIB",
            pembina: "Sri Rahayu, S.Sn.",
            kuota: "40 peserta"
          },
          {
            title: "Paduan Suara",
            desc: "Vokal grup & kor",
            icon: "grade",
            schedule: "Sabtu, 10.00–12.00 WIB",
            pembina: "Eko Prasetyo, S.Sn.",
            kuota: "40 peserta"
          },
          {
            title: "English Club",
            desc: "Pendalaman bahasa Inggris",
            icon: "book",
            schedule: "Rabu, 14.00–15.30 WIB",
            pembina: "Sarah Wijaya, S.Pd.",
            kuota: "30 peserta"
          }
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
          {
            title: "Juara 1 LKS Web Technologies",
            level: "Provinsi",
            year: "2026",
            field: "Teknologi Informasi",
            coach: "Dedi Kurniawan, S.T.",
            description:
              "Mengalahkan 30 peserta dari seluruh provinsi dalam pengembangan aplikasi web."
          },
          {
            title: "Juara 2 OSN Matematika",
            level: "Kabupaten",
            year: "2025",
            field: "Matematika",
            coach: "Bambang Suryanto, S.Pd.",
            description: "Finalis OSN tingkat kabupaten bidang matematika."
          },
          {
            title: "Juara 1 FLS2N Tari Tradisional",
            level: "Provinsi",
            year: "2025",
            field: "Seni Budaya",
            coach: "Sri Rahayu, S.Sn.",
            description: "Penampilan tari tradisional terbaik pada FLS2N."
          },
          {
            title: "Medali Perak Robotic Competition",
            level: "Nasional",
            year: "2024",
            field: "Robotik",
            coach: "Dedi Kurniawan, S.T.",
            description: "Medali perak kategori sumo robot tingkat nasional."
          }
        ]
      },
      sectionOrder: 35
    },
    {
      slug: "agenda",
      title: "Agenda Sekolah",
      subtitle: "Kegiatan penting yang akan datang",
      body: "Kalender kegiatan sekolah yang dapat berubah sewaktu-waktu. Informasi terbaru diumumkan melalui pengumuman resmi sekolah.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        items: [
          {
            title: "Rapat Orang Tua/Wali Semester Ganjil",
            date: "2026-09-05",
            time: "08.00–11.00 WIB",
            location: "Aula Sekolah",
            desc: "Sosialisasi program semester ganjil dan laporan perkembangan peserta didik."
          },
          {
            title: "Penilaian Tengah Semester Ganjil",
            date: "2026-09-21",
            time: "07.00–11.30 WIB",
            location: "Ruang kelas masing-masing",
            desc: "PTS ganjil berlangsung satu pekan untuk seluruh jenjang kelas."
          },
          {
            title: "Kegiatan P5 Tema Kebekerjaan",
            date: "2026-09-28",
            time: "07.30–14.00 WIB",
            location: "Lapangan & DUDI mitra",
            desc: "Praktik langsung di industri mitra."
          }
        ]
      },
      sectionOrder: 38
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
          { title: "Lapangan Olahraga", desc: "Lapangan basket & futsal", icon: "chart" },
          {
            title: "Bengkel Praktik Otomotif",
            desc: "Bengkel standar industri",
            icon: "settings"
          },
          {
            title: "Studio Multimedia",
            desc: "Studio produksi konten & podcast",
            icon: "camera"
          }
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
          {
            title: "Kegiatan MPLS 2026",
            src: "/storage/files/public/landing/galeri-1.jpg",
            category: "Kegiatan",
            date: "2026-07-15"
          },
          {
            title: "Pembelajaran Kelas X",
            src: "/storage/files/public/landing/galeri-2.jpg",
            category: "Pembelajaran",
            date: "2026-07-20"
          },
          {
            title: "Upacara Bendera",
            src: "/storage/files/public/landing/galeri-3.jpg",
            category: "Seremonial",
            date: "2026-08-03"
          },
          {
            title: "Praktikum Jaringan TKJ",
            src: "/storage/files/public/landing/galeri-4.jpg",
            category: "Praktikum",
            date: "2026-07-22"
          },
          {
            title: "Pentas Seni dan Budaya",
            src: "/storage/files/public/landing/galeri-5.jpg",
            category: "Kegiatan",
            date: "2026-06-10"
          },
          {
            title: "Peringatan Hari Kemerdekaan",
            src: "/storage/files/public/landing/galeri-6.jpg",
            category: "Seremonial",
            date: "2025-08-17"
          },
          {
            title: "Latihan Paskibra",
            src: "/storage/files/public/landing/galeri-7.jpg",
            category: "Ekstrakurikuler",
            date: "2026-07-28"
          },
          {
            title: "Kunjungan Industri RPL",
            src: "/storage/files/public/landing/galeri-8.jpg",
            category: "Kegiatan",
            date: "2026-05-12"
          },
          {
            title: "Perpustakaan Sekolah",
            src: "/storage/files/public/landing/galeri-9.jpg",
            category: "Fasilitas",
            date: "2026-04-05"
          },
          {
            title: "Kegiatan Pramuka",
            src: "/storage/files/public/landing/galeri-10.jpg",
            category: "Ekstrakurikuler",
            date: "2026-08-01"
          }
        ]
      },
      sectionOrder: 45
    },
    {
      slug: "testimoni",
      title: "Testimoni",
      subtitle: "Apa kata mereka",
      body: "Pengalaman orang tua, siswa, dan alumni tentang sekolah kami.",
      imagePath: null,
      linkUrl: null,
      linkLabel: null,
      extra: {
        items: [
          {
            name: "Hendra Gunawan",
            role: "Orang tua siswa kelas X TKJ",
            text: "Saya sangat terbantu dengan aplikasi sekolah. Absensi, nilai, dan tagihan bisa dipantau langsung dari rumah."
          },
          {
            name: "Salsabila Putri",
            role: "Alumni RPL 2024 — Web Developer",
            text: "Bekal dari sekolah benar-benar terpakai di dunia kerja."
          },
          {
            name: "Maya Sari",
            role: "Orang tua siswa kelas XII AKL",
            text: "Guru-gurunya komunikatif dan peduli terhadap perkembangan anak."
          },
          {
            name: "Fajar Ramadhan",
            role: "Siswa kelas XI Multimedia",
            text: "Fasilitas studio dan lab komputernya lengkap."
          }
        ]
      },
      sectionOrder: 48
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
            question: "Apa saja jalur pendaftaran yang tersedia?",
            answer:
              "Tersedia jalur zonasi, afirmasi, perpindahan tugas orang tua, dan prestasi. Setiap jalur memiliki kuota dan mekanisme seleksi yang diumumkan pada portal PPDB."
          },
          {
            question: "Berapa biaya pendidikan di sekolah ini?",
            answer:
              "Sekolah menerapkan sistem uang komite yang ditetapkan dalam rapat orang tua/wali setiap tahun ajaran. Terdapat keringanan dan skema cicilan bagi keluarga yang membutuhkan."
          },
          {
            question: "Apakah ada beasiswa?",
            answer:
              "Sekolah menyediakan beasiswa prestasi dan bantuan biaya pendidikan bagi peserta didik yang memenuhi kriteria."
          },
          {
            question: "Kurikulum apa yang digunakan?",
            answer:
              "Sekolah menerapkan Kurikulum Merdeka dengan pembelajaran berbasis projek (P5) serta penguatan kecakapan digital melalui LMS."
          },
          {
            question: "Apa saja fasilitas penunjang pembelajaran?",
            answer:
              "Tersedia laboratorium komputer, bengkel praktik, studio multimedia, perpustakaan, masjid, lapangan olahraga, dan akses WiFi di seluruh area sekolah."
          },
          {
            question: "Bagaimana orang tua memantau perkembangan anak?",
            answer:
              "Orang tua dapat mengakses portal orang tua pada aplikasi untuk melihat nilai, absensi, dan tagihan anak secara real-time."
          },
          {
            question: "Apa saja kegiatan ekstrakurikuler yang bisa diikuti?",
            answer:
              "Tersedia lebih dari 15 ekstrakurikuler, antara lain Pramuka, Paskibra, futsal, basket, robotik, seni tari, paduan suara, dan English Club."
          },
          {
            question: "Bagaimana jam operasional sekolah?",
            answer:
              "Kegiatan belajar mengajar berlangsung Senin–Jumat pukul 07.00–15.00 WIB. Layanan administrasi dibuka pada jam yang sama."
          }
        ]
      },
      sectionOrder: 50
    },
    {
      slug: "ppdb-cta",
      title: "PPDB 2026/2027",
      subtitle: "Pendaftaran peserta didik baru",
      body: "Bergabunglah bersama sekolah kami. Pendaftaran dilakukan secara daring, gratis, dan transparan melalui portal PPDB resmi.",
      imagePath: null,
      linkUrl: "/ppdb",
      linkLabel: "Daftar Sekarang",
      extra: {
        periode: "1 Maret – 30 Juni 2026",
        kuota: "360 kursi",
        jalur: ["Zonasi", "Afirmasi", "Perpindahan orang tua", "Prestasi"],
        info: [
          { label: "Pendaftaran", value: "Daring melalui portal PPDB" },
          { label: "Biaya pendaftaran", value: "Gratis / Rp0" },
          { label: "Beasiswa", value: "Tersedia untuk siswa berprestasi" }
        ]
      },
      sectionOrder: 58
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
        email: "info@opensis.local",
        address: "Jl. Pendidikan No. 1",
        hours: "Senin–Jumat, 07.00–15.00 WIB",
        mapsEmbedUrl: "https://maps.google.com/maps?q=Jl.+Pendidikan+No.+1&output=embed",
        whatsapp: "6281200000000",
        instagram: "https://instagram.com/smkncontoh",
        facebook: "https://facebook.com/smkncontoh",
        youtube: "https://youtube.com/@smkncontoh"
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

export type RoleGroup =
  "siswa" | "guru" | "admin" | "superadmin" | "ortu" | "calonsiswa" | "pembimbing" | "penguji";

export const ROLE_GROUP_LABEL: Record<RoleGroup, string> = {
  siswa: "Siswa",
  guru: "Guru",
  admin: "Tata Usaha / Admin",
  superadmin: "Superadmin",
  ortu: "Orang Tua",
  calonsiswa: "Calon Siswa",
  pembimbing: "Pembimbing Industri",
  penguji: "Penguji Eksternal"
};

// ============================================================
// Status tugas — varian Badge. Default "primary" untuk status tak dikenal.
// ============================================================

export const TASK_STATUS_BADGE: Record<string, BadgeVariant> = {
  TERLAMBAT: "danger"
};
