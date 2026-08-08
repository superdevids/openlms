/**
 * Seed-data integrity — data referensi: komponen gaji, template tagihan,
 * kategori aset, kartu dashboard, landing sections.
 */
import {
  SALARY_COMPONENT_SEEDS,
  INVOICE_TEMPLATE_SEEDS
} from "../../../../packages/database/prisma/seed-data/finance";
import { ASSET_CATEGORY_SEEDS } from "../../../../packages/database/prisma/seed-data/assets";
import {
  DASHBOARD_CARDS_BY_ROLE,
  DASHBOARD_ROLES_TO_SEED
} from "../../../../packages/database/prisma/seed-data/dashboard-config";
import { LANDING_SECTIONS_SEED } from "../../../../packages/database/prisma/seed-data/landing-sections";
import { FINANCE_INVOICE_TYPES } from "../../src/modules/finance/finance.constants";
import { ROLE_VALUES } from "@opensis/types";

describe("seed-data SALARY_COMPONENT_SEEDS — komponen gaji", () => {
  it("kode komponen unik", () => {
    const codes = SALARY_COMPONENT_SEEDS.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("kind hanya ADDITIVE/SUBTRACTIVE", () => {
    for (const c of SALARY_COMPONENT_SEEDS) {
      expect(["ADDITIVE", "SUBTRACTIVE"]).toContain(c.kind);
    }
  });

  it.each(SALARY_COMPONENT_SEEDS.map((c) => [c.code, c.kind] as const))(
    "komponen %s kind %s valid + deskripsi terisi",
    (code, kind) => {
      const c = SALARY_COMPONENT_SEEDS.find((x) => x.code === code);
      expect(c?.description.trim().length).toBeGreaterThan(0);
      expect(c?.name.trim().length).toBeGreaterThan(0);
      expect(["ADDITIVE", "SUBTRACTIVE"]).toContain(kind);
    }
  );

  it("GAPOK adalah ADDITIVE, taxable, dan dasar BPJS", () => {
    const gapok = SALARY_COMPONENT_SEEDS.find((c) => c.code === "GAPOK");
    expect(gapok?.kind).toBe("ADDITIVE");
    expect(gapok?.is_taxable).toBe(true);
    expect(gapok?.is_bpjs_applicable).toBe(true);
  });

  it("potongan (SUBTRACTIVE) tidak taxable dan tidak dasar BPJS", () => {
    for (const c of SALARY_COMPONENT_SEEDS.filter((x) => x.kind === "SUBTRACTIVE")) {
      expect(c.is_taxable).toBe(false);
      expect(c.is_bpjs_applicable).toBe(false);
    }
  });

  it("setiap komponen memiliki default_amount null (nilai dari pengaturan)", () => {
    for (const c of SALARY_COMPONENT_SEEDS) {
      expect(c.default_amount).toBeNull();
    }
  });
});

describe("seed-data INVOICE_TEMPLATE_SEEDS — template tagihan", () => {
  it("type unik", () => {
    const types = INVOICE_TEMPLATE_SEEDS.map((t) => t.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it.each(INVOICE_TEMPLATE_SEEDS.map((t) => [t.type, t.period_format] as const))(
    "template %s period_format %s valid",
    (type, periodFormat) => {
      expect(["MONTHLY", "ONE_TIME", "CUSTOM"]).toContain(periodFormat);
      expect(type.trim().length).toBeGreaterThan(0);
    }
  );

  it.each(INVOICE_TEMPLATE_SEEDS.map((t) => [t.type] as const))(
    "type %s termasuk dalam FINANCE_INVOICE_TYPES",
    (type) => {
      expect(FINANCE_INVOICE_TYPES).toContain(type);
    }
  );

  it("SPP adalah template MONTHLY (tagihan bulanan)", () => {
    const spp = INVOICE_TEMPLATE_SEEDS.find((t) => t.type === "SPP");
    expect(spp?.period_format).toBe("MONTHLY");
  });

  it("semua template tanpa default_amount (nilai dari sekolah)", () => {
    for (const t of INVOICE_TEMPLATE_SEEDS) {
      expect(t.default_amount).toBeNull();
    }
  });
});

describe("seed-data ASSET_CATEGORY_SEEDS — kategori aset", () => {
  it("category unik", () => {
    const cats = ASSET_CATEGORY_SEEDS.map((c) => c.category);
    expect(new Set(cats).size).toBe(cats.length);
  });

  it.each(ASSET_CATEGORY_SEEDS.map((c) => [c.category, c.useful_life_months] as const))(
    "kategori %s umur manfaat %d bulan positif",
    (category, months) => {
      expect(months).toBeGreaterThan(0);
      expect(category.trim().length).toBeGreaterThan(0);
    }
  );

  it("umur manfaat menurun sesuai kepadatan aset (gedung > lab > alat > lain)", () => {
    const byCat = (c: string) =>
      ASSET_CATEGORY_SEEDS.find((x) => x.category === c)?.useful_life_months ?? 0;
    expect(byCat("RUANG")).toBeGreaterThan(byCat("LAB"));
    expect(byCat("LAB")).toBeGreaterThan(byCat("ALAT"));
    expect(byCat("ALAT")).toBeGreaterThan(byCat("LAINNYA"));
  });
});

describe("seed-data DASHBOARD_CARDS_BY_ROLE — kartu dashboard", () => {
  it("semua role yang di-seed kartunya adalah Role valid", () => {
    for (const role of DASHBOARD_ROLES_TO_SEED) {
      expect(ROLE_VALUES).toContain(role);
    }
  });

  it("role dengan kartu non-kosong; role tanpa UI (CALON_SISWA dll.) kosong", () => {
    expect((DASHBOARD_CARDS_BY_ROLE.SISWA ?? []).length).toBeGreaterThan(0);
    expect((DASHBOARD_CARDS_BY_ROLE.GURU ?? []).length).toBeGreaterThan(0);
    expect((DASHBOARD_CARDS_BY_ROLE.CALON_SISWA ?? []).length).toBe(0);
    expect((DASHBOARD_CARDS_BY_ROLE.PEMBIMBING_INDUSTRI ?? []).length).toBe(0);
    expect((DASHBOARD_CARDS_BY_ROLE.PENGUJI_EKSTERNAL ?? []).length).toBe(0);
  });

  it.each(DASHBOARD_ROLES_TO_SEED.map((role) => [role] as const))(
    "kartu role %s: featureKey unik + label/href terisi",
    (role) => {
      const cards = DASHBOARD_CARDS_BY_ROLE[role] ?? [];
      const keys = cards.map((c) => c.featureKey);
      expect(new Set(keys).size).toBe(keys.length);
      for (const c of cards) {
        expect(c.label.trim().length).toBeGreaterThan(0);
        expect(c.href.startsWith("/")).toBe(true);
        expect(typeof c.sectionOrder).toBe("number");
      }
    }
  );

  it("requiredPermission kartu (jika ada) terdaftar di katalog PERMISSIONS", async () => {
    const { PERMISSIONS } =
      await import("../../../../packages/database/prisma/seed-data/permissions");
    const catalog = new Set(PERMISSIONS.map((p) => p.code));
    for (const role of DASHBOARD_ROLES_TO_SEED) {
      for (const c of DASHBOARD_CARDS_BY_ROLE[role] ?? []) {
        if (c.requiredPermission) {
          expect(catalog.has(c.requiredPermission)).toBe(true);
        }
      }
    }
  });
});

describe("seed-data LANDING_SECTIONS_SEED — konten landing", () => {
  it("slug unik", () => {
    const slugs = LANDING_SECTIONS_SEED.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(LANDING_SECTIONS_SEED.map((s) => [s.slug] as const))(
    "section %s: title/subtitle/body terisi",
    (slug) => {
      const s = LANDING_SECTIONS_SEED.find((x) => x.slug === slug);
      expect(s?.title.trim().length).toBeGreaterThan(0);
      expect(s?.subtitle.trim().length).toBeGreaterThan(0);
      expect(s?.body.trim().length).toBeGreaterThan(0);
    }
  );

  it.each(LANDING_SECTIONS_SEED.map((s) => [s.slug, s.sectionOrder] as const))(
    "section %s sectionOrder non-negatif",
    (_slug, order) => {
      expect(order).toBeGreaterThanOrEqual(0);
    }
  );

  it("linkUrl hanya bila linkLabel terisi (CTA valid)", () => {
    for (const s of LANDING_SECTIONS_SEED) {
      if (s.linkUrl) {
        expect(s.linkLabel?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("hero selalu urutan pertama", () => {
    const hero = LANDING_SECTIONS_SEED.find((s) => s.slug === "hero");
    expect(hero?.sectionOrder).toBe(0);
  });

  it("hero memiliki CTA ke /ppdb", () => {
    const hero = LANDING_SECTIONS_SEED.find((s) => s.slug === "hero");
    expect(hero?.linkUrl).toBe("/ppdb");
  });
});
