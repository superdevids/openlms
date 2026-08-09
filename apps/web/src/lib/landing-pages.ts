/**
 * Helper data halaman landing MANDIRI (PAGE MANDIRI) — memanggil endpoint
 * publik PER-HALAMAN (apps/api PublicContentController), bukan potongan
 * section dari GET /public/landing.
 *
 * Server-safe: setiap getter try/catch + fallback kosong/placeholder agar
 * halaman tetap render walau API mati / section belum diisi.
 * ISR: fetch memakai `next: { revalidate: 30 }` (selaras page.tsx).
 * Base URL mengikuti api-client: NEXT_PUBLIC_API_BASE ?? "/api/v1".
 */

import { API_BASE } from "@/lib/api-client";
import { API_TIMEOUT_MS, APP_NAME } from "@/lib/constants";

const REVALIDATE_SECONDS = 30;

/**
 * true saat `next build` dan API_BASE relatif ("/api/v1"): fetch server-side
 * tidak punya origin untuk di-resolve sehingga menggantung (build timeout).
 * Runtime (ISR/dev) fetch relatif di-resolve Next ke origin request — tetap
 * dieksekusi. Build cukup memakai fallback; data segar diambil saat runtime.
 */
function isBuildWithoutApiOrigin(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build" && !/^https?:\/\//i.test(API_BASE);
}

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  if (isBuildWithoutApiOrigin()) return fallback;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: controller.signal
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// Tipe respons endpoint publik per-halaman (kontrak apps/api
// modules/public-content/public-content.service.ts).
// ============================================================

export interface SchoolProfilePage {
  name: string;
  npsn: string;
  nss: string | null;
  schoolType: string;
  address: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
}

export interface PageSection<T> {
  title: string;
  items: T[];
}

export interface ProfileFeature {
  title: string;
  desc: string;
}

export interface SchoolProfileExtraPage {
  tentang: { title: string; features: ProfileFeature[] };
  visiMisi: { visi: string | null; misi: string[] };
  piagam: string;
}

export interface StructureMember {
  name: string;
  position: string;
}

export interface StructureGroup {
  title: string;
  items: StructureMember[];
}

export interface SchoolStructurePage {
  title: string;
  groups: StructureGroup[];
}

export interface ContactPage {
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  mapsEmbedUrl: string | null;
}

export interface ProgramPageItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  desc?: string | null;
  icon?: string | null;
  kompetensi?: string[];
  mitraDudi?: string[];
  prospek?: string[];
}

export interface FacilityItem {
  title: string;
  desc: string | null;
  icon: string | null;
}

export interface GalleryImage {
  title: string;
  src: string;
  category: string | null;
  date: string | null;
}

export interface GalleryPage {
  title: string;
  images: GalleryImage[];
}

export interface TestimonialItem {
  name: string;
  role: string | null;
  text: string | null;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PpdbInfoPage {
  periode: string | null;
  kuota: string | null;
  jalur: string[];
  info: { label: string; value: string }[];
  linkUrl: string | null;
}

export interface AchievementPageItem {
  id: string;
  title: string;
  level: string;
  date: string | null;
  studentName: string | null;
  extracurricularName: string | null;
  certificateUrl: string | null;
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

export interface ExtracurricularPageItem {
  id: string;
  name: string;
  description: string | null;
  /** Prisma.JsonValue — null, atau array { day, time } (lihat seed). */
  schedule: unknown;
  coachName: string | null;
}

// ============================================================
// Fallback aman (API offline / section belum diisi).
// ============================================================

const FALLBACK_SCHOOL_PROFILE: SchoolProfilePage = {
  name: APP_NAME,
  npsn: "",
  nss: null,
  schoolType: "",
  address: "",
  phone: null,
  email: null,
  logoUrl: null
};

const FALLBACK_SCHOOL_PROFILE_EXTRA: SchoolProfileExtraPage = {
  tentang: {
    title: "Tentang Sekolah",
    features: [
      { title: "Pembelajaran modern", desc: "Kurikulum aktif, kreatif, dan menyenangkan." },
      { title: "Teknologi terpadu", desc: "LMS & SIS dalam satu platform digital." },
      { title: "Karakter unggul", desc: "Pembiasaan positif dan penguatan budi pekerti." }
    ]
  },
  visiMisi: {
    visi: "Terwujudnya peserta didik yang beriman, bertakwa, cerdas, terampil, mandiri, dan berwawasan lingkungan.",
    misi: [
      "Menyelenggarakan pembelajaran aktif, kreatif, dan menyenangkan.",
      "Menumbuhkan budaya literasi dan numerasi.",
      "Membangun karakter peserta didik melalui pembiasaan positif.",
      "Mengembangkan bakat dan minat peserta didik."
    ]
  },
  piagam:
    "Piagam pendirian dan akreditasi sekolah sebagai pengakuan resmi atas penyelenggaraan pendidikan."
};

const FALLBACK_SCHOOL_STRUCTURE: SchoolStructurePage = {
  title: "Struktur Organisasi",
  groups: []
};

const FALLBACK_CONTACT: ContactPage = {
  phone: null,
  email: null,
  address: null,
  hours: null,
  whatsapp: null,
  instagram: null,
  facebook: null,
  youtube: null,
  mapsEmbedUrl: null
};

const FALLBACK_FACILITIES: PageSection<FacilityItem> = { title: "Fasilitas", items: [] };

const FALLBACK_GALLERY: GalleryPage = { title: "Galeri", images: [] };

const FALLBACK_TESTIMONIALS: PageSection<TestimonialItem> = { title: "Testimoni", items: [] };

const FALLBACK_FAQS: PageSection<FaqItem> = { title: "Pertanyaan Umum", items: [] };

const FALLBACK_PPDB_INFO: PpdbInfoPage = {
  periode: null,
  kuota: null,
  jalur: [],
  info: [],
  linkUrl: "/ppdb"
};

// ============================================================
// Getter per-halaman (dipakai di Server Components).
// ============================================================

export const getSchoolProfile = (): Promise<SchoolProfilePage> =>
  fetchJson("/public/school-profile", FALLBACK_SCHOOL_PROFILE);

export const getSchoolProfileExtra = (): Promise<SchoolProfileExtraPage> =>
  fetchJson("/public/school-profile-extra", FALLBACK_SCHOOL_PROFILE_EXTRA);

export const getSchoolStructure = (): Promise<SchoolStructurePage> =>
  fetchJson("/public/school-structure", FALLBACK_SCHOOL_STRUCTURE);

export const getContact = (): Promise<ContactPage> =>
  fetchJson("/public/contact", FALLBACK_CONTACT);

export const getPrograms = (): Promise<ProgramPageItem[]> =>
  fetchJson("/public/programs", [] as ProgramPageItem[]);

export const getFacilities = (): Promise<PageSection<FacilityItem>> =>
  fetchJson("/public/facilities", FALLBACK_FACILITIES);

export const getGallery = (): Promise<GalleryPage> =>
  fetchJson("/public/gallery", FALLBACK_GALLERY);

export const getTestimonials = (): Promise<PageSection<TestimonialItem>> =>
  fetchJson("/public/testimonials", FALLBACK_TESTIMONIALS);

export const getFaqs = (): Promise<PageSection<FaqItem>> =>
  fetchJson("/public/faqs", FALLBACK_FAQS);

export const getPpdbInfo = (): Promise<PpdbInfoPage> =>
  fetchJson("/public/ppdb-info", FALLBACK_PPDB_INFO);

export const getAchievements = (): Promise<AchievementPageItem[]> =>
  fetchJson("/public/achievements", [] as AchievementPageItem[]);

export const getExtracurriculars = async (): Promise<ExtracurricularPageItem[]> => {
  const data = await fetchJson<unknown>("/public/extracurriculars", []);
  return Array.isArray(data) ? (data as ExtracurricularPageItem[]) : [];
};

export const getLandingNews = (): Promise<NewsItem[]> =>
  fetchJson("/public/landing/berita", [] as NewsItem[]);
