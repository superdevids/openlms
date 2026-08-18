/**
 * Seed-data integrity — data referensi: kartu dashboard, landing sections.
 */
import {
  DASHBOARD_CARDS_BY_ROLE,
  DASHBOARD_ROLES_TO_SEED
} from "../../../../packages/database/prisma/seed-data/dashboard-config";
import { LANDING_SECTIONS_SEED } from "../../../../packages/database/prisma/seed-data/landing-sections";
import { ROLE_VALUES } from "@opensis/types";

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
