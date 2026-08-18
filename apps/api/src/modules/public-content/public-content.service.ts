import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { readCacheTtlMs, pruneExpiredCache } from "../../common/cache.util";

/**
 * Kontrak respons modul public-content — setiap halaman landing punya endpoint
 * sendiri (PAGE MANDIRI), bukan potongan section dari GET /public/landing.
 *
 * Sumber data:
 * - Tabel domain: Prodi, Extracurricular, Achievement, SchoolProfile.
 * - LandingContent (extra JSON) untuk halaman yang belum punya tabel domain
 *   (fasilitas, galeri, testimoni, faq, kontak, struktur, tentang, ppdb).
 */

export interface ProgramPageItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  /** Pelengkap dari LandingContent 'program-keahlian' (mapping by code). */
  desc?: string | null;
  icon?: string | null;
  kompetensi?: string[];
  mitraDudi?: string[];
  prospek?: string[];
}

export interface ExtracurricularPageItem {
  id: string;
  name: string;
  description: string | null;
  schedule: Prisma.JsonValue | null;
  coachName: string | null;
}

export interface AchievementPageItem {
  id: string;
  title: string;
  level: string;
  date: Date;
  studentName: string | null;
  extracurricularName: string | null;
  certificateUrl: string | null;
}

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

export interface GalleryPage {
  title: string;
  images: GalleryImage[];
}

export interface StructurePage {
  title: string;
  groups: StructureGroup[];
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

export interface TestimonialItem {
  name: string;
  role: string | null;
  text: string | null;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface StructureGroup {
  title: string;
  items: { name: string; position: string }[];
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

export interface SchoolProfileExtraPage {
  tentang: { title: string; features: { title: string; desc: string }[] };
  visiMisi: { visi: string | null; misi: string[] };
  piagam: string;
}

export interface PpdbInfoPage {
  periode: string | null;
  kuota: string | null;
  jalur: string[];
  info: { label: string; value: string }[];
  linkUrl: string | null;
}

interface LandingSectionRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  link_url: string | null;
  extra: Prisma.JsonValue | null;
}

interface ProdiRow {
  id: string;
  code: string;
  name: string;
  short_name: string;
}

/**
 * PublicContentService — data per-halaman landing (PAGE MANDIRI).
 * Semua GET publik di-cache in-memory (TTL dari env CACHE_TTL_MS, default 300s
 * agar selaras dengan header Cache-Control: public, max-age=300 di controller).
 * Halaman berbasis tabel domain: 404 hanya untuk SchoolProfile (baris tunggal);
 * daftar lain mengembalikan array kosong. Halaman berbasis LandingContent: 404
 * bila section tidak ada, fallback struktur kosong bila extra belum terisi.
 */
@Injectable()
export class PublicContentService {
  /** TTL cache publik (ms) — default 300s (selaras header Cache-Control). */
  private readonly cacheTtlMs = readCacheTtlMs(300_000);

  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(private readonly db: PrismaClient) {}

  // ============================================================
  // Tabel domain
  // ============================================================

  async getPrograms(): Promise<ProgramPageItem[]> {
    return this.cached("programs", async () => {
      const [prodis, enrichment] = await Promise.all([
        this.db.prodi.findMany({
          where: { is_active: true },
          orderBy: { code: "asc" }
        }),
        this.loadProgramEnrichment()
      ]);
      return prodis.map((p) => this.toProgramItem(p, enrichment));
    });
  }

  async getExtracurriculars(): Promise<ExtracurricularPageItem[]> {
    return this.cached("extracurriculars", async () => {
      const rows = await this.db.extracurricular.findMany({
        orderBy: { name: "asc" },
        include: { coach: { select: { full_name: true } } }
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        schedule: r.schedule,
        coachName: r.coach?.full_name ?? null
      }));
    });
  }

  async getAchievements(): Promise<AchievementPageItem[]> {
    return this.cached("achievements", async () => {
      // M-06: endpoint PUBLIK tidak menampilkan PII siswa. Model Achievement
      // tidak punya flag publikasi/consent — konservatif: nama siswa diganti
      // anonim "Siswa" dan certificate_url dihapus dari payload publik.
      const rows = await this.db.achievement.findMany({
        orderBy: { date: "desc" },
        include: {
          extracurricular: { select: { name: true } }
        }
      });
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        level: r.level,
        date: r.date,
        studentName: "Siswa",
        extracurricularName: r.extracurricular?.name ?? null,
        certificateUrl: null
      }));
    });
  }

  async getSchoolProfile(): Promise<SchoolProfilePage> {
    return this.cached("school-profile", async () => {
      const row = await this.db.schoolProfile.findFirst();
      if (!row) {
        throw new NotFoundException("Profil sekolah tidak ditemukan.");
      }
      return {
        name: row.name,
        npsn: row.npsn,
        nss: row.nss,
        schoolType: row.school_type,
        address: row.address,
        phone: row.phone,
        email: row.email,
        logoUrl: row.logo_url
      };
    });
  }

  // ============================================================
  // Halaman berbasis LandingContent (extra JSON)
  // ============================================================

  async getFacilities(): Promise<PageSection<FacilityItem>> {
    return this.cached("facilities", async () => {
      const section = await this.sectionOr404("fasilitas");
      const items = this.arrayOf(this.extraOf(section).items).map((item) => {
        const rec = this.recordOf(item);
        return {
          title: this.stringOf(rec.title) ?? "",
          desc: this.stringOf(rec.desc),
          icon: this.stringOf(rec.icon)
        };
      });
      return { title: section.title, items };
    });
  }

  async getGallery(): Promise<GalleryPage> {
    return this.cached("gallery", async () => {
      const section = await this.sectionOr404("galeri");
      const images = this.arrayOf(this.extraOf(section).images).map((item) => {
        const rec = this.recordOf(item);
        return {
          title: this.stringOf(rec.title) ?? "",
          src: this.stringOf(rec.src) ?? "",
          category: this.stringOf(rec.category),
          date: this.stringOf(rec.date)
        };
      });
      return { title: section.title, images };
    });
  }

  async getTestimonials(): Promise<PageSection<TestimonialItem>> {
    return this.cached("testimonials", async () => {
      const section = await this.sectionOr404("testimoni");
      const items = this.arrayOf(this.extraOf(section).items).map((item) => {
        const rec = this.recordOf(item);
        return {
          name: this.stringOf(rec.name) ?? "",
          role: this.stringOf(rec.role),
          text: this.stringOf(rec.text)
        };
      });
      return { title: section.title, items };
    });
  }

  async getFaqs(): Promise<PageSection<FaqItem>> {
    return this.cached("faqs", async () => {
      const section = await this.sectionOr404("faq");
      const items = this.arrayOf(this.extraOf(section).faq).map((item) => {
        const rec = this.recordOf(item);
        return {
          question: this.stringOf(rec.question) ?? "",
          answer: this.stringOf(rec.answer) ?? ""
        };
      });
      return { title: section.title, items };
    });
  }

  async getContact(): Promise<ContactPage> {
    return this.cached("contact", async () => {
      const section = await this.sectionOr404("kontak");
      const extra = this.extraOf(section);
      return {
        phone: this.stringOf(extra.phone),
        email: this.stringOf(extra.email),
        address: this.stringOf(extra.address),
        hours: this.stringOf(extra.hours),
        whatsapp: this.stringOf(extra.whatsapp),
        instagram: this.stringOf(extra.instagram),
        facebook: this.stringOf(extra.facebook),
        youtube: this.stringOf(extra.youtube),
        mapsEmbedUrl: this.stringOf(extra.mapsEmbedUrl)
      };
    });
  }

  async getSchoolStructure(): Promise<StructurePage> {
    return this.cached("school-structure", async () => {
      const section = await this.sectionOr404("struktur-organisasi");
      const groups = this.arrayOf(this.extraOf(section).groups).map((group) => {
        const rec = this.recordOf(group);
        const items = this.arrayOf(rec.items).map((item) => {
          const member = this.recordOf(item);
          return {
            name: this.stringOf(member.name) ?? "",
            position: this.stringOf(member.position) ?? ""
          };
        });
        return { title: this.stringOf(rec.title) ?? "", items };
      });
      return { title: section.title, groups };
    });
  }

  async getSchoolProfileExtra(): Promise<SchoolProfileExtraPage> {
    return this.cached("school-profile-extra", async () => {
      const [tentang, visiMisi, piagam] = await Promise.all([
        this.sectionOr404("tentang"),
        this.sectionOr404("visi-misi"),
        this.sectionOr404("piagam")
      ]);
      const tentangExtra = this.extraOf(tentang);
      const visiMisiExtra = this.extraOf(visiMisi);
      const features = this.arrayOf(tentangExtra.features).map((item) => {
        const rec = this.recordOf(item);
        return { title: this.stringOf(rec.title) ?? "", desc: this.stringOf(rec.desc) ?? "" };
      });
      return {
        tentang: { title: tentang.title, features },
        visiMisi: {
          visi: this.stringOf(visiMisiExtra.visi),
          misi: this.arrayOf(visiMisiExtra.misi)
            .map((m) => this.stringOf(m))
            .filter((m): m is string => m !== null)
        },
        piagam: piagam.body
      };
    });
  }

  async getPpdbInfo(): Promise<PpdbInfoPage> {
    return this.cached("ppdb-info", async () => {
      const section = await this.sectionOr404("ppdb-cta");
      const extra = this.extraOf(section);
      const jalur = this.arrayOf(extra.jalur)
        .map((j) => this.stringOf(j))
        .filter((j): j is string => j !== null);
      const info = this.arrayOf(extra.info).map((item) => {
        const rec = this.recordOf(item);
        return {
          label: this.stringOf(rec.label) ?? "",
          value: this.stringOf(rec.value) ?? ""
        };
      });
      return {
        periode: this.stringOf(extra.periode),
        kuota: this.stringOf(extra.kuota),
        jalur,
        info,
        linkUrl: this.stringOf(extra.linkUrl) ?? section.link_url
      };
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }
    const value = await loader();
    pruneExpiredCache(this.cache);
    this.cache.set(key, { value, expiresAt: now + this.cacheTtlMs });
    return value;
  }

  /** Ambil section landing published; 404 bila tidak ada. */
  private async sectionOr404(slug: string): Promise<LandingSectionRow> {
    const row = await this.db.landingContent.findFirst({
      where: { slug, is_published: true }
    });
    if (!row) {
      throw new NotFoundException(`Section '${slug}' tidak ditemukan.`);
    }
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      body: row.body,
      link_url: row.link_url,
      extra: row.extra
    };
  }

  /**
   * Pelengkap program keahlian dari LandingContent 'program-keahlian'
   * (extra.programs). Diindeks per kode/short_name/title (normalisasi) agar
   * bisa dicocokkan dengan Prodi.code. Entri tanpa kode (title saja) tetap
   * dapat dicocokkan via normalisasi judul.
   */
  private async loadProgramEnrichment(): Promise<Map<string, Record<string, unknown>>> {
    const section = await this.db.landingContent.findFirst({
      where: { slug: "program-keahlian", is_published: true }
    });
    const map = new Map<string, Record<string, unknown>>();
    if (!section) {
      return map;
    }
    for (const program of this.arrayOf(this.extraOf(section).programs)) {
      const rec = this.recordOf(program);
      const code = this.stringOf(rec.code);
      const shortName = this.stringOf(rec.shortName);
      const title = this.stringOf(rec.title);
      if (code) map.set(code.toUpperCase(), rec);
      if (shortName) map.set(shortName.toUpperCase(), rec);
      if (title) map.set(this.normalizeKey(title), rec);
    }
    return map;
  }

  private toProgramItem(
    row: ProdiRow,
    enrichment: Map<string, Record<string, unknown>>
  ): ProgramPageItem {
    const base: ProgramPageItem = {
      id: row.id,
      code: row.code,
      name: row.name,
      shortName: row.short_name
    };
    const enriched =
      enrichment.get(row.code.toUpperCase()) ??
      enrichment.get(row.short_name.toUpperCase()) ??
      enrichment.get(this.normalizeKey(row.name)) ??
      null;
    if (!enriched) {
      return base;
    }
    return {
      ...base,
      desc: this.stringOf(enriched.desc),
      icon: this.stringOf(enriched.icon),
      kompetensi: this.stringsOf(enriched.kompetensi),
      mitraDudi: this.stringsOf(enriched.mitra_dudi),
      prospek: this.stringsOf(enriched.prospek)
    };
  }

  /** Normalisasi teks untuk pencocokan kode/judul (huruf kecil, tanpa simbol). */
  private normalizeKey(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  /** Baca extra JSON section sebagai object; null/array → {}. */
  private extraOf(row: LandingSectionRow): Record<string, unknown> {
    if (!row.extra || typeof row.extra !== "object" || Array.isArray(row.extra)) {
      return {};
    }
    return row.extra as Record<string, unknown>;
  }

  private arrayOf(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private recordOf(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringOf(value: unknown): string | null {
    return typeof value === "string" ? value : null;
  }

  private stringsOf(value: unknown): string[] | undefined {
    const items = this.arrayOf(value)
      .map((item) => this.stringOf(item))
      .filter((item): item is string => item !== null);
    return items.length > 0 ? items : undefined;
  }
}
