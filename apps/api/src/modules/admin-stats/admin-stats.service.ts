import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";

export interface StatsUsersByRole {
  role: string;
  count: number;
}

export interface DashboardStatsView {
  usersByRole: StatsUsersByRole[];
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: string;
  } | null;
  adoptionPercent: number;
  featureFlagsEnabled: number;
  featureFlagsTotal: number;
}

/**
 * AdminStatsService — statistik dashboard SUPERADMIN (R-06).
 * GET /admin/dashboard/stats menghitung data NYATA dari database:
 * user per role (UserRole ACTIVE), jumlah kelas aktif, tahun ajaran berjalan
 * (dari SchoolProfile.current_academic_year_id), dan adopsi fitur
 * (% feature flag efektif ON).
 */
@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboardStats(): Promise<DashboardStatsView> {
    const [userRoles, classes, school, flags, settings] = await Promise.all([
      this.prisma.userRole.findMany({
        where: { status: "ACTIVE" },
        select: { role: true }
      }),
      this.prisma.class.count({ where: { is_active: true } }),
      this.prisma.schoolProfile.findFirst({
        include: {
          current_academic_year: { select: { id: true, code: true, name: true, status: true } }
        }
      }),
      this.prisma.featureFlag.findMany({
        select: { key: true, is_system: true, default_enabled: true }
      }),
      this.prisma.appFeatureSetting.findMany({ select: { feature_key: true, enabled: true } })
    ]);

    const byRole = new Map<string, number>();
    for (const ur of userRoles) {
      byRole.set(ur.role, (byRole.get(ur.role) ?? 0) + 1);
    }
    const usersByRole: StatsUsersByRole[] = Array.from(byRole.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    const settingByKey = new Map(settings.map((s) => [s.feature_key, s.enabled]));
    let enabledCount = 0;
    for (const flag of flags) {
      const enabled = flag.is_system
        ? true
        : settingByKey.has(flag.key)
          ? settingByKey.get(flag.key)!
          : flag.default_enabled;
      if (enabled) enabledCount += 1;
    }
    const featureFlagsTotal = flags.length;
    const adoptionPercent =
      featureFlagsTotal > 0 ? Math.round((enabledCount / featureFlagsTotal) * 1000) / 10 : 0;

    const academicYear = school?.current_academic_year
      ? {
          id: school.current_academic_year.id,
          code: school.current_academic_year.code,
          name: school.current_academic_year.name,
          status: school.current_academic_year.status as string
        }
      : null;

    return {
      usersByRole,
      totalStudents: byRole.get("SISWA") ?? 0,
      totalTeachers: (byRole.get("GURU") ?? 0) + (byRole.get("BK") ?? 0),
      totalClasses: classes,
      academicYear,
      adoptionPercent,
      featureFlagsEnabled: enabledCount,
      featureFlagsTotal
    };
  }
}
