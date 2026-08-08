/**
 * Unit test — AdminStatsService (R-06): statistik nyata dashboard SUPERADMIN.
 */
import "reflect-metadata";
import { AdminStatsService } from "../../src/modules/admin-stats/admin-stats.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

describe("AdminStatsService", () => {
  let db: MockDb;
  let service: AdminStatsService;

  beforeEach(() => {
    db = createMockDb();
    service = new AdminStatsService(db);
  });

  it("menghitung user per role + kelas + tahun ajaran + adopsi fitur", async () => {
    mockFn(db, "userRole", "findMany").mockResolvedValue([
      { role: "SISWA" },
      { role: "SISWA" },
      { role: "GURU" },
      { role: "GURU_BK" },
      { role: "OPERATOR" }
    ]);
    mockFn(db, "class", "count").mockResolvedValue(48);
    mockFn(db, "schoolProfile", "findFirst").mockResolvedValue({
      id: "school-1",
      current_academic_year: {
        id: "year-1",
        code: "2026/2027",
        name: "Tahun Ajaran 2026/2027",
        status: "OPEN"
      }
    });
    mockFn(db, "featureFlag", "findMany").mockResolvedValue([
      { key: "A", is_system: false, default_enabled: true },
      { key: "B", is_system: false, default_enabled: true },
      { key: "C", is_system: false, default_enabled: false },
      { key: "SYS", is_system: true, default_enabled: false }
    ]);
    mockFn(db, "appFeatureSetting", "findMany").mockResolvedValue([
      { feature_key: "B", enabled: false }
    ]);

    const stats = await service.getDashboardStats();

    expect(stats.totalStudents).toBe(2);
    expect(stats.totalTeachers).toBe(2);
    expect(stats.totalClasses).toBe(48);
    expect(stats.academicYear?.code).toBe("2026/2027");
    expect(stats.featureFlagsTotal).toBe(4);
    // A=true (default), B=false (setting override), C=false, SYS=true (sistem) → 2 ON
    expect(stats.featureFlagsEnabled).toBe(2);
    expect(stats.adoptionPercent).toBe(50);
    expect(stats.usersByRole).toContainEqual({ role: "SISWA", count: 2 });
  });

  it("menangani DB kosong (tanpa user/kelas/tahun ajaran)", async () => {
    mockFn(db, "userRole", "findMany").mockResolvedValue([]);
    mockFn(db, "class", "count").mockResolvedValue(0);
    mockFn(db, "schoolProfile", "findFirst").mockResolvedValue(null);
    mockFn(db, "featureFlag", "findMany").mockResolvedValue([]);
    mockFn(db, "appFeatureSetting", "findMany").mockResolvedValue([]);

    const stats = await service.getDashboardStats();
    expect(stats.totalStudents).toBe(0);
    expect(stats.totalTeachers).toBe(0);
    expect(stats.totalClasses).toBe(0);
    expect(stats.academicYear).toBeNull();
    expect(stats.adoptionPercent).toBe(0);
  });
});
