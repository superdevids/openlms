/**
 * RolloverService — migrasi tahun ajaran (prd04 §5.R; 05 M-ROLLOVER-T1..T6).
 *
 * State machine RolloverRun: DRAFT -> PREVIEW -> RUNNING -> DONE/FAILED,
 * FAILED -> (resume execute) ; DONE -> ROLLED_BACK (window 7 hari, pristine).
 * RUNNING basi (proses crash, updated_at > 10 menit) diklaim ulang otomatis
 * menjadi FAILED agar bisa di-resume — lihat execute().
 *
 * Strategi job: BullMQ belum terpasang di workspace ini, jadi execute berjalan
 * SEQUENTIAL dengan transaksi per langkah (state di step_state) dan dapat
 * dilanjutkan (resume) dari status FAILED tanpa mengulang langkah DONE.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AcademicYear, RolloverRun } from "@prisma/client";
import type {
  AcademicYearStatus,
  EnrollmentStatus,
  RolloverAction,
  RolloverRunStatus
} from "@opensis/types";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { resolveActorRole } from "../lms/lms-audit";
import { ArchivedYearException } from "../academic/academic-year.guard";
import {
  buildPromotionPlan,
  DEFAULT_PROMOTION_CONFIG,
  PromotionConfig,
  PromotionPlan,
  StudentEvaluation
} from "./rollover.promotion";
import {
  DEFAULT_EXPECTED_SCHOOL_DAYS,
  ROLLBACK_WINDOW_DAYS,
  RolloverStepName
} from "./rollover.constants";

export interface RolloverPreferences {
  passingScore?: number;
  minAttendanceRate?: number;
  /** Override promosi per siswa (draft). */
  overrides?: Record<string, RolloverAction>;
  includeFinanceRollover?: boolean;
  includePayrollRollover?: boolean;
  ppdbTargetClassId?: string;
  backup?: { confirmed: boolean; label?: string };
  expectedSchoolDays?: number;
}

export interface CreateRolloverDraftInput {
  sourceYearId: string;
  newYearCode: string;
  newYearName: string;
  startDate: string;
  endDate: string;
  idempotencyKey?: string;
  passingScore?: number;
  minAttendanceRate?: number;
  overrides?: Record<string, RolloverAction>;
  includeFinanceRollover?: boolean;
  includePayrollRollover?: boolean;
  ppdbTargetClassId?: string;
  backup?: { confirmed: boolean; label?: string };
}

export interface Blocker {
  code: string;
  message: string;
}

export interface PrecheckResult {
  ok: boolean;
  blockers: Blocker[];
  warnings: string[];
  checkedAt: string;
}

interface RolloverStepState {
  preferences?: RolloverPreferences;
  steps?: Partial<Record<RolloverStepName, "DONE">>;
  currentStep?: string | null;
  dryRunPlan?: PromotionPlan | null;
  error?: string;
  created?: {
    classIdByKey: Record<string, string>;
    enrollmentIds: string[];
    alumniIds: string[];
    previousEnrollmentStatus: Record<string, EnrollmentStatus>;
    previousSourceStatus: AcademicYearStatus;
    previousSchoolProfileYearId: string | null;
    ppdbEnrolledIds: string[];
  };
}

/** Ambang RUNNING basi (ms) — proses rollover yang berhenti > ambang diklaim ulang. */
const STALE_RUNNING_MS = 10 * 60 * 1000;

function defaultPrefs(): RolloverPreferences {
  return {
    passingScore: DEFAULT_PROMOTION_CONFIG.passingScore,
    minAttendanceRate: DEFAULT_PROMOTION_CONFIG.minAttendanceRate,
    overrides: {},
    includeFinanceRollover: false,
    includePayrollRollover: false,
    backup: { confirmed: false },
    expectedSchoolDays: DEFAULT_EXPECTED_SCHOOL_DAYS
  };
}

function readStepState(run: RolloverRun): RolloverStepState {
  return (run.step_state as unknown as RolloverStepState | null) ?? {};
}

function promotionConfig(prefs: RolloverPreferences): PromotionConfig {
  return {
    passingScore: prefs.passingScore ?? DEFAULT_PROMOTION_CONFIG.passingScore,
    minAttendanceRate: prefs.minAttendanceRate ?? DEFAULT_PROMOTION_CONFIG.minAttendanceRate,
    maxGradeLevel: DEFAULT_PROMOTION_CONFIG.maxGradeLevel
  };
}

@Injectable()
export class RolloverService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  /** T1 — draft: buat tahun ajaran baru (DRAFT) + RolloverRun (DRAFT). */
  async draft(userId: string, input: CreateRolloverDraftInput): Promise<RolloverRun> {
    if (!input.sourceYearId || !input.newYearCode || !input.newYearName) {
      throw new BadRequestException("sourceYearId, newYearCode, newYearName wajib diisi");
    }
    const source = await this.db.academicYear.findUnique({ where: { id: input.sourceYearId } });
    if (!source) throw new NotFoundException("Tahun ajaran sumber tidak ditemukan");
    if (source.status === "CLOSED") throw new ArchivedYearException(source.code);
    if (source.status !== "OPEN") {
      throw new ConflictException(`Tahun sumber harus OPEN, saat ini ${source.status}`);
    }

    const existingRun = await this.db.rolloverRun.findUnique({
      where: { academic_year_id: source.id }
    });
    if (existingRun) {
      throw new ConflictException("Rollover untuk tahun ajaran ini sudah ada (satu run per tahun)");
    }
    const codeTaken = await this.db.academicYear.findUnique({ where: { code: input.newYearCode } });
    if (codeTaken)
      throw new ConflictException(`Kode tahun ajaran ${input.newYearCode} sudah dipakai`);

    const newYear = await this.db.academicYear.create({
      data: {
        code: input.newYearCode,
        name: input.newYearName,
        start_date: new Date(input.startDate),
        end_date: new Date(input.endDate),
        status: "DRAFT",
        created_by: userId
      }
    });

    const preferences: RolloverPreferences = {
      ...defaultPrefs(),
      passingScore: input.passingScore,
      minAttendanceRate: input.minAttendanceRate,
      overrides: input.overrides ?? {},
      includeFinanceRollover: input.includeFinanceRollover,
      includePayrollRollover: input.includePayrollRollover,
      ppdbTargetClassId: input.ppdbTargetClassId,
      backup: input.backup
    };

    return this.db.rolloverRun.create({
      data: {
        academic_year_id: source.id,
        new_academic_year_id: newYear.id,
        status: "DRAFT",
        idempotency_key: input.idempotencyKey ?? `rollover:${source.code}:${newYear.code}`,
        step_state: {
          preferences,
          steps: {}
        } as unknown as Prisma.InputJsonValue
      }
    });
  }

  /** T2 — pre-check: laporan bloker sebelum eksekusi. */
  async precheck(runId: string): Promise<PrecheckResult> {
    const run = await this.getRun(runId);
    if (!["DRAFT", "PREVIEW", "FAILED"].includes(run.status)) {
      throw new ConflictException(`Pre-check tidak bisa dari status ${run.status}`);
    }
    const source = await this.requireYear(run.academic_year_id);
    const prefs = readStepState(run).preferences ?? defaultPrefs();

    const blockers: Blocker[] = [];
    const warnings: string[] = [];

    if (source.status !== "OPEN") {
      blockers.push({
        code: "source-not-open",
        message: `Tahun sumber berstatus ${source.status}; rollover hanya untuk tahun OPEN`
      });
    }

    const enrollments = await this.db.enrollment.findMany({
      where: { academic_year_id: source.id, status: "ACTIVE" },
      include: { class: { include: { class_subjects: true } } }
    });

    // Batch grade + attendance dalam 2 query (hindari N+1 per enrollment).
    const studentIds = enrollments.map((e) => e.student_id);
    const grades = await this.db.grade.findMany({
      where: { student_id: { in: studentIds }, academic_year: source.code }
    });
    const attendanceRows = await this.db.attendance.groupBy({
      by: ["student_id"],
      where: {
        student_id: { in: studentIds },
        date: { gte: source.start_date, lte: source.end_date }
      },
      _count: true
    });

    const gradedSubjectIdsByStudent = new Map<string, Set<string>>();
    for (const g of grades) {
      const ids = gradedSubjectIdsByStudent.get(g.student_id) ?? new Set<string>();
      ids.add(g.class_subject_id);
      gradedSubjectIdsByStudent.set(g.student_id, ids);
    }
    const attendanceCountByStudent = new Map(attendanceRows.map((r) => [r.student_id, r._count]));

    let missingGrades = 0;
    let missingAttendance = 0;
    for (const enrollment of enrollments) {
      const gradedSubjectIds =
        gradedSubjectIdsByStudent.get(enrollment.student_id) ?? new Set<string>();
      const expectedSubjectIds = (enrollment.class?.class_subjects ?? []).map((cs) => cs.id);
      const missing = expectedSubjectIds.filter((id) => !gradedSubjectIds.has(id)).length;
      if (missing > 0) missingGrades += 1;

      const attendanceCount = attendanceCountByStudent.get(enrollment.student_id) ?? 0;
      if (attendanceCount === 0) missingAttendance += 1;
    }
    if (missingGrades > 0) {
      blockers.push({
        code: "grades-not-final",
        message: `${missingGrades} siswa belum punya nilai lengkap (rapor belum final)`
      });
    }
    if (missingAttendance > 0) {
      blockers.push({
        code: "attendance-not-final",
        message: `${missingAttendance} siswa belum punya catatan absensi`
      });
    }

    const activeQuiz = await this.db.quizAttempt.count({ where: { status: "IN_PROGRESS" } });
    const activeExam = await this.db.examAttempt.count({ where: { status: "IN_PROGRESS" } });
    if (activeQuiz + activeExam > 0) {
      blockers.push({
        code: "active-attempts",
        message: `${activeQuiz + activeExam} attempt ujian/kuis masih IN_PROGRESS`
      });
    }

    if (prefs.includeFinanceRollover) {
      const unpaid = await this.db.invoice.count({
        where: { academic_year: source.code, status: { in: ["PENDING", "OVERDUE"] } }
      });
      if (unpaid > 0) {
        blockers.push({
          code: "invoice-pending",
          message: `${unpaid} tagihan belum lunas saat includeFinanceRollover aktif`
        });
      }
    }
    if (prefs.includePayrollRollover) {
      warnings.push(
        "includePayrollRollover aktif tetapi tidak ada entitas payroll di schema — langkah payroll dilewati"
      );
    }
    if (!prefs.backup?.confirmed) {
      blockers.push({
        code: "backup-not-confirmed",
        message: "Backup belum dikonfirmasi; set preferences.backup.confirmed pada draft"
      });
    }

    const result: PrecheckResult = {
      ok: blockers.length === 0,
      blockers,
      warnings,
      checkedAt: new Date().toISOString()
    };

    await this.db.rolloverRun.update({
      where: { id: run.id },
      data: { status: "PREVIEW", precheck_result: result as unknown as Prisma.InputJsonValue }
    });
    return result;
  }

  /** T3 — dry-run: hitung rencana promosi TANPA menulis entitas. */
  async dryRun(runId: string): Promise<PromotionPlan> {
    const run = await this.getRun(runId);
    if (run.status !== "PREVIEW") {
      throw new ConflictException("Jalankan pre-check terlebih dahulu (status harus PREVIEW)");
    }
    const source = await this.requireYear(run.academic_year_id);
    const prefs = readStepState(run).preferences ?? defaultPrefs();

    const plan = await this.buildPlan(source, prefs);

    const state = readStepState(run);
    await this.db.rolloverRun.update({
      where: { id: run.id },
      data: {
        step_state: { ...state, dryRunPlan: plan } as unknown as Prisma.InputJsonValue
      }
    });
    return plan;
  }

  /** T4/T5 — execute: terapkan rencana, resume dari FAILED, konsisten dgn dry-run. */
  async execute(runId: string, actorId: string): Promise<RolloverRun> {
    const run = await this.getRun(runId);
    const staleRunning =
      run.status === "RUNNING" &&
      run.updated_at != null &&
      Date.now() - run.updated_at.getTime() > STALE_RUNNING_MS;
    if (
      run.status === "DONE" ||
      run.status === "ROLLED_BACK" ||
      (run.status === "RUNNING" && !staleRunning)
    ) {
      throw new ConflictException(`Rollover tidak dapat dieksekusi dari status ${run.status}`);
    }
    if (run.status !== "PREVIEW" && run.status !== "FAILED" && !staleRunning) {
      throw new ConflictException("Jalankan pre-check dan dry-run terlebih dahulu");
    }
    if (!run.new_academic_year_id) throw new ConflictException("Tahun ajaran baru belum dibuat");

    const source = await this.requireYear(run.academic_year_id);
    const target = await this.requireYear(run.new_academic_year_id);
    const state = readStepState(run);
    const prefs = state.preferences ?? defaultPrefs();

    // Konsistensi dry-run vs execute (T5): rencana harus identik.
    const plan = await this.buildPlan(source, prefs);
    const storedPlan = state.dryRunPlan;
    if (!storedPlan || JSON.stringify(storedPlan) !== JSON.stringify(plan)) {
      throw new ConflictException(
        "Hasil promosi berubah sejak dry-run; ulangi dry-run sebelum execute"
      );
    }

    // Reklaim RUNNING basi (proses crash > 10 menit): tandai FAILED dahulu agar
    // claim atomik di bawah dapat melanjutkan (resume) dari status FAILED.
    // Update kondisional (status RUNNING + updated_at lama) mencegah menimpa
    // run yang memang masih aktif berjalan oleh executor lain.
    if (staleRunning) {
      const staleCutoff = new Date(Date.now() - STALE_RUNNING_MS);
      const reclaimed = await this.db.rolloverRun.updateMany({
        where: { id: run.id, status: "RUNNING", updated_at: { lt: staleCutoff } },
        data: {
          status: "FAILED",
          step_state: {
            ...state,
            error: "RUNNING basi (proses terhenti > 10 menit) — diklaim ulang otomatis"
          } as unknown as Prisma.InputJsonValue
        }
      });
      if (reclaimed.count === 0) {
        throw new ConflictException("Rollover sedang berjalan (status tidak basi)");
      }
    }

    // Optimistic lock: klaim run dari PREVIEW/FAILED → RUNNING SECARA ATOMIK
    // (updateMany dengan kondisi status = cek-then-update dalam satu statement).
    // Dua executor yang memproses run sama tidak bisa dua-duanya menang; yang
    // kalah mendapat count 0 dan dilempar ConflictException (bukan menimpa
    // status milik executor lain). Wajib SEBELUM try — kegagalan klaim tidak
    // boleh memicu penulisan status FAILED di catch.
    const claimed = await this.db.rolloverRun.updateMany({
      where: { id: run.id, status: { in: ["PREVIEW", "FAILED"] } },
      data: { status: "RUNNING", executed_by: actorId, executed_at: new Date() }
    });
    if (claimed.count === 0) {
      throw new ConflictException(
        "Rollover sedang berjalan atau status tidak valid untuk dieksekusi"
      );
    }

    // R-13: actor_role diambil dari role aktif user (primer), bukan roles[0] DB.
    const actorRoles = await this.db.userRole.findMany({
      where: { user_id: actorId, status: "ACTIVE" },
      select: { role: true }
    });
    const actorRole = resolveActorRole(actorRoles.map((r) => r.role as string));

    await this.db.auditLog.create({
      data: {
        actor_id: actorId,
        actor_role: actorRole ?? undefined,
        action: "UPDATE",
        entity: "RolloverRun",
        entity_id: run.id,
        after: { snapshot: "pre-execute", sourceYearId: source.id, newYearId: target.id }
      }
    });

    const created: NonNullable<RolloverStepState["created"]> = {
      classIdByKey: state.created?.classIdByKey ?? {},
      enrollmentIds: state.created?.enrollmentIds ?? [],
      alumniIds: state.created?.alumniIds ?? [],
      previousEnrollmentStatus: state.created?.previousEnrollmentStatus ?? {},
      previousSourceStatus: state.created?.previousSourceStatus ?? source.status,
      previousSchoolProfileYearId:
        state.created?.previousSchoolProfileYearId ?? (await this.currentSchoolYearId()),
      ppdbEnrolledIds: state.created?.ppdbEnrolledIds ?? []
    };
    const steps = { ...(state.steps ?? {}) };
    let currentStep: RolloverStepName | null = null;

    const persist = async (): Promise<void> => {
      await this.db.rolloverRun.update({
        where: { id: run.id },
        data: {
          step_state: {
            preferences: prefs,
            steps,
            created,
            currentStep
          } as unknown as Prisma.InputJsonValue
        }
      });
    };

    try {
      // Status sudah diklaim RUNNING oleh optimistic lock di atas; langkah
      // pertama (close-source) memakai step_state untuk resume dari FAILED.

      // 1. Tutup sumber sementara (CLOSING) — previousSourceStatus disimpan.
      currentStep = "close-source";
      if (!steps["close-source"]) {
        created.previousSourceStatus = source.status;
        await this.db.academicYear.update({
          where: { id: source.id },
          data: { status: "CLOSING" }
        });
        steps["close-source"] = "DONE";
        await persist();
      }

      // 2. Buat kelas tahun baru dari rencana kelas.
      currentStep = "create-classes";
      if (!steps["create-classes"]) {
        for (const cls of plan.classes) {
          if (created.classIdByKey[cls.key]) continue;
          const newClass = await this.db.class.create({
            data: { name: cls.name, grade_level: cls.gradeLevel, academic_year_id: target.id }
          });
          created.classIdByKey[cls.key] = newClass.id;
        }
        steps["create-classes"] = "DONE";
        await persist();
      }

      // 3. Salin ClassSubject + ScheduleEntry ke kelas baru.
      currentStep = "copy-curriculum";
      if (!steps["copy-curriculum"]) {
        const sourceClassIds = [...new Set(plan.decisions.map((d) => d.sourceClassId))];
        for (const sourceClassId of sourceClassIds) {
          const classSubjects = await this.db.classSubject.findMany({
            where: { class_id: sourceClassId }
          });
          const schedules = await this.db.scheduleEntry.findMany({
            where: { class_id: sourceClassId }
          });
          const decisionsForClass = plan.decisions.filter(
            (d) => d.sourceClassId === sourceClassId && d.targetClassKey
          );
          const targetClassIds = [
            ...new Set(
              decisionsForClass
                .map((d) => (d.targetClassKey ? created.classIdByKey[d.targetClassKey] : undefined))
                .filter((x): x is string => typeof x === "string")
            )
          ];
          for (const targetClassId of targetClassIds) {
            for (const cs of classSubjects) {
              await this.db.classSubject.create({
                data: {
                  class_id: targetClassId,
                  subject_id: cs.subject_id,
                  teacher_id: cs.teacher_id,
                  semester: cs.semester
                }
              });
            }
            for (const s of schedules) {
              await this.db.scheduleEntry.create({
                data: {
                  class_id: targetClassId,
                  subject_id: s.subject_id,
                  teacher_id: s.teacher_id,
                  day_of_week: s.day_of_week,
                  start_period: s.start_period,
                  end_period: s.end_period,
                  room: s.room,
                  academic_year: target.code
                }
              });
            }
          }
        }
        steps["copy-curriculum"] = "DONE";
        await persist();
      }

      // 4. Kelulusan -> Alumni + ekspor rapor final (DataExportLog RAPOR).
      currentStep = "graduate";
      if (!steps["graduate"]) {
        const graduates = plan.decisions.filter((d) => d.action === "GRADUATED");
        for (const g of graduates) {
          const alumni = await this.db.alumni.create({
            data: {
              student_id: g.studentId,
              graduation_academic_year_id: target.id,
              graduation_date: new Date()
            }
          });
          created.alumniIds.push(alumni.id);
          const old = await this.db.enrollment.findFirst({
            where: { student_id: g.studentId, academic_year_id: source.id }
          });
          if (old) {
            created.previousEnrollmentStatus[old.id] = old.status;
            await this.db.enrollment.update({
              where: { id: old.id },
              data: { status: "GRADUATED" }
            });
          }
        }
        if (graduates.length > 0) {
          await this.db.dataExportLog.create({
            data: {
              export_type: "RAPOR",
              requested_by: actorId,
              status: "COMPLETED",
              record_count: graduates.length
            }
          });
        }
        steps["graduate"] = "DONE";
        await persist();
      }

      // 5. Promosi -> Enrollment baru di tahun baru.
      currentStep = "promote";
      if (!steps["promote"]) {
        const promoted = plan.decisions.filter(
          (d) => d.action === "PROMOTED" || d.action === "REPEATED"
        );
        for (const p of promoted) {
          const classId = p.targetClassKey ? created.classIdByKey[p.targetClassKey] : undefined;
          if (!classId) throw new Error(`Kelas tujuan tidak ditemukan untuk ${p.studentId}`);
          const enrollment = await this.db.enrollment.create({
            data: {
              student_id: p.studentId,
              class_id: classId,
              academic_year_id: target.id,
              status: p.action
            }
          });
          created.enrollmentIds.push(enrollment.id);
          const old = await this.db.enrollment.findFirst({
            where: { student_id: p.studentId, academic_year_id: source.id }
          });
          if (old) {
            created.previousEnrollmentStatus[old.id] = old.status;
            await this.db.enrollment.update({ where: { id: old.id }, data: { status: p.action } });
          }
        }
        steps["promote"] = "DONE";
        await persist();
      }

      // 6. PPDB enroll: calon SELECTED -> UserRole SISWA + Enrollment tahun baru.
      currentStep = "ppdb-enroll";
      if (!steps["ppdb-enroll"]) {
        const targetClassId = prefs.ppdbTargetClassId;
        if (targetClassId) {
          const applicants = await this.db.ppdbApplicant.findMany({
            where: { status: "SELECTED" }
          });
          for (const a of applicants) {
            if (!a.user_id) continue;
            const existingRole = await this.db.userRole.findFirst({
              where: { user_id: a.user_id, role: "SISWA" }
            });
            if (!existingRole) {
              await this.db.userRole.create({
                data: { user_id: a.user_id, role: "SISWA", status: "ACTIVE" }
              });
            }
            const enrollment = await this.db.enrollment.create({
              data: {
                student_id: a.user_id,
                class_id: targetClassId,
                academic_year_id: target.id,
                status: "ACTIVE"
              }
            });
            created.enrollmentIds.push(enrollment.id);
            created.ppdbEnrolledIds.push(a.id);
            await this.db.ppdbApplicant.update({
              where: { id: a.id },
              data: { status: "ENROLLED" }
            });
          }
        }
        steps["ppdb-enroll"] = "DONE";
        await persist();
      }

      // 7. Aktifkan tahun baru + tutup tahun lama.
      currentStep = "set-current";
      if (!steps["set-current"]) {
        await this.db.schoolProfile.updateMany({ data: { current_academic_year_id: target.id } });
        await this.db.academicYear.update({ where: { id: target.id }, data: { status: "OPEN" } });
        await this.db.academicYear.update({ where: { id: source.id }, data: { status: "CLOSED" } });
        steps["set-current"] = "DONE";
        await persist();
      }

      return this.db.rolloverRun.update({
        where: { id: run.id },
        data: {
          status: "DONE",
          summary: {
            counts: plan.counts,
            totalStudents: plan.decisions.length,
            newYearCode: target.code,
            newClasses: plan.classes.length
          } as unknown as Prisma.InputJsonValue
        }
      });
    } catch (err) {
      await this.db.rolloverRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          step_state: {
            preferences: prefs,
            steps,
            created,
            currentStep,
            error: err instanceof Error ? err.message : String(err)
          } as unknown as Prisma.InputJsonValue
        }
      });
      throw err;
    }
  }

  /** T6 — rollback: window 7 hari, hanya bila keadaan pristine (AuditLog). */
  async rollback(runId: string, actorId: string, reason?: string): Promise<RolloverRun> {
    const run = await this.getRun(runId);
    if (run.status !== "DONE") {
      throw new ConflictException(`Hanya run DONE yang bisa di-rollback (status: ${run.status})`);
    }
    if (!run.executed_at) throw new ConflictException("executed_at tidak tercatat");

    const cutoff = new Date(run.executed_at.getTime() + ROLLBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (Date.now() > cutoff.getTime()) {
      throw new ForbiddenException(`Jendela rollback ${ROLLBACK_WINDOW_DAYS} hari telah lewat`);
    }

    // Deteksi pristine: tidak boleh ada tulis ke entitas terdampak setelah execute.
    const intrusions = await this.db.auditLog.findMany({
      where: {
        entity: {
          in: [
            "Enrollment",
            "Class",
            "ClassSubject",
            "ScheduleEntry",
            "Alumni",
            "AcademicYear",
            "Invoice"
          ]
        },
        created_at: { gt: run.executed_at }
      },
      orderBy: { created_at: "asc" }
    });
    if (intrusions.length > 0) {
      throw new ForbiddenException({
        error: {
          code: "CONFLICT",
          message: `Data berubah setelah execute (${intrusions.length} audit log); rollback hanya untuk keadaan pristine`
        }
      });
    }

    const state = readStepState(run);
    const created = state.created;
    if (created) {
      if (created.enrollmentIds.length > 0) {
        await this.db.enrollment.deleteMany({ where: { id: { in: created.enrollmentIds } } });
      }
      const classIds = Object.values(created.classIdByKey);
      if (classIds.length > 0) {
        await this.db.class.deleteMany({ where: { id: { in: classIds } } });
      }
      if (created.alumniIds.length > 0) {
        await this.db.alumni.deleteMany({ where: { id: { in: created.alumniIds } } });
      }
      for (const [enrollmentId, status] of Object.entries(created.previousEnrollmentStatus)) {
        await this.db.enrollment.update({ where: { id: enrollmentId }, data: { status } });
      }
    }

    const source = await this.requireYear(run.academic_year_id);
    const target = run.new_academic_year_id
      ? await this.requireYear(run.new_academic_year_id)
      : null;
    await this.db.academicYear.update({
      where: { id: source.id },
      data: { status: created?.previousSourceStatus ?? "CLOSING" }
    });
    if (target) {
      await this.db.academicYear.update({ where: { id: target.id }, data: { status: "DRAFT" } });
    }
    if (created?.previousSchoolProfileYearId) {
      await this.db.schoolProfile.updateMany({
        data: { current_academic_year_id: created.previousSchoolProfileYearId }
      });
    }

    return this.db.rolloverRun.update({
      where: { id: run.id },
      data: {
        status: "ROLLED_BACK",
        rolled_back_by: actorId,
        rolled_back_at: new Date(),
        rollback_reason: reason ?? null
      }
    });
  }

  /** Query utama rollover — filter akademik (arsip). */
  async list(filter?: {
    academicYearId?: string;
    status?: RolloverRunStatus;
  }): Promise<RolloverRun[]> {
    return this.db.rolloverRun.findMany({
      where: { academic_year_id: filter?.academicYearId, status: filter?.status },
      orderBy: { created_at: "desc" }
    });
  }

  /** Bangun rencana promosi — SATU-SATUNYA sumber kebenaran (dry-run == execute). */
  private async buildPlan(
    source: AcademicYear,
    prefs: RolloverPreferences
  ): Promise<PromotionPlan> {
    const config = promotionConfig(prefs);
    const expectedDays = Math.max(1, prefs.expectedSchoolDays ?? DEFAULT_EXPECTED_SCHOOL_DAYS);

    const enrollments = await this.db.enrollment.findMany({
      where: { academic_year_id: source.id, status: "ACTIVE" },
      include: { class: true }
    });

    const students: StudentEvaluation[] = [];
    for (const enrollment of enrollments) {
      const grades = await this.db.grade.findMany({
        where: { student_id: enrollment.student_id, academic_year: source.code }
      });
      const finalScores: Record<string, number> = {};
      for (const g of grades) {
        const prev = finalScores[g.class_subject_id];
        finalScores[g.class_subject_id] = prev === undefined ? g.score : Math.max(prev, g.score);
      }
      const attendanceCount = await this.db.attendance.count({
        where: {
          student_id: enrollment.student_id,
          date: { gte: source.start_date, lte: source.end_date }
        }
      });
      students.push({
        studentId: enrollment.student_id,
        sourceClassId: enrollment.class_id,
        sourceClassName: enrollment.class?.name ?? "Kelas Baru",
        gradeLevel: enrollment.class?.grade_level ?? 10,
        currentStatus: enrollment.status,
        finalScores,
        attendanceRate: Math.min(1, attendanceCount / expectedDays)
      });
    }

    return buildPromotionPlan(students, config, prefs.overrides ?? {});
  }

  private async getRun(runId: string): Promise<RolloverRun> {
    const run = await this.db.rolloverRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException("Rollover run tidak ditemukan");
    return run;
  }

  private async requireYear(yearId: string): Promise<AcademicYear> {
    const year = await this.db.academicYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException("Tahun ajaran tidak ditemukan");
    return year;
  }

  private async currentSchoolYearId(): Promise<string | null> {
    const profile = await this.db.schoolProfile.findFirst();
    return profile?.current_academic_year_id ?? null;
  }
}
