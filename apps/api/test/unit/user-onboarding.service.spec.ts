/**
 * Unit test — UserOnboardingService (tur onboarding per user).
 * 1. getMe: row dibuat lazy dengan role terpilih + langkah role-specific.
 * 2. resolvePrimaryRole: SUPERADMIN menang atas role lain (multi-role).
 * 3. complete/dismiss/progress mengubah state row user_onboarding.
 */
import "reflect-metadata";
import {
  resolvePrimaryRole,
  UserOnboardingService
} from "../../src/modules/onboarding/user-onboarding.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";
import type { Prisma } from "@prisma/client";

const ROW_BASE = {
  id: "ob-1",
  user_id: "user-1",
  role: "SUPERADMIN",
  steps_completed: null as Prisma.JsonValue | null,
  is_completed: false,
  completed_at: null as Date | null,
  dismissed_at: null as Date | null,
  updated_at: new Date("2026-08-07T00:00:00.000Z")
};

describe("resolvePrimaryRole", () => {
  it("memilih SUPERADMIN saat user multi-role (SUPERADMIN + SISWA)", () => {
    expect(resolvePrimaryRole(["SISWA", "SUPERADMIN"])).toBe("SUPERADMIN");
  });

  it("fallback ke SISWA saat role kosong", () => {
    expect(resolvePrimaryRole([])).toBe("SISWA");
  });
});

describe("UserOnboardingService", () => {
  let db: MockDb;
  let service: UserOnboardingService;

  beforeEach(() => {
    db = createMockDb();
    service = new UserOnboardingService(db as never);
  });

  it("getMe membuat row baru (lazy) dengan role + langkah SUPERADMIN", async () => {
    mockFn(db, "userOnboarding", "findUnique").mockResolvedValue(null);
    const created = { ...ROW_BASE, role: "SUPERADMIN" };
    mockFn(db, "userOnboarding", "create").mockResolvedValue(created);

    const view = await service.getMe("user-1", ["SUPERADMIN"]);
    expect(view.isCompleted).toBe(false);
    expect(view.dismissedAt).toBeNull();
    expect(view.steps.length).toBeGreaterThanOrEqual(5);
    expect(view.steps[0]?.title).toContain("Selamat Datang");
    expect(created.role).toBe("SUPERADMIN");
  });

  it("getMe memakai row yang sudah ada (langkah GURU untuk role GURU)", async () => {
    mockFn(db, "userOnboarding", "findUnique").mockResolvedValue({
      ...ROW_BASE,
      role: "GURU"
    });
    const view = await service.getMe("user-1", ["GURU"]);
    expect(view.steps.length).toBeGreaterThanOrEqual(5);
    expect(view.steps.some((st) => st.key === "tugas")).toBe(true);
  });

  it("getMe memperbarui role bila berubah (promosi ke SUPERADMIN)", async () => {
    mockFn(db, "userOnboarding", "findUnique").mockResolvedValue({ ...ROW_BASE, role: "SISWA" });
    const updated = { ...ROW_BASE, role: "SUPERADMIN" };
    mockFn(db, "userOnboarding", "update").mockResolvedValue(updated);

    const view = await service.getMe("user-1", ["SUPERADMIN"]);
    expect(mockFn(db, "userOnboarding", "update")).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: "SUPERADMIN" } })
    );
    expect(view.steps.some((st) => st.key === "maintenance")).toBe(true);
  });

  it("complete menandai is_completed + completed_at", async () => {
    mockFn(db, "userOnboarding", "findUnique").mockResolvedValue(ROW_BASE);
    const done = {
      ...ROW_BASE,
      is_completed: true,
      completed_at: new Date("2026-08-07T02:00:00Z")
    };
    mockFn(db, "userOnboarding", "update").mockResolvedValue(done);

    const view = await service.complete("user-1");
    expect(view.isCompleted).toBe(true);
    expect(view.completedAt).toBe("2026-08-07T02:00:00.000Z");
    expect(mockFn(db, "userOnboarding", "update")).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "user-1" },
        data: expect.objectContaining({ is_completed: true, completed_at: expect.any(Date) })
      })
    );
  });

  it("dismiss mencatat dismissed_at", async () => {
    mockFn(db, "userOnboarding", "findUnique").mockResolvedValue(ROW_BASE);
    const dismissed = {
      ...ROW_BASE,
      dismissed_at: new Date("2026-08-07T03:00:00Z")
    };
    mockFn(db, "userOnboarding", "update").mockResolvedValue(dismissed);

    const view = await service.dismiss("user-1");
    expect(view.dismissedAt).toBe("2026-08-07T03:00:00.000Z");
    expect(view.isCompleted).toBe(false);
  });

  it("updateProgress menambah stepKey saat done=true", async () => {
    mockFn(db, "userOnboarding", "findUnique").mockResolvedValue(ROW_BASE);
    const withStep = {
      ...ROW_BASE,
      steps_completed: ["welcome", "dashboard"] as unknown as Prisma.JsonValue
    };
    mockFn(db, "userOnboarding", "update").mockResolvedValue(withStep);

    const view = await service.updateProgress("user-1", { stepKey: "dashboard", done: true }, [
      "SUPERADMIN"
    ]);
    expect(view.completedSteps).toEqual(["welcome", "dashboard"]);
    expect(mockFn(db, "userOnboarding", "update")).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ steps_completed: expect.any(Array) })
      })
    );
  });

  it("updateProgress menghapus stepKey saat done=false", async () => {
    mockFn(db, "userOnboarding", "findUnique").mockResolvedValue({
      ...ROW_BASE,
      steps_completed: ["welcome", "dashboard"] as unknown as Prisma.JsonValue
    });
    mockFn(db, "userOnboarding", "update").mockResolvedValue({
      ...ROW_BASE,
      steps_completed: ["welcome"] as unknown as Prisma.JsonValue
    });

    const view = await service.updateProgress("user-1", { stepKey: "dashboard", done: false }, [
      "SUPERADMIN"
    ]);
    expect(view.completedSteps).toEqual(["welcome"]);
  });
});
