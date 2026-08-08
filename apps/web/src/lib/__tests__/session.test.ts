/**
 * Unit test — lib/session: normalizeMe, readDemoRoleOverride, fetchDemoSession,
 * isUnauthorizedError.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchDemoSession,
  isUnauthorizedError,
  normalizeMe,
  readDemoRoleOverride
} from "../session";

describe("lib/session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("normalizeMe", () => {
    it("memetakan payload {user, roles}", () => {
      const user = normalizeMe({
        user: { id: "u1", username: "budi", fullName: "Budi Santoso", roles: [] } as never,
        roles: ["GURU", "BK"]
      });
      expect(user.id).toBe("u1");
      expect(user.fullName).toBe("Budi Santoso");
      expect(user.roles).toEqual(["GURU", "BK"]);
      expect(user.primaryRole).toBe("GURU");
    });

    it("memetakan payload flat (raw user sebagai root)", () => {
      const user = normalizeMe({
        id: "u2",
        username: "sari",
        fullName: "Sari",
        roles: ["SISWA"]
      });
      expect(user.id).toBe("u2");
      expect(user.roles).toEqual(["SISWA"]);
    });

    it("default untuk field kosong: id/username '', fullName 'Pengguna'", () => {
      const user = normalizeMe({});
      expect(user.id).toBe("");
      expect(user.username).toBe("");
      expect(user.fullName).toBe("Pengguna");
      expect(user.roles).toEqual([]);
      expect(user.primaryRole).toBeUndefined();
    });

    it("fullName fallback ke username", () => {
      const user = normalizeMe({ user: { id: "u3", username: "admin", roles: [] } as never });
      expect(user.fullName).toBe("admin");
    });

    it("primaryRole fallback ke roles[0]", () => {
      const user = normalizeMe({
        user: { id: "u4", roles: [] } as never,
        roles: ["OPERATOR", "SUPERADMIN"]
      });
      expect(user.primaryRole).toBe("OPERATOR");
    });
  });

  describe("readDemoRoleOverride", () => {
    it("mengembalikan null saat bukan DEMO_MODE", () => {
      // DEMO_MODE dari env — di test default false.
      expect(readDemoRoleOverride()).toBeNull();
    });

    it("mengembalikan null saat storage tidak punya key", () => {
      expect(readDemoRoleOverride()).toBeNull();
    });
  });

  describe("fetchDemoSession", () => {
    it("memakai DEMO_USER dengan roles default SUPERADMIN", async () => {
      const session = await fetchDemoSession();
      expect(session.roles).toContain("SUPERADMIN");
      expect(session.id).toBe("usr_demo");
    });

    it("readDemoRoleOverride gagal → tetap DEMO_USER", async () => {
      const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("denied");
      });
      const session = await fetchDemoSession();
      expect(session.roles).toContain("SUPERADMIN");
      spy.mockRestore();
    });
  });

  describe("isUnauthorizedError", () => {
    it("true untuk Error dengan code UNAUTHORIZED", () => {
      const err = Object.assign(new Error("x"), { code: "UNAUTHORIZED" });
      expect(isUnauthorizedError(err)).toBe(true);
    });

    it("false untuk Error biasa / tanpa code", () => {
      expect(isUnauthorizedError(new Error("x"))).toBe(false);
      expect(isUnauthorizedError("string")).toBe(false);
      expect(isUnauthorizedError(undefined)).toBe(false);
    });

    it("false untuk code lain", () => {
      const err = Object.assign(new Error("x"), { code: "FORBIDDEN" });
      expect(isUnauthorizedError(err)).toBe(false);
    });
  });
});
