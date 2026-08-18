/**
 * Seed-data integrity — RBAC permission (prd04 §4.2/§4.3).
 *
 * Menjaga invariants katalog PERMISSIONS + ROLE_PERMISSIONS agar tidak ada
 * orphan (grant yang tidak ada di katalog), scope tidak valid, duplikasi,
 * atau role tanpa grant. Table-driven: setiap baris = 1 test case.
 *
 * Impor langsung dari packages/database/prisma/seed-data (TANPA PrismaClient
 * — file seed-data murni konstanta; seed.ts sendiri TIDAK diimpor karena
 * membuka koneksi DB).
 */
import {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSIONS,
  ROLES_TO_SEED
} from "../../../../packages/database/prisma/seed-data/permissions";
import { ROLE_VALUES, PERMISSION_SCOPE_VALUES } from "@opensis/types";

const CATALOG_CODES = new Set(PERMISSIONS.map((p) => p.code));

// format resource:action[:subaction][:scope] — 2..4 segmen (contoh
// auth:login, user:read:school, auth:password:change:self). Segmen boleh
// mengandung hyphen (exam:grade-esai:class).
const CODE_FORMAT = /^[a-z]+(:[a-z0-9-]+){1,3}$/;

function grantsOf(role: (typeof ROLES_TO_SEED)[number]) {
  return ROLE_PERMISSIONS[role] ?? [];
}

describe("seed-data PERMISSIONS — katalog", () => {
  it("kode permission unik (tidak ada duplikasi)", () => {
    const seen = new Set<string>();
    const dups = PERMISSIONS.filter((p) => (seen.has(p.code) ? true : !seen.add(p.code)));
    expect(dups).toEqual([]);
    expect(seen.size).toBe(PERMISSIONS.length);
  });

  it("katalog tidak kosong dan setiap baris punya deskripsi", () => {
    expect(PERMISSIONS.length).toBeGreaterThan(100);
    for (const p of PERMISSIONS) {
      expect(p.description.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(PERMISSIONS.map((p) => [p.code] as const))(
    "kode %s mengikuti format resource:action[:scope]",
    (code) => {
      expect(code).toMatch(CODE_FORMAT);
    }
  );

  it.each(PERMISSIONS.map((p) => [p.code, p.category] as const))(
    "kategori %s milik %s termasuk dalam PERMISSION_CATEGORIES (13)",
    (_code, category) => {
      expect(PERMISSION_CATEGORIES).toContain(category);
    }
  );

  it("semua kategori terpakai oleh minimal satu permission", () => {
    const used = new Set(PERMISSIONS.map((p) => p.category));
    for (const cat of PERMISSION_CATEGORIES) {
      expect(used.has(cat)).toBe(true);
    }
  });

  it("is_system (jika diisi) selalu boolean", () => {
    // is_system opsional di seed-data: tidak diisi berarti false di DB
    // (seed.ts memetakan `perm.is_system ?? false`). Invariant yang dicek:
    // kalau field ada, harus boolean.
    for (const p of PERMISSIONS) {
      if (p.is_system !== undefined) {
        expect(typeof p.is_system).toBe("boolean");
      }
    }
  });
});

describe("seed-data ROLE_PERMISSIONS — invariants per role", () => {
  it("ROLES_TO_SEED sama dengan seluruh nilai Role di @opensis/types", () => {
    expect([...ROLES_TO_SEED].sort()).toEqual([...ROLE_VALUES].sort());
  });

  it.each(ROLES_TO_SEED.map((role) => [role] as const))(
    "role %s memiliki grant non-kosong",
    (role) => {
      expect(grantsOf(role).length).toBeGreaterThan(0);
    }
  );

  it.each(ROLES_TO_SEED.map((role) => [role] as const))(
    "role %s tidak memiliki kode duplikat dalam grant",
    (role) => {
      const codes = grantsOf(role).map((g) => g.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
  );

  it.each(ROLES_TO_SEED.map((role) => [role] as const))(
    "scope setiap grant role %s adalah PermissionScope valid",
    (role) => {
      for (const g of grantsOf(role)) {
        expect(PERMISSION_SCOPE_VALUES).toContain(g.scope);
      }
    }
  );

  it.each(ROLES_TO_SEED.map((role) => [role] as const))(
    "setiap grant role %s ada di katalog PERMISSIONS (no orphan)",
    (role) => {
      for (const g of grantsOf(role)) {
        expect(CATALOG_CODES.has(g.code)).toBe(true);
      }
    }
  );

  it("SUPERADMIN diberi SEMUA kode non-:self (kecuali scope SENDIRI)", () => {
    const expected = PERMISSIONS.filter((p) => !p.code.endsWith(":self")).map((p) => p.code);
    const granted = new Set(grantsOf("SUPERADMIN").map((g) => g.code));
    for (const code of expected) {
      expect(granted.has(code)).toBe(true);
    }
  });

  it("SUPERADMIN TIDAK diberi kode berakhiran :self (kecuali pdp:self eksplisit)", () => {
    // Pengecualian sah (modul PDP, UU PDP): blok SUPERADMIN mem-filter semua
    // kode :self, lalu grant eksplisit 3 permission pdp:self agar SUPERADMIN
    // tetap bisa memakai fitur PDP self (data/ekspor/permintaan hapus).
    const PDP_SELF_EXCEPTIONS = new Set([
      "pdp:data:self",
      "pdp:export:self",
      "pdp:delete-request:self"
    ]);
    for (const g of grantsOf("SUPERADMIN")) {
      if (g.code.endsWith(":self")) {
        expect(PDP_SELF_EXCEPTIONS.has(g.code)).toBe(true);
      }
    }
  });

  it("semua permission di katalog diberikan ke minimal satu role", () => {
    const granted = new Set<string>();
    for (const role of ROLES_TO_SEED) {
      for (const g of grantsOf(role)) granted.add(g.code);
    }
    for (const p of PERMISSIONS) {
      expect(granted.has(p.code)).toBe(true);
    }
  });

  it("grant scope konsisten dengan akhiran kode (:self → SENDIRI)", () => {
    for (const role of ROLES_TO_SEED) {
      for (const g of grantsOf(role)) {
        if (g.code.endsWith(":self")) {
          expect(g.scope).toBe("SENDIRI");
        }
      }
    }
  });

  it("WAKEPSEK TIDAK memiliki audit:read:school (change-log R-11: hanya SUPERADMIN+KEPSEK)", () => {
    expect(grantsOf("WAKEPSEK").map((g) => g.code)).not.toContain("audit:read:school");
  });

  it("KEPSEK memiliki audit:read:school", () => {
    expect(grantsOf("KEPSEK").map((g) => g.code)).toContain("audit:read:school");
  });
});

describe("seed-data ROLE_PERMISSIONS — permission dasar semua role", () => {
  const BASIC_SELF_CODES = [
    "auth:login",
    "auth:me:self",
    "auth:logout:self",
    "auth:password:change:self",
    "auth:invitation:accept:self",
    "user:read:self",
    "user:write:self",
    "notification:read:self",
    "notification:mark-read:self",
    "dashboard:read:self"
  ];

  it.each(ROLES_TO_SEED.filter((r) => r !== "SUPERADMIN").map((role) => [role] as const))(
    "role %s memegang permission dasar self",
    (role) => {
      const codes = grantsOf(role).map((g) => g.code);
      for (const code of BASIC_SELF_CODES) {
        expect(codes).toContain(code);
      }
    }
  );

  it("SUPERADMIN tidak perlu grant BASIC_SELF eksplisit (diwakili semua non-:self)", () => {
    const codes = grantsOf("SUPERADMIN").map((g) => g.code);
    // Kode berakhiran :self memang TIDAK di-grant SUPERADMIN (grant eksplisit
    // BASIC_SELF tidak diperlukan karena scope SENDIRI diselesaikan guard).
    expect(codes).not.toContain("user:read:self");
    expect(codes).not.toContain("auth:me:self");
    // auth:login sah di-grant: bukan kode :self, dan semua role memegangnya.
    expect(codes).toContain("auth:login");
  });
});

describe("seed-data ROLE_PERMISSIONS — matriks domain terpilih (04-api-contract §4)", () => {
  it("GURU dapat menilai submission & memverifikasi izin kelas", () => {
    const codes = grantsOf("GURU").map((g) => g.code);
    expect(codes).toContain("submission:grade:class");
    expect(codes).toContain("permit:verify:class");
  });

  it("GURU TIDAK dapat mengelola data induk user (user:write:school)", () => {
    const codes = grantsOf("GURU").map((g) => g.code);
    expect(codes).not.toContain("user:write:school");
  });

  it("KEUANGAN fokus keuangan: tidak punya akses akademik tulis", () => {
    const codes = grantsOf("KEUANGAN").map((g) => g.code);
    expect(codes).toContain("payroll:run:school");
    expect(codes).not.toContain("class:write:school");
    expect(codes).not.toContain("schedule:write:school");
  });

  it("SISWA tidak punya akses tulis apa pun ke sekolah", () => {
    const codes = grantsOf("SISWA").map((g) => g.code);
    for (const code of codes) {
      expect(code.endsWith(":school") && code.includes(":write:")).toBe(false);
    }
  });

  it("CALON_SISWA hanya PPDB self + akademik read + permission dasar self", () => {
    // CALON_SISWA = BASIC_SELF (termasuk auth:login + semua kode :self) +
    // PPDB self + akademik read; tidak boleh ada scope sekolah/kelas.
    const codes = grantsOf("CALON_SISWA").map((g) => g.code);
    for (const code of codes) {
      expect(
        code.endsWith(":self") ||
          code === "ppdb:register:public" ||
          code === "academic:prodi:read" ||
          code === "auth:login"
      ).toBe(true);
    }
  });

  it("PEMBIMBING_INDUSTRI terbatas internship + announcement", () => {
    const codes = grantsOf("PEMBIMBING_INDUSTRI").map((g) => g.code);
    expect(codes).toContain("internship:journal:self");
    expect(codes).toContain("internship:grade:self");
    expect(codes).toContain("announcement:read");
    expect(codes).not.toContain("class:read:class");
  });

  it("PENGUJI_EKSTERNAL hanya competency:grade:self", () => {
    const codes = grantsOf("PENGUJI_EKSTERNAL").map((g) => g.code);
    expect(codes).toContain("competency:grade:self");
    expect(codes).not.toContain("competency:grade:school");
  });

  it("OPERATOR memiliki hak user management (reset password, list)", () => {
    const codes = grantsOf("OPERATOR").map((g) => g.code);
    expect(codes).toContain("user:reset-password:school");
    expect(codes).toContain("user:list:school");
  });

  it("KEPSEK tidak memiliki hak tulis user (dipegang OPERATOR)", () => {
    const codes = grantsOf("KEPSEK").map((g) => g.code);
    expect(codes).not.toContain("user:write:school");
  });

  it("WALI_MURID hanya membaca laporan/invoice/absensi anak", () => {
    const codes = grantsOf("WALI_MURID").map((g) => g.code);
    expect(codes).toContain("report:read:self");
    expect(codes).toContain("invoice:read:self");
    expect(codes).toContain("attendance:rekap:self");
    expect(codes).not.toContain("user:read:school");
  });
});
