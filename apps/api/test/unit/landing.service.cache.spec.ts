/**
 * Unit test — LandingService: cache publik (TTL + invalidate), getPublicNews
 * filter kategori, uniqueSlug konflik > batas, updateNews slug unik.
 */
import "reflect-metadata";
import { ConflictException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@opensis/database";
import { LandingService, slugify } from "../../src/modules/landing/landing.service";

const ACTOR = "usr_admin1";

function landingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "land_1",
    slug: "hero",
    title: "Selamat Datang",
    subtitle: null,
    body: "Isi hero",
    image_path: null,
    link_url: null,
    link_label: null,
    extra: null,
    section_order: 0,
    is_published: true,
    updated_by: ACTOR,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides
  };
}

function newsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "news_1",
    title: "Berita 1",
    slug: "berita-1",
    excerpt: null,
    body: "Isi",
    cover_image_path: null,
    category: null,
    author: null,
    published_at: new Date("2026-07-01T00:00:00.000Z"),
    is_published: true,
    updated_by: ACTOR,
    created_at: new Date("2026-06-01T00:00:00.000Z"),
    updated_at: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides
  };
}

function createMockPrisma() {
  const landingContent = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  const newsArticle = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };
  const auditLog = { create: jest.fn() };
  const prisma = {
    landingContent,
    newsArticle,
    auditLog
  } as unknown as PrismaClient;
  return { prisma, landingContent, newsArticle, auditLog };
}

describe("LandingService — cache & slug edge", () => {
  describe("slugify", () => {
    it("menghapus semua karakter non-alfanumerik, tanpa leading/trailing dash", () => {
      expect(slugify("...!!!...")).toBe("");
      expect(slugify("-tahun-")).toBe("tahun");
      expect(slugify("100% Siap!" as never)).toBe("100-siap");
    });

    it("menangani unicode (di-strip karena hanya a-z0-9)", () => {
      expect(slugify("Prestasi Siswa 🏆 Juara 1")).toBe("prestasi-siswa-juara-1");
    });

    it("membatasi 120 karakter", () => {
      const long = slugify(`${"x".repeat(200)}-${"y".repeat(100)}`);
      expect(long.length).toBeLessThanOrEqual(120);
    });
  });

  describe("getPublicLanding cache", () => {
    it("meng-cache landing sampai TTL (findMany sekali untuk 2 panggilan)", async () => {
      const { prisma, landingContent, newsArticle } = createMockPrisma();
      landingContent.findMany.mockResolvedValue([landingRow()]);
      newsArticle.findMany.mockResolvedValue([newsRow()]);
      const service = new LandingService(prisma);

      const a = await service.getPublicLanding();
      const b = await service.getPublicLanding();

      expect(a.sections).toHaveLength(1);
      expect(b).toEqual(a);
      expect(landingContent.findMany).toHaveBeenCalledTimes(1);
    });

    it("berita dibatasi take 6 (public landing)", async () => {
      const { prisma, landingContent, newsArticle } = createMockPrisma();
      landingContent.findMany.mockResolvedValue([]);
      newsArticle.findMany.mockResolvedValue([]);
      const service = new LandingService(prisma);

      await service.getPublicLanding();
      expect(newsArticle.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 6 }));
    });
  });

  describe("getPublicNews", () => {
    it("cache news per query (tanpa kategori lalu kategori)", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findMany.mockResolvedValue([newsRow()]);
      const service = new LandingService(prisma);

      const all = await service.getPublicNews();
      const again = await service.getPublicNews();
      expect(again).toEqual(all);
      expect(newsArticle.findMany).toHaveBeenCalledTimes(1);
    });

    it("kategori kosong/spasi tidak dimasukkan ke filter", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findMany.mockResolvedValue([]);
      const service = new LandingService(prisma);

      await service.getPublicNews("   ");
      const where = newsArticle.findMany.mock.calls[0][0].where;
      expect(where.category).toBeUndefined();
    });

    it("kategori valid ditambahkan ke filter", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findMany.mockResolvedValue([]);
      const service = new LandingService(prisma);

      await service.getPublicNews("  Prestasi  ");
      const where = newsArticle.findMany.mock.calls[0][0].where;
      expect(where.category).toBe("Prestasi");
    });
  });

  describe("uniqueSlug", () => {
    it("createNews menaikkan suffix hingga slug unik (berita-1-2, dst)", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findFirst
        .mockResolvedValueOnce(newsRow()) // berita-1
        .mockResolvedValueOnce(newsRow()) // berita-1-2
        .mockResolvedValueOnce(null); // berita-1-3 bebas
      newsArticle.create.mockResolvedValue(newsRow({ id: "news_3" }));
      const service = new LandingService(prisma);

      await service.createNews({ title: "Berita 1", body: "Isi" }, ACTOR);
      const createArg = newsArticle.create.mock.calls[0][0] as {
        data: { slug: string };
      };
      expect(createArg.data.slug).toBe("berita-1-3");
    });

    it("updateNews membuat slug unik dengan excludeId dirinya sendiri", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findUnique.mockResolvedValue(newsRow({ id: "news_1" }));
      newsArticle.findFirst.mockResolvedValue(null); // slug bebas
      newsArticle.update.mockResolvedValue(newsRow({ id: "news_1", slug: "berita-baru" }));
      const service = new LandingService(prisma);

      const result = await service.updateNews("news_1", { slug: "Berita Baru" }, ACTOR);
      expect(result.slug).toBe("berita-baru");
      expect(newsArticle.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ slug: "berita-baru", id: { not: "news_1" } })
        })
      );
    });

    it("uniqueSlug melempar ConflictException setelah 50 percobaan", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findFirst.mockResolvedValue(newsRow()); // selalu konflik
      newsArticle.create.mockResolvedValue(newsRow({ id: "news_x" }));
      const service = new LandingService(prisma);

      await expect(
        service.createNews({ title: "Sama", body: "Isi" }, ACTOR)
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("mutasi invalidasi cache", () => {
    it("updateNews meng-invalidate cache publik (findMany lagi setelah update)", async () => {
      const { prisma, newsArticle, landingContent } = createMockPrisma();
      landingContent.findMany.mockResolvedValue([]);
      newsArticle.findMany.mockResolvedValue([newsRow()]);
      const service = new LandingService(prisma);

      await service.getPublicNews();
      expect(newsArticle.findMany).toHaveBeenCalledTimes(1);

      // Mutasi berita -> cache dibuang
      newsArticle.findUnique.mockResolvedValue(newsRow());
      newsArticle.findFirst.mockResolvedValue(null);
      newsArticle.update.mockResolvedValue(newsRow({ title: "Revisi" }));
      await service.updateNews("news_1", { title: "Revisi" }, ACTOR);

      await service.getPublicNews();
      expect(newsArticle.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("getPublicNewsBySlug", () => {
    it("hanya berita published (where slug + is_published)", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findFirst.mockResolvedValue(null);
      const service = new LandingService(prisma);

      await expect(service.getPublicNewsBySlug("rahasia")).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(newsArticle.findFirst).toHaveBeenCalledWith({
        where: { slug: "rahasia", is_published: true }
      });
    });
  });
});
