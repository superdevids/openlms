import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import { CreateNewsDto } from "./dto/create-news.dto";
import { UpdateNewsDto } from "./dto/update-news.dto";
import { UpsertLandingContentDto } from "./dto/upsert-landing-content.dto";

export interface LandingContentPublic {
  slug: string;
  title: string;
  subtitle: string | null;
  body: string;
  imagePath: string | null;
  sectionOrder: number;
}

export interface LandingContentView extends LandingContentPublic {
  id: string;
  isPublished: boolean;
  updatedBy: string | null;
  updatedAt: Date;
}

export interface NewsArticlePublic {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImagePath: string | null;
  author: string | null;
  publishedAt: Date | null;
}

export interface NewsArticleView extends NewsArticlePublic {
  body: string;
  isPublished: boolean;
  updatedAt: Date;
}

export interface LandingPageView {
  sections: LandingContentPublic[];
  berita: NewsArticlePublic[];
  beritaTotal: number;
}

interface LandingContentRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  body: string;
  image_path: string | null;
  section_order: number;
  is_published: boolean;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface NewsArticleRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image_path: string | null;
  author: string | null;
  published_at: Date | null;
  is_published: boolean;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Slugify ramah Bahasa Indonesia: huruf kecil, spasi/simbol → "-". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * LandingService — konten landing page sekolah (single-school).
 * GET publik: hanya baris is_published=true. Mutasi (landing:write:school)
 * mencatat AuditLog dengan entity "landing_content" / "news_article".
 */
@Injectable()
export class LandingService {
  private readonly logger = new Logger(LandingService.name);

  constructor(private readonly db: PrismaClient) {}

  // ============================================================
  // Publik (tanpa auth)
  // ============================================================

  async getPublicLanding(): Promise<LandingPageView> {
    const [sections, berita] = await Promise.all([
      this.db.landingContent.findMany({
        where: { is_published: true },
        orderBy: [{ section_order: "asc" }, { updated_at: "desc" }]
      }),
      this.db.newsArticle.findMany({
        where: { is_published: true, published_at: { not: null } },
        orderBy: [{ published_at: "desc" }],
        take: 6
      })
    ]);
    return {
      sections: sections.map((s) => this.toLandingPublic(s)),
      berita: berita.map((n) => this.toNewsPublic(n)),
      beritaTotal: berita.length
    };
  }

  async getPublicNews(): Promise<NewsArticlePublic[]> {
    const rows = await this.db.newsArticle.findMany({
      where: { is_published: true, published_at: { not: null } },
      orderBy: [{ published_at: "desc" }]
    });
    return rows.map((n) => this.toNewsPublic(n));
  }

  async getPublicNewsBySlug(slug: string): Promise<NewsArticleView> {
    const row = await this.db.newsArticle.findFirst({
      where: { slug, is_published: true }
    });
    if (!row) {
      throw new NotFoundException("Berita tidak ditemukan.");
    }
    return this.toNewsView(row);
  }

  // ============================================================
  // Admin (landing:write:school)
  // ============================================================

  async getAdminLanding(): Promise<LandingContentView[]> {
    const rows = await this.db.landingContent.findMany({
      orderBy: [{ section_order: "asc" }, { updated_at: "desc" }]
    });
    return rows.map((r) => this.toLandingView(r));
  }

  async getAdminNews(): Promise<NewsArticleView[]> {
    const rows = await this.db.newsArticle.findMany({
      orderBy: [{ published_at: "desc" }, { updated_at: "desc" }]
    });
    return rows.map((r) => this.toNewsView(r));
  }

  async upsertLandingContent(
    slug: string,
    dto: UpsertLandingContentDto,
    actorId: string,
    ip?: string
  ): Promise<LandingContentView> {
    const existing = await this.db.landingContent.findUnique({ where: { slug } });
    if (existing) {
      const before = this.toLandingPublic(existing);
      const updated = await this.db.landingContent.update({
        where: { slug },
        data: {
          title: dto.title,
          subtitle: dto.subtitle !== undefined ? dto.subtitle : existing.subtitle,
          body: dto.body,
          image_path: dto.imagePath !== undefined ? dto.imagePath : existing.image_path,
          section_order: dto.sectionOrder ?? existing.section_order,
          is_published: dto.isPublished ?? existing.is_published,
          updated_by: actorId
        }
      });
      await this.audit(
        AuditAction.UPDATE,
        "landing_content",
        updated.id,
        { before, after: this.toLandingPublic(updated) },
        actorId,
        ip
      );
      return this.toLandingView(updated);
    }

    const created = await this.db.landingContent.create({
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        body: dto.body,
        image_path: dto.imagePath ?? null,
        section_order: dto.sectionOrder ?? 0,
        is_published: dto.isPublished ?? true,
        updated_by: actorId
      }
    });
    await this.audit(
      AuditAction.CREATE,
      "landing_content",
      created.id,
      { before: null, after: this.toLandingPublic(created) },
      actorId,
      ip
    );
    return this.toLandingView(created);
  }

  async createNews(dto: CreateNewsDto, actorId: string, ip?: string): Promise<NewsArticleView> {
    const slug = await this.uniqueSlug(dto.slug ? slugify(dto.slug) : slugify(dto.title));
    const publishedAt = dto.publishedAt
      ? new Date(dto.publishedAt)
      : dto.isPublished
        ? new Date()
        : undefined;
    const created = await this.db.newsArticle.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt ?? null,
        body: dto.body,
        cover_image_path: dto.coverImagePath ?? null,
        author: dto.author ?? null,
        published_at: publishedAt,
        is_published: dto.isPublished ?? false,
        updated_by: actorId
      }
    });
    await this.audit(
      AuditAction.CREATE,
      "news_article",
      created.id,
      { before: null, after: this.toNewsView(created) },
      actorId,
      ip
    );
    return this.toNewsView(created);
  }

  async updateNews(
    id: string,
    dto: UpdateNewsDto,
    actorId: string,
    ip?: string
  ): Promise<NewsArticleView> {
    const existing = await this.db.newsArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Berita tidak ditemukan.");
    }
    const before = this.toNewsView(existing);
    const nextSlug =
      dto.slug !== undefined ? await this.uniqueSlug(slugify(dto.slug), id) : undefined;
    const updated = await this.db.newsArticle.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        slug: nextSlug ?? existing.slug,
        excerpt: dto.excerpt !== undefined ? dto.excerpt : existing.excerpt,
        body: dto.body ?? existing.body,
        cover_image_path:
          dto.coverImagePath !== undefined ? dto.coverImagePath : existing.cover_image_path,
        author: dto.author !== undefined ? dto.author : existing.author,
        published_at:
          dto.publishedAt !== undefined
            ? new Date(dto.publishedAt)
            : dto.isPublished && !existing.published_at
              ? new Date()
              : existing.published_at,
        is_published: dto.isPublished ?? existing.is_published,
        updated_by: actorId
      }
    });
    await this.audit(
      AuditAction.UPDATE,
      "news_article",
      updated.id,
      { before, after: this.toNewsView(updated) },
      actorId,
      ip
    );
    return this.toNewsView(updated);
  }

  async deleteNews(id: string, actorId: string, ip?: string): Promise<void> {
    const existing = await this.db.newsArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Berita tidak ditemukan.");
    }
    const before = this.toNewsView(existing);
    await this.db.newsArticle.delete({ where: { id } });
    await this.audit(AuditAction.DELETE, "news_article", id, { before, after: null }, actorId, ip);
  }

  // ============================================================
  // Helpers
  // ============================================================

  /** Slug unik: bila konflik, tambahkan -2, -3, dst. */
  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = base || "berita";
    let candidate = root;
    let n = 1;
    while (true) {
      const exists = await this.db.newsArticle.findFirst({
        where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }
      });
      if (!exists) return candidate;
      n += 1;
      candidate = `${root}-${n}`;
      if (n > 50) {
        throw new ConflictException("Gagal membuat slug unik untuk berita.");
      }
    }
  }

  private async audit(
    action: AuditAction,
    entity: string,
    entityId: string,
    data: { before: unknown; after: unknown },
    actorId: string,
    ip?: string
  ): Promise<void> {
    try {
      await this.db.auditLog.create({
        data: {
          actor_id: actorId,
          action,
          entity,
          entity_id: entityId,
          before: data.before === null ? undefined : (data.before as Prisma.InputJsonValue),
          after: data.after === null ? undefined : (data.after as Prisma.InputJsonValue),
          ip_address: ip
        }
      });
    } catch (err) {
      // Audit gagal tidak menggagalkan mutasi utama — cukup log.
      this.logger.warn(`audit ${entity} gagal: ${(err as Error).message}`);
    }
  }

  private toLandingPublic(row: LandingContentRow): LandingContentPublic {
    return {
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      body: row.body,
      imagePath: row.image_path,
      sectionOrder: row.section_order
    };
  }

  private toLandingView(row: LandingContentRow): LandingContentView {
    return {
      ...this.toLandingPublic(row),
      id: row.id,
      isPublished: row.is_published,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at
    };
  }

  private toNewsPublic(row: NewsArticleRow): NewsArticlePublic {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      coverImagePath: row.cover_image_path,
      author: row.author,
      publishedAt: row.published_at
    };
  }

  private toNewsView(row: NewsArticleRow): NewsArticleView {
    return {
      ...this.toNewsPublic(row),
      body: row.body,
      isPublished: row.is_published,
      updatedAt: row.updated_at
    };
  }
}
