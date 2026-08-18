import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { RequestContext } from "@opensis/types";

jest.mock("@opensis/database", () => ({
  prisma: {
    schoolProfile: { findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    enrollment: { findFirst: jest.fn(), findMany: jest.fn() },
    class: { findUnique: jest.fn() },
    grade: { findMany: jest.fn() },
    raporP5: { findMany: jest.fn(), upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    parentStudentLink: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
    dataExportLog: { create: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { RaporService } from "./rapor.service";
import type { IJobQueue } from "../queue/queue.types";

const prismaMock = prisma as unknown as {
  schoolProfile: { findFirst: jest.Mock; update: jest.Mock };
  user: { findUnique: jest.Mock };
  enrollment: { findFirst: jest.Mock; findMany: jest.Mock };
  class: { findUnique: jest.Mock };
  grade: { findMany: jest.Mock };
  raporP5: { findMany: jest.Mock; upsert: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
  parentStudentLink: { findFirst: jest.Mock };
  auditLog: { create: jest.Mock };
  dataExportLog: { create: jest.Mock };
};

const ctx = (partial: Partial<RequestContext>): RequestContext => ({
  userId: "u_1",
  roles: ["SISWA"],
  classIds: [],
  homeroomClassId: null,
  requestId: "req_test",
  ...partial
});

/** Stub dasar agar getRapor sukses tanpa grade. */
function stubRaporReads() {
  prismaMock.schoolProfile.findFirst.mockResolvedValue({
    current_academic_year: { code: "2026/2027" },
    settings: {}
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: "stu_1",
    full_name: "Budi Santoso",
    username: "budi"
  });
  prismaMock.enrollment.findFirst.mockResolvedValue({
    class: { id: "c_1", name: "X IPA 1", grade_level: 10 },
    academic_year: { code: "2026/2027", name: "Tahun Ajaran 2026/2027" }
  });
  prismaMock.grade.findMany.mockResolvedValue([]);
  prismaMock.raporP5.findMany.mockResolvedValue([]);
}

describe("RaporService — scope baca getRapor", () => {
  let service: RaporService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RaporService();
  });

  it("SISWA: rapor diri sendiri OK", async () => {
    stubRaporReads();
    const result = await service.getRapor(
      "stu_1",
      { semester: "GANJIL" },
      ctx({ userId: "stu_1", roles: ["SISWA"] })
    );
    expect(result.student.name).toBe("Budi Santoso");
    expect(result.kelas?.name).toBe("X IPA 1");
    expect(prismaMock.enrollment.findFirst).toHaveBeenCalled();
  });

  it("SISWA: rapor siswa lain → 403", async () => {
    await expect(
      service.getRapor("stu_2", { semester: "GANJIL" }, ctx({ userId: "stu_1", roles: ["SISWA"] }))
    ).rejects.toThrow(ForbiddenException);
  });

  it("WALI_MURID: anak dengan link APPROVED OK", async () => {
    stubRaporReads();
    prismaMock.parentStudentLink.findFirst.mockResolvedValue({ id: "link_1" });
    const result = await service.getRapor(
      "stu_1",
      { semester: "GANJIL" },
      ctx({ userId: "wali_1", roles: ["WALI_MURID"] })
    );
    expect(result.student.id).toBe("stu_1");
    expect(prismaMock.parentStudentLink.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "APPROVED" }) })
    );
  });

  it("WALI_MURID: anak tak ter-link (PENDING/tanpa link) → 403", async () => {
    prismaMock.parentStudentLink.findFirst.mockResolvedValue(null);
    await expect(
      service.getRapor(
        "stu_1",
        { semester: "GANJIL" },
        ctx({ userId: "wali_1", roles: ["WALI_MURID"] })
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("GURU: siswa di kelas ampu (ctx.classIds) OK", async () => {
    stubRaporReads();
    // Call ke-1 (scope check) memakai select ringan; call ke-2 (header) memakai include.
    prismaMock.enrollment.findFirst.mockResolvedValueOnce({ class_id: "c_1" }).mockResolvedValue({
      class: { id: "c_1", name: "X IPA 1", grade_level: 10 },
      academic_year: { code: "2026/2027", name: "Tahun Ajaran 2026/2027" }
    });
    const result = await service.getRapor(
      "stu_1",
      { semester: "GANJIL" },
      ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"] })
    );
    expect(result.student.id).toBe("stu_1");
    expect(result.kelas?.name).toBe("X IPA 1");
  });

  it("GURU: siswa di kelas lain → 403", async () => {
    prismaMock.enrollment.findFirst.mockResolvedValue({ class_id: "c_2" });
    await expect(
      service.getRapor(
        "stu_1",
        { semester: "GANJIL" },
        ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"] })
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("KEPSEK (scope SEKOLAH): semua siswa OK tanpa cek enrollment", async () => {
    stubRaporReads();
    prismaMock.enrollment.findFirst.mockResolvedValue({
      class: { id: "c_1", name: "X IPA 1", grade_level: 10 },
      academic_year: { code: "2026/2027", name: "Tahun Ajaran 2026/2027" }
    });
    const result = await service.getRapor(
      "stu_1",
      { semester: "GANJIL" },
      ctx({ userId: "kepsek_1", roles: ["KEPSEK"] })
    );
    expect(result.student.id).toBe("stu_1");
  });
});

describe("RaporService — kelas & siswa", () => {
  let service: RaporService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RaporService();
  });

  it("getClassRapor: guru di luar scope kelas → 403", async () => {
    await expect(
      service.getClassRapor(
        "c_2",
        { semester: "GANJIL" },
        ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"] })
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("getClassRapor: sekolah boleh; merangkum nilai akhir per siswa per mapel", async () => {
    prismaMock.schoolProfile.findFirst.mockResolvedValue({
      current_academic_year: { code: "2026/2027" },
      settings: {}
    });
    prismaMock.class.findUnique.mockResolvedValue({ id: "c_1", name: "X IPA 1" });
    prismaMock.enrollment.findMany.mockResolvedValue([
      { student: { id: "stu_1", full_name: "Budi", username: "budi" } }
    ]);
    prismaMock.grade.findMany.mockResolvedValue([
      {
        student_id: "stu_1",
        student: { id: "stu_1", full_name: "Budi" },
        type: "TUGAS",
        score: 80,
        weight: 1,
        class_subject: { subject: { id: "s_1", code: "MAT-10", name: "Matematika" } }
      }
    ]);
    const result = await service.getClassRapor(
      "c_1",
      { semester: "GANJIL" },
      ctx({ userId: "kepsek_1", roles: ["KEPSEK"] })
    );
    expect(result.className).toBe("X IPA 1");
    expect(result.students[0]?.subjects[0]?.nilaiAkhir).toBe(80);
    expect(result.students[0]?.subjects[0]?.predikat).toBe("B");
  });

  it("listStudents: tanpa classId (sekolah) mengembalikan seluruh siswa aktif", async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([
      {
        student: { id: "stu_1", full_name: "Budi", username: "budi" },
        class: { id: "c_1", name: "X IPA 1" }
      }
    ]);
    const result = await service.listStudents(
      undefined,
      ctx({ userId: "op", roles: ["OPERATOR"] })
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.className).toBe("X IPA 1");
  });

  it("listStudents: KEPSEK tanpa classId → boleh seluruh siswa aktif", async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([
      {
        student: { id: "stu_1", full_name: "Budi", username: "budi" },
        class: { id: "c_1", name: "X IPA 1" }
      },
      {
        student: { id: "stu_2", full_name: "Sari", username: "sari" },
        class: { id: "c_2", name: "X IPA 2" }
      }
    ]);
    const result = await service.listStudents(
      undefined,
      ctx({ userId: "kepsek_1", roles: ["KEPSEK"] })
    );
    expect(result).toHaveLength(2);
    // Tidak ada filter class_id → seluruh enrollment AKTIF lintas kelas.
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE" } })
    );
  });

  it("listStudents: GURU tanpa classId → dibatasi ke kelas ampu (ctx.classIds + homeroom)", async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([
      {
        student: { id: "stu_1", full_name: "Budi", username: "budi" },
        class: { id: "c_1", name: "X IPA 1" }
      }
    ]);
    const result = await service.listStudents(
      undefined,
      ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"], homeroomClassId: "c_h" })
    );
    expect(result).toHaveLength(1);
    // Query wajib difilter ke kelas ampu — TIDAK boleh semua siswa lintas kelas.
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE", class_id: { in: ["c_1", "c_h"] } } })
    );
  });

  it("listStudents: GURU tanpa classId dan tanpa kelas ampu → [] tanpa query", async () => {
    const result = await service.listStudents(
      undefined,
      ctx({ userId: "guru_2", roles: ["GURU"], classIds: [], homeroomClassId: null })
    );
    expect(result).toEqual([]);
    expect(prismaMock.enrollment.findMany).not.toHaveBeenCalled();
  });

  it("listStudents: guru memfilter kelas ampu; kelas lain → 403", async () => {
    await expect(
      service.listStudents("c_2", ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"] }))
    ).rejects.toThrow(ForbiddenException);
  });
});

describe("RaporService — requestRaporExport (e-Rapor v2)", () => {
  let service: RaporService;
  let queueMock: { enqueue: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    queueMock = { enqueue: jest.fn().mockResolvedValue(undefined) };
    service = new RaporService(queueMock as unknown as IJobQueue);
  });

  it("SISWA mengekspor rapor siswa lain → 403, tanpa log & tanpa enqueue", async () => {
    await expect(
      service.requestRaporExport(
        "stu_2",
        { semester: "GANJIL" },
        ctx({ userId: "stu_1", roles: ["SISWA"] })
      )
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.dataExportLog.create).not.toHaveBeenCalled();
    expect(queueMock.enqueue).not.toHaveBeenCalled();
  });

  it("SISWA mengekspor rapor sendiri → DataExportLog RAPOR PENDING + enqueue job", async () => {
    prismaMock.schoolProfile.findFirst.mockResolvedValue({
      current_academic_year: { code: "2026/2027" }
    });
    prismaMock.dataExportLog.create.mockResolvedValue({ id: "log_1" });

    const result = await service.requestRaporExport(
      "stu_1",
      { semester: "GANJIL" },
      ctx({ userId: "stu_1", roles: ["SISWA"] })
    );

    expect(result).toEqual({ exportLogId: "log_1", status: "PENDING" });
    expect(prismaMock.dataExportLog.create).toHaveBeenCalledWith({
      data: { export_type: "RAPOR", requested_by: "stu_1", status: "PENDING" }
    });
    expect(queueMock.enqueue).toHaveBeenCalledWith("report.generate", {
      exportLogId: "log_1",
      params: { studentId: "stu_1", semester: "GANJIL", academicYear: "2026/2027" }
    });
  });

  it("GURU ekspor siswa di kelas ampu → OK (row-level via assertCanReadRapor)", async () => {
    prismaMock.schoolProfile.findFirst.mockResolvedValue({
      current_academic_year: { code: "2026/2027" }
    });
    prismaMock.enrollment.findFirst.mockResolvedValue({ class_id: "c_1" });
    prismaMock.dataExportLog.create.mockResolvedValue({ id: "log_2" });

    const result = await service.requestRaporExport(
      "stu_1",
      { semester: "GANJIL" },
      ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"] })
    );
    expect(result.exportLogId).toBe("log_2");
    expect(queueMock.enqueue).toHaveBeenCalled();
  });
});

describe("RaporService — CRUD P5 & settings", () => {
  let service: RaporService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RaporService();
  });

  it("upsertP5: guru di luar kelas siswa → 403", async () => {
    prismaMock.enrollment.findFirst.mockResolvedValue({ class_id: "c_2" });
    await expect(
      service.upsertP5(
        {
          studentId: "stu_1",
          semester: "GANJIL",
          academicYear: "2026/2027",
          projectName: "Kearifan Lokal",
          deskripsi: "Proyek budaya"
        },
        ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"] })
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("upsertP5: upsert berdasar unique key — dua panggilan tidak duplikat", async () => {
    prismaMock.enrollment.findFirst.mockResolvedValue({ class_id: "c_1" });
    const row = {
      id: "p5_1",
      student_id: "stu_1",
      semester: "GANJIL",
      academic_year: "2026/2027",
      project_name: "Kearifan Lokal",
      theme: null,
      score: 90,
      deskripsi: "Proyek budaya",
      created_by: "guru_1"
    };
    prismaMock.raporP5.upsert.mockResolvedValue(row);
    prismaMock.auditLog.create.mockResolvedValue({});

    const dto = {
      studentId: "stu_1",
      semester: "GANJIL",
      academicYear: "2026/2027",
      projectName: "Kearifan Lokal",
      score: 90,
      deskripsi: "Proyek budaya"
    };
    const first = await service.upsertP5(
      dto,
      ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"] })
    );
    const second = await service.upsertP5(
      dto,
      ctx({ userId: "guru_1", roles: ["GURU"], classIds: ["c_1"] })
    );

    expect(prismaMock.raporP5.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.raporP5.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          student_id_semester_academic_year_project_name: {
            student_id: "stu_1",
            semester: "GANJIL",
            academic_year: "2026/2027",
            project_name: "Kearifan Lokal"
          }
        }
      })
    );
    expect(prismaMock.raporP5.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ id: expect.anything() }) })
    );
    expect(first.id).toBe("p5_1");
    expect(second.id).toBe("p5_1");
  });

  it("deleteP5: sekolah boleh; record tak ditemukan → 404", async () => {
    prismaMock.raporP5.findUnique.mockResolvedValue(null);
    await expect(
      service.deleteP5("p5_x", ctx({ userId: "kepsek_1", roles: ["KEPSEK"] }))
    ).rejects.toThrow(NotFoundException);
  });

  it("getSettings: fallback bobot default bila settings kosong", async () => {
    prismaMock.schoolProfile.findFirst.mockResolvedValue({ settings: {} });
    const result = await service.getSettings();
    expect(result.raporWeights.TUGAS).toBe(20);
    expect(result.raporWeights.UJIAN).toBe(30);
  });

  it("updateSettings: menyimpan raporWeights, menormalkan nilai korup, dan menulis AuditLog", async () => {
    prismaMock.schoolProfile.findFirst.mockResolvedValue({ id: "school_1", settings: {} });
    prismaMock.schoolProfile.update.mockResolvedValue({
      settings: { raporWeights: { TUGAS: 40, KUIS: 10, UJIAN: 30, SUMATIF: 20 } }
    });
    prismaMock.auditLog.create.mockResolvedValue({ id: "log_1", created_at: new Date() });

    const result = await service.updateSettings(
      { raporWeights: { TUGAS: 40, KUIS: 10, UJIAN: 30, SUMATIF: 20, PRAKTIK: -1 } },
      ctx({ userId: "kepsek_1", roles: ["KEPSEK"] })
    );
    expect(result.raporWeights.TUGAS).toBe(40);
    expect(result.raporWeights.PRAKTIK).toBeUndefined(); // nilai negatif ditolak (tanpa default)
    expect(prismaMock.schoolProfile.update).toHaveBeenCalled();
    // Audit wajib tercatat: entity school_profile, actor_role KEPSEK, before/after bobot.
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_id: "kepsek_1",
        actor_role: "KEPSEK",
        action: "UPDATE",
        entity: "school_profile",
        entity_id: "school_1",
        before: expect.objectContaining({ raporWeights: expect.anything() }),
        after: expect.objectContaining({ raporWeights: expect.objectContaining({ TUGAS: 40 }) })
      })
    });
  });
});
