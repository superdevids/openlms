import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@openlms/database";

export interface ResolvedScope {
  classIds: string[];
  homeroomClassId: string | null;
}

/**
 * ScopeResolver — prd04 §4.1, F1-T3.
 * Menentukan cakupan data (SENDIRI/KELAS/SEKOLAH) seorang user:
 * - classIds: kelas yang diajar (ClassSubject.teacher_id) + kelas yang diikuti (Enrollment).
 * - homeroomClassId: kelas di mana user menjadi wali kelas (Class.homeroom_teacher_id).
 */
@Injectable()
export class ScopeResolver {
  constructor(private readonly prisma: PrismaClient) {}

  async resolve(userId: string): Promise<ResolvedScope> {
    const [taught, enrolled, homeroom] = await Promise.all([
      this.prisma.classSubject.findMany({
        where: { teacher_id: userId },
        select: { class_id: true }
      }),
      this.prisma.enrollment.findMany({
        where: { student_id: userId, status: "ACTIVE" },
        select: { class_id: true }
      }),
      this.prisma.class.findFirst({
        where: { homeroom_teacher_id: userId },
        select: { id: true }
      })
    ]);

    const classIds = [
      ...new Set<string>([...taught.map((t) => t.class_id), ...enrolled.map((e) => e.class_id)])
    ];

    return { classIds, homeroomClassId: homeroom?.id ?? null };
  }
}
