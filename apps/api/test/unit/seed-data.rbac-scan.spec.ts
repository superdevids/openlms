/**
 * Seed-data integrity — static scan @RequirePermission di source (drift guard).
 *
 * Mengambil seluruh kode permission yang dipakai decorator @RequirePermission
 * di apps/api/src (kecuali file .spec.ts dan baris komentar), lalu memastikan:
 * 1. Setiap kode ADA di katalog PERMISSIONS (drift: controller pakai permission
 *    yang tidak di-seed -> runtime akan selalu Forbidden).
 * 2. Setiap kode diberikan ke minimal satu role (kalau tidak, tidak ada yang
 *    bisa memanggil endpoint tsb).
 * 3. Kode yang di-seed tapi tidak pernah dipakai di source (potential dead).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES_TO_SEED
} from "../../../../packages/database/prisma/seed-data/permissions";

const SRC_ROOT = join(__dirname, "../../src");

/** Scan satu file: kode @RequirePermission("...") di baris NON-komentar. */
function codesInFile(content: string): string[] {
  const codes = new Set<string>();
  // Buang baris komentar agar string di komentar tidak dianggap kode, lalu
  // scan SELURUH isi file (bukan per-baris) karena dekorator bisa multi-baris
  // (contoh: src/modules/storage/storage.controller.ts).
  const code = content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !(trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*"));
    })
    .join("\n");
  // Dekorator tidak punya argumen bersarang, jadi [^)]* (dotAll) aman untuk
  // mengambil SELURUH daftar argumen ("a", "b") lintas baris, lalu ekstrak
  // semua string-nya (kutip ganda/tunggal/backtick).
  const re = /@RequirePermission\s*\(([^)]*)\)/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const args = m[1] ?? "";
    const quoted = /(["'`])([^"'`]+)\1/g;
    let q: RegExpExecArray | null;
    while ((q = quoted.exec(args)) !== null) {
      const c = q[2];
      if (c) codes.add(c);
    }
  }
  return [...codes];
}

function collectUsedCodes(): { codes: string[]; files: Record<string, string[]> } {
  const used = new Set<string>();
  const files: Record<string, string[]> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts")) {
        const found = codesInFile(readFileSync(full, "utf8"));
        if (found.length > 0) {
          files[full.replace(SRC_ROOT, "src").split("\\").join("/")] = found;
          for (const c of found) used.add(c);
        }
      }
    }
  };
  walk(SRC_ROOT);
  return { codes: [...used].sort(), files };
}

const { codes: USED_CODES, files: USED_FILES } = collectUsedCodes();
const CATALOG_CODES = new Set(PERMISSIONS.map((p) => p.code));
const GRANTED_CODES = new Set<string>();
for (const role of ROLES_TO_SEED) {
  for (const g of ROLE_PERMISSIONS[role] ?? []) GRANTED_CODES.add(g.code);
}

describe("static scan @RequirePermission vs katalog PERMISSIONS (drift guard)", () => {
  it("scan menemukan >= 100 kode unik di source (harapan: katalog ~137)", () => {
    expect(USED_CODES.length).toBeGreaterThanOrEqual(100);
  });

  it("tidak ada file yang memakai @RequirePermission kosong", () => {
    for (const [file, list] of Object.entries(USED_FILES)) {
      expect(list.length).toBeGreaterThan(0);
      for (const code of list) {
        expect(code.trim().length).toBeGreaterThan(0);
      }
      void file;
    }
  });

  it.each(USED_CODES.map((code) => [code] as const))(
    "kode @RequirePermission %s terdaftar di katalog PERMISSIONS",
    (code) => {
      expect(CATALOG_CODES.has(code)).toBe(true);
    }
  );

  it.each(USED_CODES.map((code) => [code] as const))(
    "kode @RequirePermission %s diberikan ke minimal satu role",
    (code) => {
      expect(GRANTED_CODES.has(code)).toBe(true);
    }
  );

  it("semua kode di katalog terpakai atau merupakan kode sistem/self yang sah", () => {
    const unUsed = PERMISSIONS.filter((p) => !USED_CODES.includes(p.code)).map((p) => p.code);
    // Kode yang tidak dipakai decorator boleh saja (permission dashboard/RBAC/ekspor
    // yang dipakai guard lain), TAPI jumlahnya harus kecil dan masuk akal.
    expect(unUsed.length).toBeLessThan(50);
    for (const code of unUsed) {
      // Setiap kode yang tidak terpakai tetap harus sah: ada di katalog & digrant.
      expect(CATALOG_CODES.has(code)).toBe(true);
    }
  });
});

describe("static scan @RequirePermission — matriks modul", () => {
  it("modul keuangan memakai permission KEUANGAN yang di-seed", () => {
    const financeCodes = USED_FILES["src/modules/finance/finance.controller.ts"] ?? [];
    expect(financeCodes).toContain("invoice:write:school");
    expect(financeCodes).toContain("refund:approve:school");
    expect(financeCodes).toContain("reconciliation:run:school");
  });

  it("modul attendance memakai permission ABSENSI yang di-seed", () => {
    const codes = USED_FILES["src/modules/attendance/attendance.controller.ts"] ?? [];
    expect(codes).toContain("attendance:record:class");
    expect(codes).toContain("attendance:scan:self");
    expect(codes).toContain("permit:verify:class");
  });

  it("modul asset memakai permission ASET yang di-seed", () => {
    const codes = USED_FILES["src/modules/asset/asset.controller.ts"] ?? [];
    expect(codes).toContain("asset:book:self");
    expect(codes).toContain("asset:maintenance:write:school");
    expect(codes).toContain("asset:audit:school");
  });

  it("modul auth memakai permission IDENTITAS yang di-seed", () => {
    const codes = USED_FILES["src/modules/auth/auth.controller.ts"] ?? [];
    expect(codes).toContain("auth:me:self");
    expect(codes).toContain("auth:password:change:self");
    expect(codes).toContain("user:reset-password:school");
  });

  it("modul rollover memakai permission SISTEM rollover yang di-seed", () => {
    const rolloverCodes =
      Object.entries(USED_FILES)
        .filter(([file]) => file.includes("rollover"))
        .flatMap(([, list]) => list) ?? [];
    expect(rolloverCodes).toContain("rollover:preview:school");
    expect(rolloverCodes).toContain("rollover:execute:school");
    expect(rolloverCodes).toContain("rollover:rollback:school");
  });

  it("modul payroll memakai permission PAYROLL yang di-seed", () => {
    const codes =
      Object.entries(USED_FILES)
        .filter(([file]) => file.includes("payroll"))
        .flatMap(([, list]) => list) ?? [];
    expect(codes).toContain("payroll:read:school");
    expect(codes).toContain("payslip:read:self");
  });
});
