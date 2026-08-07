import { NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@openlms/database";
import { LandingService, slugify } from "./landing.service";

const ACTOR = "usr_admin1";
const IP = "127.0.0.1";

function landingRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "land_1",
    slug: "hero",
    title: "Selamat Datang",
    subtitle: "Subjudul",
    body: "Isi hero",
    image_path: null,
    section_order: 0,
    is_published: true,
    updated_by: ACTOR,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides
  };
}

function newsRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "news_1",
    title: "Berita 1",
    slug: "berita-1",
    excerpt: "Ringkasan",
    body: "Isi berita",
    cover_image_path: null,
    author: "Tim Sekolah",
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

describe("LandingService", () => {
  describe("slugify", () => {
    it("mengubah judul menjadi slug huruf kecil", () => {
      expect(slugify("PPDB Tahun Ajaran 2026/2027 Resmi Dibuka!")).toBe(
        "ppdb-tahun-ajaran-2026-2027-resmi-dibuka"
      );
    });
    it("menangani simbol dan spasi berlebih", () => {
      expect(slugify("  Selamat -- Datang & Belajar  ")).toBe("selamat-datang-belajar");
    });
    it("membatasi panjang maksimal", () => {
      expect(slugify("a".repeat(300)).length).toBeLessThanOrEqual(120);
    });
  });

  describe("getPublicLanding", () => {
    it("mengembalikan section published + berita published terbaru", async () => {
      const { prisma, landingContent, newsArticle } = createMockPrisma();
      landingContent.findMany.mockResolvedValue([landingRow()]);
      newsArticle.findMany.mockResolvedValue([newsRow()]);
      const service = new LandingService(prisma);

      const view = await service.getPublicLanding();

      expect(view.sections).toHaveLength(1);
      expect(view.sections[0]!.slug).toBe("hero");
      expect(view.berita).toHaveLength(1);
      expect(view.berita[0]!.title).toBe("Berita 1");
      expect(landingContent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_published: true } })
      );
      expect(newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_published: true, published_at: { not: null } }
        })
      );
    });
  });

  describe("getPublicNewsBySlug", () => {
    it("mengembalikan berita published", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findFirst.mockResolvedValue(newsRow());
      const service = new LandingService(prisma);

      const news = await service.getPublicNewsBySlug("berita-1");

      expect(news.body).toBe("Isi berita");
      expect(newsArticle.findFirst).toHaveBeenCalledWith({
        where: { slug: "berita-1", is_published: true }
      });
    });

    it("melempar NotFoundException saat berita tidak ada", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findFirst.mockResolvedValue(null);
      const service = new LandingService(prisma);

      await expect(service.getPublicNewsBySlug("tidak-ada")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe("upsertLandingContent", () => {
    it("membuat section baru bila slug belum ada + audit CREATE", async () => {
      const { prisma, landingContent, auditLog } = createMockPrisma();
      landingContent.findUnique.mockResolvedValue(null);
      landingContent.create.mockResolvedValue(landingRow({ id: "land_new" }));
      const service = new LandingService(prisma);

      const result = await service.upsertLandingContent(
        "kontak",
        { title: "Hubungi Kami", subtitle: "Info", body: "Alamat", sectionOrder: 40 },
        ACTOR,
        IP
      );

      expect(result.id).toBe("land_new");
      expect(landingContent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: "kontak" }) })
      );
      expect(auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "CREATE" }) })
      );
    });

    it("memperbarui section yang sudah ada + audit UPDATE", async () => {
      const { prisma, landingContent, auditLog } = createMockPrisma();
      landingContent.findUnique.mockResolvedValue(landingRow());
      landingContent.update.mockResolvedValue(
        landingRow({ title: "Judul Baru", is_published: false })
      );
      const service = new LandingService(prisma);

      const result = await service.upsertLandingContent(
        "hero",
        { title: "Judul Baru", body: "Isi baru", isPublished: false },
        ACTOR,
        IP
      );

      expect(result.title).toBe("Judul Baru");
      expect(result.isPublished).toBe(false);
      expect(landingContent.update).toHaveBeenCalledWith({
        where: { slug: "hero" },
        data: expect.objectContaining({ title: "Judul Baru", updated_by: ACTOR })
      });
      expect(auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "UPDATE" }) })
      );
    });
  });

  describe("createNews", () => {
    it("membuat slug dari judul dan mengisi published_at saat publish", async () => {
      const { prisma, newsArticle, auditLog } = createMockPrisma();
      newsArticle.findFirst.mockResolvedValue(null);
      newsArticle.create.mockResolvedValue(newsRow({ id: "news_new", is_published: true }));
      const service = new LandingService(prisma);

      const result = await service.createNews(
        { title: "PPDB Dibuka", body: "Isi", isPublished: true },
        ACTOR,
        IP
      );

      expect(result.id).toBe("news_new");
      const createArg = newsArticle.create.mock.calls[0][0];
      expect(createArg.data.slug).toBe("ppdb-dibuka");
      expect(createArg.data.published_at).toBeInstanceOf(Date);
      expect(auditLog.create).toHaveBeenCalled();
    });

    it("menambahkan suffix saat slug konflik", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findFirst.mockResolvedValueOnce(newsRow()).mockResolvedValueOnce(null);
      newsArticle.create.mockResolvedValue(newsRow({ id: "news_2" }));
      const service = new LandingService(prisma);

      await service.createNews({ title: "Berita 1", body: "Isi" }, ACTOR);

      const createArg = newsArticle.create.mock.calls[0][0];
      expect(createArg.data.slug).toBe("berita-1-2");
    });
  });

  describe("updateNews", () => {
    it("melempar NotFoundException saat id tidak ada", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findUnique.mockResolvedValue(null);
      const service = new LandingService(prisma);

      await expect(service.updateNews("missing", { title: "X" }, ACTOR)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("memperbarui field dan mencatat audit", async () => {
      const { prisma, newsArticle, auditLog } = createMockPrisma();
      newsArticle.findUnique.mockResolvedValue(newsRow());
      newsArticle.findFirst.mockResolvedValue(null);
      newsArticle.update.mockResolvedValue(newsRow({ title: "Judul Revisi" }));
      const service = new LandingService(prisma);

      const result = await service.updateNews(
        "news_1",
        { title: "Judul Revisi", isPublished: true },
        ACTOR
      );

      expect(result.title).toBe("Judul Revisi");
      expect(auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "UPDATE" }) })
      );
    });
  });

  describe("deleteNews", () => {
    it("melempar NotFoundException saat id tidak ada", async () => {
      const { prisma, newsArticle } = createMockPrisma();
      newsArticle.findUnique.mockResolvedValue(null);
      const service = new LandingService(prisma);

      await expect(service.deleteNews("missing", ACTOR)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("menghapus berita + audit DELETE", async () => {
      const { prisma, newsArticle, auditLog } = createMockPrisma();
      newsArticle.findUnique.mockResolvedValue(newsRow());
      newsArticle.delete.mockResolvedValue(newsRow());
      const service = new LandingService(prisma);

      await service.deleteNews("news_1", ACTOR);

      expect(newsArticle.delete).toHaveBeenCalledWith({ where: { id: "news_1" } });
      expect(auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "DELETE" }) })
      );
    });
  });
});
