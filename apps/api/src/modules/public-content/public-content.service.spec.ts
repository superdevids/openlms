import { NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@opensis/database";
import { PublicContentService } from "./public-content.service";

/** Helper: section LandingContent publik. */
function sectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "land_fasilitas",
    slug: "fasilitas",
    title: "Fasilitas",
    body: "Sarana & prasarana pendukung",
    link_url: null,
    extra: null,
    ...overrides
  };
}

function createMockPrisma() {
  const prodi = { findMany: jest.fn() };
  const extracurricular = { findMany: jest.fn() };
  const achievement = { findMany: jest.fn() };
  const schoolProfile = { findFirst: jest.fn() };
  const landingContent = { findFirst: jest.fn() };
  const prisma = {
    prodi,
    extracurricular,
    achievement,
    schoolProfile,
    landingContent
  } as unknown as PrismaClient;
  return { prisma, prodi, extracurricular, achievement, schoolProfile, landingContent };
}

describe("PublicContentService", () => {
  describe("getPrograms", () => {
    it("mengembalikan Prodi aktif + pelengkap dari LandingContent program-keahlian (mapping by code)", async () => {
      const { prisma, prodi, landingContent } = createMockPrisma();
      prodi.findMany.mockResolvedValue([
        { id: "prd_1", code: "TKJ", name: "Teknik Komputer dan Jaringan", short_name: "TKJ" },
        { id: "prd_2", code: "RPL", name: "Rekayasa Perangkat Lunak", short_name: "RPL" }
      ]);
      landingContent.findFirst.mockResolvedValue(
        sectionRow({
          slug: "program-keahlian",
          extra: {
            programs: [
              {
                code: "TKJ",
                title: "Teknik Komputer & Jaringan",
                desc: "Instalasi jaringan",
                icon: "database",
                kompetensi: ["Instalasi LAN/WAN"],
                mitra_dudi: ["PT Telkom"],
                prospek: ["Teknisi Jaringan"]
              },
              { title: "Tanpa Kode", desc: "x" }
            ]
          }
        })
      );
      const service = new PublicContentService(prisma);

      const items = await service.getPrograms();

      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        code: "TKJ",
        name: "Teknik Komputer dan Jaringan",
        shortName: "TKJ"
      });
      // TKJ cocok by code → pelengkap terisi
      expect(items[0]).toMatchObject({
        desc: "Instalasi jaringan",
        icon: "database",
        kompetensi: ["Instalasi LAN/WAN"],
        mitraDudi: ["PT Telkom"],
        prospek: ["Teknisi Jaringan"]
      });
      // RPL tidak cocok → data Prodi saja
      expect(items[1]).toEqual({
        id: "prd_2",
        code: "RPL",
        name: "Rekayasa Perangkat Lunak",
        shortName: "RPL"
      });
      expect(prodi.findMany).toHaveBeenCalledWith({
        where: { is_active: true },
        orderBy: { code: "asc" }
      });
    });

    it("mengembalikan array kosong bila tidak ada Prodi aktif", async () => {
      const { prisma, prodi, landingContent } = createMockPrisma();
      prodi.findMany.mockResolvedValue([]);
      landingContent.findFirst.mockResolvedValue(null);
      const service = new PublicContentService(prisma);

      await expect(service.getPrograms()).resolves.toEqual([]);
    });
  });

  describe("getExtracurriculars", () => {
    it("memetakan coachName dari relasi dan mengurutkan by name", async () => {
      const { prisma, extracurricular } = createMockPrisma();
      extracurricular.findMany.mockResolvedValue([
        {
          id: "eks_1",
          name: "Pramuka",
          description: "Kepramukaan",
          schedule: [{ day: "Sabtu", time: "07.30 WIB" }],
          coach: { full_name: "Budi Santoso" }
        }
      ]);
      const service = new PublicContentService(prisma);

      const items = await service.getExtracurriculars();

      expect(items).toEqual([
        {
          id: "eks_1",
          name: "Pramuka",
          description: "Kepramukaan",
          schedule: [{ day: "Sabtu", time: "07.30 WIB" }],
          coachName: "Budi Santoso"
        }
      ]);
      expect(extracurricular.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: "asc" },
          include: { coach: { select: { full_name: true } } }
        })
      );
    });

    it("coachName null bila tanpa pembina", async () => {
      const { prisma, extracurricular } = createMockPrisma();
      extracurricular.findMany.mockResolvedValue([
        { id: "eks_2", name: "Robotik", description: null, schedule: null, coach: null }
      ]);
      const service = new PublicContentService(prisma);

      const items = await service.getExtracurriculars();
      expect(items[0]!.coachName).toBeNull();
    });

    it("array kosong bila tabel kosong", async () => {
      const { prisma, extracurricular } = createMockPrisma();
      extracurricular.findMany.mockResolvedValue([]);
      const service = new PublicContentService(prisma);

      await expect(service.getExtracurriculars()).resolves.toEqual([]);
    });
  });

  describe("getAchievements", () => {
    it("mengurutkan tanggal desc; PII siswa (nama + sertifikat) TIDAK diekspos publik (M-06)", async () => {
      const { prisma, achievement } = createMockPrisma();
      achievement.findMany.mockResolvedValue([
        {
          id: "ach_1",
          title: "Juara 1 LKS",
          level: "PROVINSI",
          date: new Date("2026-06-20T00:00:00.000Z"),
          certificate_url: "/files/ach-1.pdf",
          student: { full_name: "Siswa Demo" },
          extracurricular: { name: "Robotik" }
        }
      ]);
      const service = new PublicContentService(prisma);

      const items = await service.getAchievements();

      expect(items[0]).toMatchObject({
        id: "ach_1",
        title: "Juara 1 LKS",
        level: "PROVINSI",
        studentName: "Siswa",
        extracurricularName: "Robotik",
        certificateUrl: null
      });
      // Nama asli siswa tidak boleh ikut di-query (PII tidak dimuat ke memori).
      expect(items[0]?.studentName).not.toBe("Siswa Demo");
      expect(items[0]?.certificateUrl).toBeNull();
      expect(achievement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date: "desc" } })
      );
    });
  });

  describe("getSchoolProfile", () => {
    it("memetakan baris tunggal SchoolProfile", async () => {
      const { prisma, schoolProfile } = createMockPrisma();
      schoolProfile.findFirst.mockResolvedValue({
        id: "sch_1",
        name: "SMK Contoh",
        npsn: "00000001",
        nss: "000100001",
        school_type: "SMK",
        address: "Jl. Pendidikan No. 1",
        phone: "021-0000000",
        email: "info@opensis.local",
        logo_url: "/storage/logo.png"
      });
      const service = new PublicContentService(prisma);

      const profile = await service.getSchoolProfile();

      expect(profile).toEqual({
        name: "SMK Contoh",
        npsn: "00000001",
        nss: "000100001",
        schoolType: "SMK",
        address: "Jl. Pendidikan No. 1",
        phone: "021-0000000",
        email: "info@opensis.local",
        logoUrl: "/storage/logo.png"
      });
    });

    it("melempar NotFoundException bila profil tidak ada", async () => {
      const { prisma, schoolProfile } = createMockPrisma();
      schoolProfile.findFirst.mockResolvedValue(null);
      const service = new PublicContentService(prisma);

      await expect(service.getSchoolProfile()).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("halaman berbasis LandingContent", () => {
    function serviceWith(landing: unknown): PublicContentService {
      const { prisma, landingContent } = createMockPrisma();
      landingContent.findFirst.mockResolvedValue(landing);
      return new PublicContentService(prisma);
    }

    it("getFacilities: membungkus extra.items sebagai page-data { title, items }", async () => {
      const service = serviceWith(
        sectionRow({
          extra: {
            items: [
              { title: "Lab Komputer", desc: "Lab dengan internet", icon: "database" },
              { title: "Perpustakaan", desc: null, icon: "book" }
            ]
          }
        })
      );

      const page = await service.getFacilities();

      expect(page).toEqual({
        title: "Fasilitas",
        items: [
          { title: "Lab Komputer", desc: "Lab dengan internet", icon: "database" },
          { title: "Perpustakaan", desc: null, icon: "book" }
        ]
      });
    });

    it("getFacilities: fallback items kosong bila extra belum terisi", async () => {
      const service = serviceWith(sectionRow({ extra: null }));

      await expect(service.getFacilities()).resolves.toEqual({ title: "Fasilitas", items: [] });
    });

    it("getFacilities: 404 bila section tidak ada", async () => {
      const service = serviceWith(null);

      await expect(service.getFacilities()).rejects.toBeInstanceOf(NotFoundException);
    });

    it("getGallery: membungkus extra.images", async () => {
      const service = serviceWith(
        sectionRow({
          slug: "galeri",
          title: "Galeri",
          extra: {
            images: [
              { title: "MPLS 2026", src: "/g.jpg", category: "Kegiatan", date: "2026-07-15" }
            ]
          }
        })
      );

      await expect(service.getGallery()).resolves.toEqual({
        title: "Galeri",
        images: [{ title: "MPLS 2026", src: "/g.jpg", category: "Kegiatan", date: "2026-07-15" }]
      });
    });

    it("getTestimonials: membungkus extra.items", async () => {
      const service = serviceWith(
        sectionRow({
          slug: "testimoni",
          title: "Testimoni",
          extra: { items: [{ name: "Hendra", role: "Orang tua", text: "Bagus" }] }
        })
      );

      await expect(service.getTestimonials()).resolves.toEqual({
        title: "Testimoni",
        items: [{ name: "Hendra", role: "Orang tua", text: "Bagus" }]
      });
    });

    it("getFaqs: membungkus extra.faq", async () => {
      const service = serviceWith(
        sectionRow({
          slug: "faq",
          title: "Pertanyaan Umum",
          extra: { faq: [{ question: "Cara daftar?", answer: "Daring." }] }
        })
      );

      await expect(service.getFaqs()).resolves.toEqual({
        title: "Pertanyaan Umum",
        items: [{ question: "Cara daftar?", answer: "Daring." }]
      });
    });

    it("getContact: memetakan field kontak + null fallback", async () => {
      const service = serviceWith(
        sectionRow({
          slug: "kontak",
          title: "Hubungi Kami",
          extra: {
            phone: "021-0000000",
            email: "info@opensis.local",
            address: "Jl. Pendidikan No. 1",
            hours: "Senin–Jumat",
            whatsapp: "6281200000000",
            instagram: "https://instagram.com/x",
            facebook: "https://facebook.com/x",
            youtube: "https://youtube.com/@x",
            mapsEmbedUrl: "https://maps.google.com/embed?q=x"
          }
        })
      );

      const contact = await service.getContact();

      expect(contact).toMatchObject({
        phone: "021-0000000",
        email: "info@opensis.local",
        whatsapp: "6281200000000",
        mapsEmbedUrl: "https://maps.google.com/embed?q=x"
      });
    });

    it("getContact: field hilang → null", async () => {
      const service = serviceWith(sectionRow({ slug: "kontak", extra: { phone: "021-1" } }));

      const contact = await service.getContact();
      expect(contact.phone).toBe("021-1");
      expect(contact.email).toBeNull();
      expect(contact.mapsEmbedUrl).toBeNull();
    });

    it("getSchoolStructure: membungkus extra.groups", async () => {
      const service = serviceWith(
        sectionRow({
          slug: "struktur-organisasi",
          title: "Struktur Organisasi",
          extra: { groups: [{ title: "Pimpinan", items: [{ name: "A", position: "Kepsek" }] }] }
        })
      );

      await expect(service.getSchoolStructure()).resolves.toEqual({
        title: "Struktur Organisasi",
        groups: [{ title: "Pimpinan", items: [{ name: "A", position: "Kepsek" }] }]
      });
    });

    it("getSchoolProfileExtra: menggabungkan tentang + visi-misi + piagam", async () => {
      const { prisma, landingContent } = createMockPrisma();
      landingContent.findFirst.mockImplementation(
        async ({ where }: { where: { slug: string } }) => {
          if (where.slug === "tentang") {
            return sectionRow({
              slug: "tentang",
              title: "Tentang Kami",
              extra: { features: [{ title: "Modern", desc: "Kurikulum aktif" }] }
            });
          }
          if (where.slug === "visi-misi") {
            return sectionRow({
              slug: "visi-misi",
              title: "Visi & Misi",
              extra: { visi: "Cerdas", misi: ["Belajar", "Berkarakter"] }
            });
          }
          return sectionRow({ slug: "piagam", title: "Piagam Sekolah", body: "NPSN: 00000001" });
        }
      );
      const service = new PublicContentService(prisma);

      const page = await service.getSchoolProfileExtra();

      expect(page).toEqual({
        tentang: {
          title: "Tentang Kami",
          features: [{ title: "Modern", desc: "Kurikulum aktif" }]
        },
        visiMisi: { visi: "Cerdas", misi: ["Belajar", "Berkarakter"] },
        piagam: "NPSN: 00000001"
      });
    });

    it("getSchoolProfileExtra: 404 bila salah satu section hilang", async () => {
      const { prisma, landingContent } = createMockPrisma();
      landingContent.findFirst.mockResolvedValue(null);
      const service = new PublicContentService(prisma);

      await expect(service.getSchoolProfileExtra()).rejects.toBeInstanceOf(NotFoundException);
    });

    it("getPpdbInfo: memetakan extra + linkUrl dari section", async () => {
      const service = serviceWith(
        sectionRow({
          slug: "ppdb-cta",
          title: "PPDB 2026/2027",
          link_url: "/ppdb",
          extra: {
            periode: "1 Maret – 30 Juni 2026",
            kuota: "360 kursi",
            jalur: ["Zonasi", "Prestasi"],
            info: [{ label: "Biaya", value: "Gratis" }]
          }
        })
      );

      const info = await service.getPpdbInfo();

      expect(info).toEqual({
        periode: "1 Maret – 30 Juni 2026",
        kuota: "360 kursi",
        jalur: ["Zonasi", "Prestasi"],
        info: [{ label: "Biaya", value: "Gratis" }],
        linkUrl: "/ppdb"
      });
    });
  });
});
