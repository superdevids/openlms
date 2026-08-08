/**
 * Seed-data integrity — feature flags (prd04 §5.N).
 * Setiap flag: key unik + format UPPER_SNAKE, kategori terisi, deskripsi terisi,
 * dan aturan locked/system konsisten dengan semantik seed.
 */
import { FEATURE_FLAGS } from "../../../../packages/database/prisma/seed-data/feature-flags";

const FLAGS = FEATURE_FLAGS;
const KEYS = FLAGS.map((f) => f.key);
const KEY_SET = new Set(KEYS);
const LOCKED = FLAGS.filter((f) => f.locked);
const SYSTEM = FLAGS.filter((f) => f.is_system);
const KEY_FORMAT = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

describe("seed-data FEATURE_FLAGS — key & identitas", () => {
  it("kunci unik (tidak ada duplikasi)", () => {
    expect(KEY_SET.size).toBe(FLAGS.length);
  });

  it("jumlah flag di atas 40 (katalog lengkap)", () => {
    expect(FLAGS.length).toBeGreaterThanOrEqual(40);
  });

  it.each(FLAGS.map((f) => [f.key] as const))("key %s format UPPER_SNAKE", (key) => {
    expect(key).toMatch(KEY_FORMAT);
  });

  it.each(FLAGS.map((f) => [f.key, f.kategori] as const))(
    "flag %s memiliki kategori non-kosong",
    (_key, kategori) => {
      expect(kategori.trim().length).toBeGreaterThan(0);
    }
  );

  it.each(FLAGS.map((f) => [f.key, f.deskripsi] as const))(
    "flag %s memiliki deskripsi non-kosong",
    (_key, deskripsi) => {
      expect(deskripsi.trim().length).toBeGreaterThan(0);
    }
  );

  it.each(FLAGS.map((f) => [f.key, f.default_enabled] as const))(
    "flag %s default_enabled boolean",
    (_key, value) => {
      expect(typeof value).toBe("boolean");
    }
  );

  it.each(FLAGS.map((f) => [f.key, f.locked] as const))("flag %s locked boolean", (_key, value) => {
    expect(typeof value).toBe("boolean");
  });
});

describe("seed-data FEATURE_FLAGS — aturan locked (DITUNDA)", () => {
  it("semua flag locked berstatus default OFF", () => {
    for (const f of LOCKED) {
      expect(f.default_enabled).toBe(false);
    }
  });

  it("semua flag locked menandai DITUNDA di deskripsi", () => {
    for (const f of LOCKED) {
      expect(f.deskripsi).toContain("DITUNDA");
    }
  });

  it.each(LOCKED.map((f) => [f.key] as const))("flag locked %s OFF + DITUNDA", (key) => {
    const f = FLAGS.find((x) => x.key === key);
    expect(f?.default_enabled).toBe(false);
    expect(f?.deskripsi).toContain("DITUNDA");
  });
});

describe("seed-data FEATURE_FLAGS — is_system (tidak bisa dimatikan)", () => {
  it("LMS_BASE adalah satu-satunya flag system", () => {
    expect(SYSTEM.map((f) => f.key)).toEqual(["LMS_BASE"]);
  });

  it("LMS_BASE default ON", () => {
    const base = FLAGS.find((f) => f.key === "LMS_BASE");
    expect(base?.default_enabled).toBe(true);
  });

  it("flag system tidak boleh locked", () => {
    for (const f of SYSTEM) {
      expect(f.locked).toBe(false);
    }
  });
});

describe("seed-data FEATURE_FLAGS — status default MVP (owner v4.2)", () => {
  it("fitur LMS inti semua default ON", () => {
    const core = [
      "LMS_BASE",
      "LMS_MATERIAL",
      "LMS_ASSIGNMENT",
      "LMS_QUIZ",
      "LMS_BANK_SOAL",
      "LMS_EXAM",
      "LMS_EXAM_TOKEN",
      "LMS_EXAM_RANDOMIZE",
      "LMS_ABSENSI_MANUAL",
      "LMS_ABSENSI_QR",
      "LMS_ERAPOR",
      "LMS_KALENDER"
    ];
    for (const key of core) {
      const f = FLAGS.find((x) => x.key === key);
      expect(f).toBeDefined();
      expect(f?.default_enabled).toBe(true);
    }
  });

  it("fitur gelombang 2/3 default OFF", () => {
    const wave2 = [
      "FINANCE_INVOICE",
      "FINANCE_PAYMENT",
      "PPDB",
      "PAYROLL",
      "SMK_PKL",
      "SMK_UKK",
      "ALUMNI",
      "LIBRARY"
    ];
    for (const key of wave2) {
      const f = FLAGS.find((x) => x.key === key);
      expect(f).toBeDefined();
      expect(f?.default_enabled).toBe(false);
    }
  });

  it("LMS_ABSENSI_GEOFENCE default OFF dengan config_schema radius", () => {
    const f = FLAGS.find((x) => x.key === "LMS_ABSENSI_GEOFENCE");
    expect(f?.default_enabled).toBe(false);
    const schema = f?.config_schema as { radius_meters?: number } | undefined;
    expect(schema?.radius_meters).toBe(150);
  });

  it("FINANCE_GATEWAY default OFF dengan config_schema provider none", () => {
    const f = FLAGS.find((x) => x.key === "FINANCE_GATEWAY");
    expect(f?.default_enabled).toBe(false);
    const schema = f?.config_schema as { provider?: string } | undefined;
    expect(schema?.provider).toBe("none");
  });

  it("PARENT_PORTAL & NOTIFICATION & ACADEMIC_ROLLOVER default ON (fitur inti platform)", () => {
    for (const key of ["PARENT_PORTAL", "NOTIFICATION", "ACADEMIC_ROLLOVER"]) {
      expect(FLAGS.find((x) => x.key === key)?.default_enabled).toBe(true);
    }
  });

  it("tidak ada flag yang memakai key tidak konsisten dengan kategori", () => {
    // Key yang diawali LMS_* harus berkategori LMS (kecuali LMS_ABSENSI_* -> LMS juga).
    for (const f of FLAGS) {
      if (f.key.startsWith("LMS_")) {
        expect(f.kategori).toBe("LMS");
      }
      if (f.key.startsWith("FINANCE_")) {
        expect(f.kategori).toBe("KEUANGAN");
      }
      if (f.key.startsWith("ASSET_")) {
        expect(f.kategori).toBe("ASET");
      }
      if (f.key.startsWith("SMK_")) {
        expect(f.kategori).toBe("SMK");
      }
    }
  });

  it("config_schema hanya ada pada flag yang memang butuh konfigurasi", () => {
    const withSchema = FLAGS.filter((f) => f.config_schema !== undefined).map((f) => f.key);
    expect(withSchema.sort()).toEqual(["FINANCE_GATEWAY", "LMS_ABSENSI_GEOFENCE"]);
  });
});
