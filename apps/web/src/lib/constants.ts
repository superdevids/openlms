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
export const LANDING_DEFAULT_SECTION_ORDER = ["hero", "tentang", "piagam", "kontak"] as const;

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
  sectionOrder: number;
}

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImagePath: string | null;
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
      sectionOrder: 0
    },
    {
      slug: "tentang",
      title: "Tentang Kami",
      subtitle: "Profil singkat sekolah",
      body: "Kami adalah sekolah yang berkomitmen mencetak generasi cerdas, berkarakter, dan siap menghadapi tantangan zaman. Kurikulum kami mengintegrasikan penguasaan ilmu pengetahuan, penguatan karakter, dan kecakapan digital agar setiap peserta didik berkembang optimal.",
      imagePath: null,
      sectionOrder: 10
    },
    {
      slug: "piagam",
      title: "Visi, Misi & Piagam Sekolah",
      subtitle: "Arah dan komitmen kami",
      body: "Visi:\nTerwujudnya peserta didik yang beriman, bertakwa, cerdas, terampil, mandiri, dan berwawasan lingkungan.\n\nMisi:\n1. Menyelenggarakan pembelajaran aktif, kreatif, dan menyenangkan.\n2. Menumbuhkan budaya literasi dan numerasi.\n3. Membangun karakter peserta didik melalui pembiasaan positif.\n4. Mengembangkan bakat dan minat peserta didik.\n5. Mewujudkan lingkungan sekolah yang sehat, hijau, dan ramah anak.",
      imagePath: null,
      sectionOrder: 20
    },
    {
      slug: "kontak",
      title: "Hubungi Kami",
      subtitle: "Informasi kontak sekolah",
      body: "Alamat: Jl. Pendidikan No. 1\nTelepon: 021-0000000\nEmail: info@openlms.local\nJam layanan: Senin–Jumat, 07.00–15.00 WIB",
      imagePath: null,
      sectionOrder: 40
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
