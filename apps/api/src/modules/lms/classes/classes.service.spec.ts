import { NotFoundException } from "@nestjs/common";
import type { RequestContext } from "@openlms/types";

jest.mock("@openlms/database", () => ({
  prisma: {
    academicYear: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    class: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    auditLog: { create: jest.fn() }
  }
}));

import { prisma } from "@openlms/database";
import { ClassesService } from "./classes.service";

const prismaMock = prisma as unknown as {
  academicYear: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  class: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  auditLog: { create: jest.Mock };
};

const operatorCtx: RequestContext = {
  userId: "op_1",
  roles: ["OPERATOR"],
  classIds: [],
  homeroomClassId: null,
  requestId: "req_test"
};

describe("ClassesService", () => {
  let service: ClassesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClassesService();
  });

  it("create berhasil: memvalidasi tahun ajaran & wali kelas, menulis AuditLog", async () => {
    prismaMock.academicYear.findUnique.mockResolvedValue({ id: "ay_1", code: "2026/2027" });
    prismaMock.user.findUnique.mockResolvedValue({ id: "t_1", full_name: "Budi" });
    prismaMock.class.create.mockResolvedValue({
      id: "c_1",
      name: "X IPA 1",
      grade_level: 10,
      academic_year_id: "ay_1",
      homeroom_teacher_id: "t_1"
    });

    const result = await service.create(
      { name: "X IPA 1", gradeLevel: 10, academicYearId: "ay_1", homeroomTeacherId: "t_1" },
      operatorCtx
    );

    expect(result.id).toBe("c_1");
    expect(prismaMock.class.create).toHaveBeenCalledWith({
      data: {
        name: "X IPA 1",
        grade_level: 10,
        academic_year_id: "ay_1",
        homeroom_teacher_id: "t_1"
      }
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CREATE",
          entity: "class",
          entity_id: "c_1"
        })
      })
    );
  });

  it("create gagal 404 bila tahun ajaran tidak ada", async () => {
    prismaMock.academicYear.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ name: "X IPA 1", gradeLevel: 10, academicYearId: "ay_missing" }, operatorCtx)
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.class.create).not.toHaveBeenCalled();
  });

  it("update gagal 404 bila kelas tidak ada", async () => {
    prismaMock.class.findUnique.mockResolvedValue(null);

    await expect(service.update("c_missing", { name: "X IPA 2" }, operatorCtx)).rejects.toThrow(
      NotFoundException
    );
  });

  it("findAll menerapkan filter gradeLevel dan scope SENDIRI (classIds)", async () => {
    prismaMock.class.findMany.mockResolvedValue([]);
    const studentCtx: RequestContext = {
      userId: "s_1",
      roles: ["SISWA"],
      classIds: ["c_1"],
      homeroomClassId: null,
      requestId: "req_test"
    };

    await service.findAll({ gradeLevel: 10 }, studentCtx);

    expect(prismaMock.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { grade_level: 10, id: { in: ["c_1"] } }
      })
    );
  });
});
