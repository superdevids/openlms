/**
 * Unit test — lib/roles: roleGroupFor semua role (termasuk 3 eksternal yang
 * kini punya grup sendiri: calonsiswa/pembimbing/penguji), roleHome, roleLabel,
 * visibleNav dengan filter role & feature flag.
 */
import { describe, expect, it } from "vitest";
import {
  roleGroupFor,
  roleHome,
  roleLabel,
  visibleNav,
  primaryRoleOf,
  switchableRoles,
  resolveActiveRole,
  ROLE_PRIORITY
} from "../roles";
import { NAV_ITEMS } from "../roles";

describe("lib/roles — primaryRoleOf (multi-role, item 18)", () => {
  it("memilih role tertinggi sesuai ROLE_PRIORITY", () => {
    expect(primaryRoleOf(["GURU", "KEPSEK"])).toBe("KEPSEK");
    expect(primaryRoleOf(["GURU", "BK", "WAKEPSEK"])).toBe("WAKEPSEK");
    expect(primaryRoleOf(["SISWA", "CALON_SISWA"])).toBe("SISWA");
  });

  it("ROLE_PRIORITY mirror lms-audit (SUPERADMIN > KEPSEK > ... > PENGUJI_EKSTERNAL)", () => {
    expect(ROLE_PRIORITY[0]).toBe("SUPERADMIN");
    expect(ROLE_PRIORITY[1]).toBe("KEPSEK");
    expect(ROLE_PRIORITY[ROLE_PRIORITY.length - 1]).toBe("PENGUJI_EKSTERNAL");
  });

  it("fallback ke roles[0] bila tidak dikenal", () => {
    expect(primaryRoleOf(["ROLE_X" as never, "ROLE_Y" as never])).toBe("ROLE_X" as never);
    expect(primaryRoleOf([])).toBeUndefined();
  });
});

describe("lib/roles — switchableRoles (item 18)", () => {
  it("mengecualikan SUPERADMIN & SISWA", () => {
    expect(switchableRoles(["SUPERADMIN", "SISWA"])).toEqual([]);
    expect(switchableRoles(["GURU", "SISWA"])).toEqual(["GURU"]);
    expect(switchableRoles(["KEPSEK", "GURU", "SUPERADMIN"])).toEqual(["KEPSEK", "GURU"]);
  });

  it("mempertahankan urutan input", () => {
    expect(switchableRoles(["GURU", "KEPSEK", "WALI_MURID"])).toEqual([
      "GURU",
      "KEPSEK",
      "WALI_MURID"
    ]);
  });
});

describe("lib/roles — resolveActiveRole (item 18)", () => {
  it("menerima stored role yang termasuk switchable", () => {
    expect(resolveActiveRole({ roles: ["KEPSEK", "GURU"] }, "GURU")).toBe("GURU");
    expect(resolveActiveRole({ roles: ["KEPSEK", "GURU"] }, "KEPSEK")).toBe("KEPSEK");
  });

  it("menolak stored role yang tidak termasuk switchable (SUPERADMIN/SISWA)", () => {
    expect(resolveActiveRole({ roles: ["GURU", "SISWA"] }, "SISWA")).toBe("GURU");
    expect(resolveActiveRole({ roles: ["SUPERADMIN"] }, "SUPERADMIN")).toBe("SUPERADMIN");
  });

  it("menolak stored role yang bukan milik user → fallback primaryRoleOf", () => {
    expect(resolveActiveRole({ roles: ["KEPSEK", "GURU"] }, "OPERATOR")).toBe("KEPSEK");
    expect(resolveActiveRole({ roles: ["OPERATOR", "GURU"] }, "KEUANGAN")).toBe("OPERATOR");
  });

  it("stored null/undefined → fallback primaryRoleOf", () => {
    expect(resolveActiveRole({ roles: ["KEPSEK", "GURU"] }, null)).toBe("KEPSEK");
    expect(resolveActiveRole({ roles: ["KEPSEK", "GURU"] }, undefined)).toBe("KEPSEK");
  });

  it("user tanpa roles → undefined", () => {
    expect(resolveActiveRole({ roles: [] }, null)).toBeUndefined();
  });
});

describe("lib/roles — roleGroupFor", () => {
  it("memetakan role internal ke grup yang benar", () => {
    expect(roleGroupFor("SISWA")).toBe("siswa");
    expect(roleGroupFor("GURU")).toBe("guru");
    expect(roleGroupFor("BK")).toBe("guru");
    expect(roleGroupFor("KAPRODI")).toBe("guru");
    expect(roleGroupFor("OPERATOR")).toBe("admin");
    expect(roleGroupFor("KEUANGAN")).toBe("admin");
    expect(roleGroupFor("WAKEPSEK")).toBe("admin");
    expect(roleGroupFor("KEPSEK")).toBe("admin");
    expect(roleGroupFor("AUDITOR")).toBe("admin");
    expect(roleGroupFor("SUPERADMIN")).toBe("superadmin");
    expect(roleGroupFor("WALI_MURID")).toBe("ortu");
  });

  it("role eksternal memetakan ke grup khusus (calonsiswa/pembimbing/penguji)", () => {
    expect(roleGroupFor("CALON_SISWA")).toBe("calonsiswa");
    expect(roleGroupFor("PEMBIMBING_INDUSTRI")).toBe("pembimbing");
    expect(roleGroupFor("PENGUJI_EKSTERNAL")).toBe("penguji");
  });

  it("undefined / role tidak dikenal → null", () => {
    expect(roleGroupFor(undefined)).toBeNull();
    expect(roleGroupFor("HACKER" as never)).toBeNull();
  });
});

describe("lib/roles — roleHome", () => {
  it("mengarahkan ke dashboard per grup", () => {
    expect(roleHome("SISWA")).toBe("/siswa/dashboard");
    expect(roleHome("GURU")).toBe("/guru/dashboard");
    expect(roleHome("OPERATOR")).toBe("/admin/dashboard");
    expect(roleHome("SUPERADMIN")).toBe("/superadmin/dashboard");
    expect(roleHome("WALI_MURID")).toBe("/ortu/dashboard");
  });

  it("role eksternal → dashboard masing-masing (bukan login)", () => {
    expect(roleHome("CALON_SISWA")).toBe("/calonsiswa/dashboard");
    expect(roleHome("PEMBIMBING_INDUSTRI")).toBe("/pembimbing/dashboard");
    expect(roleHome("PENGUJI_EKSTERNAL")).toBe("/penguji/dashboard");
  });

  it("role tanpa grup → /login", () => {
    expect(roleHome(undefined)).toBe("/login");
    expect(roleHome("HACKER" as never)).toBe("/login");
  });
});

describe("lib/roles — roleLabel", () => {
  it("memberi label Indonesia untuk semua role", () => {
    expect(roleLabel("SISWA")).toBe("Siswa");
    expect(roleLabel("BK")).toBe("Guru BK");
    expect(roleLabel("KAPRODI")).toBe("Kepala Program Keahlian");
    expect(roleLabel("KEUANGAN")).toBe("Keuangan");
    expect(roleLabel("OPERATOR")).toBe("Operator / TU");
    expect(roleLabel("WAKEPSEK")).toBe("Wakil Kepala Sekolah");
    expect(roleLabel("KEPSEK")).toBe("Kepala Sekolah");
    expect(roleLabel("AUDITOR")).toBe("Auditor");
    expect(roleLabel("SUPERADMIN")).toBe("Superadmin");
    expect(roleLabel("CALON_SISWA")).toBe("Calon Siswa");
    expect(roleLabel("WALI_MURID")).toBe("Orang Tua / Wali");
    expect(roleLabel("PEMBIMBING_INDUSTRI")).toBe("Pembimbing Industri");
    expect(roleLabel("PENGUJI_EKSTERNAL")).toBe("Penguji Eksternal");
  });

  it("fallback ke nilai role untuk yang tidak dikenal", () => {
    expect(roleLabel("ROLE_X" as never)).toBe("ROLE_X");
  });
});

describe("lib/roles — visibleNav", () => {
  const flags = (enabledKeys: string[]): { key: string; enabled: boolean }[] =>
    ["LMS_ASSIGNMENT", "LMS_EXAM", "FINANCE_INVOICE", "ACADEMIC_ROLLOVER"].map((key) => ({
      key,
      enabled: enabledKeys.includes(key)
    }));

  it("item tanpa featureFlagKey selalu tampil", () => {
    const items = visibleNav("siswa", flags([]));
    expect(items.some((i) => i.label === "Beranda")).toBe(true);
    expect(items.some((i) => i.label === "Kelas")).toBe(true);
  });

  it("item dengan flag OFF disembunyikan", () => {
    const items = visibleNav("siswa", flags([]));
    expect(items.some((i) => i.label === "Ujian")).toBe(false);
    expect(items.some((i) => i.label === "Kuis")).toBe(false);
  });

  it("item dengan flag ON ditampilkan", () => {
    const items = visibleNav("siswa", flags(["LMS_EXAM"]));
    expect(items.some((i) => i.label === "Ujian")).toBe(true);
    expect(items.some((i) => i.label === "Kuis")).toBe(false);
  });

  it("flag tidak dikenal dianggap OFF (fail-closed)", () => {
    const items = visibleNav("siswa", [{ key: "LMS_EXAM", enabled: true }]);
    expect(items.some((i) => i.label === "Tugas")).toBe(false);
  });

  it("filter role: item role-only hanya muncul bila role user beririsan", () => {
    const admin = visibleNav("admin", flags(["FINANCE_INVOICE"]), ["KEPSEK"]);
    expect(admin.some((i) => i.label === "Change Log")).toBe(true);
  });

  it("filter role menolak item role lain (KEPSEK-only tak tampil untuk OPERATOR)", () => {
    const items = visibleNav("admin", flags(["FINANCE_INVOICE"]), ["OPERATOR"]);
    expect(items.some((i) => i.label === "Change Log")).toBe(false);
  });

  it("NAV_ITEMS lengkap untuk semua grup termasuk eksternal", () => {
    for (const group of [
      "siswa",
      "guru",
      "admin",
      "superadmin",
      "ortu",
      "calonsiswa",
      "pembimbing",
      "penguji"
    ] as const) {
      expect(NAV_ITEMS[group].length).toBeGreaterThan(0);
    }
  });
});
