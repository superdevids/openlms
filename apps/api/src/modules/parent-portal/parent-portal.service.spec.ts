import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

jest.mock("@opensis/database", () => ({
  prisma: {
    parentGuardian: { findFirst: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
    parentStudentLink: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn()
    },
    parentalConsent: { findMany: jest.fn() },
    grade: { count: jest.fn() },
    attendance: { groupBy: jest.fn() },
    invoice: { count: jest.fn() },
    auditLog: { create: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { ParentPortalService } from "./parent-portal.service";

const prismaMock = prisma as unknown as {
  parentGuardian: { findFirst: jest.Mock; create: jest.Mock };
  user: { findUnique: jest.Mock };
  parentStudentLink: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
  };
  parentalConsent: { findMany: jest.Mock };
  grade: { count: jest.Mock };
  attendance: { groupBy: jest.Mock };
  invoice: { count: jest.Mock };
  auditLog: { create: jest.Mock };
};

const waliActor = { userId: "user_wali_1", roles: ["WALI_MURID"] };

describe("ParentPortalService (SEC-001 scope SENDIRI)", () => {
  let service: ParentPortalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ParentPortalService(prisma as never);
  });

  describe("linkChild", () => {
    it("menolak 403 bila ParentGuardian bukan milik aktor", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue(null);

      await expect(
        service.linkChild(
          { parentGuardianId: "pg_orang_lain", studentId: "stu_1", relationship: "WALI" },
          waliActor
        )
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.parentStudentLink.create).not.toHaveBeenCalled();
    });

    it("menolak 403 bila siswa bukan role SISWA aktif", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      // Siswa dengan role GURU — bukan anak sah.
      prismaMock.user.findUnique.mockResolvedValue({
        id: "stu_1",
        is_active: true,
        roles: [{ role: "GURU", status: "ACTIVE" }]
      });

      await expect(
        service.linkChild(
          { parentGuardianId: "pg_1", studentId: "stu_1", relationship: "WALI" },
          waliActor
        )
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.parentStudentLink.create).not.toHaveBeenCalled();
    });

    it("menolak 403 bila siswa non-aktif", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: "stu_1",
        is_active: false,
        roles: [{ role: "SISWA", status: "ACTIVE" }]
      });

      await expect(
        service.linkChild(
          { parentGuardianId: "pg_1", studentId: "stu_1", relationship: "WALI" },
          waliActor
        )
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.parentStudentLink.create).not.toHaveBeenCalled();
    });

    it("404 bila siswa tidak ditemukan", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.linkChild(
          { parentGuardianId: "pg_1", studentId: "stu_missing", relationship: "WALI" },
          waliActor
        )
      ).rejects.toThrow(NotFoundException);
    });

    it("409 bila relasi wali-anak sudah ada (idempoten)", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: "stu_1",
        is_active: true,
        roles: [{ role: "SISWA", status: "ACTIVE" }]
      });
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({ id: "link_ada" });

      await expect(
        service.linkChild(
          { parentGuardianId: "pg_1", studentId: "stu_1", relationship: "WALI" },
          waliActor
        )
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.parentStudentLink.create).not.toHaveBeenCalled();
    });

    it("berhasil menautkan siswa SISWA aktif milik aktor", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: "stu_1",
        is_active: true,
        roles: [{ role: "SISWA", status: "ACTIVE" }]
      });
      prismaMock.parentStudentLink.findUnique.mockResolvedValue(null);
      prismaMock.parentStudentLink.create.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        relationship: "WALI"
      });
      prismaMock.auditLog.create.mockResolvedValue({ id: "audit_1" });

      const link = await service.linkChild(
        { parentGuardianId: "pg_1", studentId: "stu_1", relationship: "WALI" },
        waliActor
      );

      expect(link.id).toBe("link_1");
      expect(prismaMock.parentGuardian.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "pg_1", user_id: "user_wali_1" } })
      );
      expect(prismaMock.parentStudentLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parent_id: "pg_1", student_id: "stu_1" })
        })
      );
    });
  });

  describe("listChildren", () => {
    it("menolak 403 bila ParentGuardian bukan milik aktor", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue(null);

      await expect(service.listChildren("pg_orang_lain", waliActor)).rejects.toThrow(
        ForbiddenException
      );
      expect(prismaMock.parentStudentLink.findMany).not.toHaveBeenCalled();
    });

    it("mengembalikan daftar anak untuk ParentGuardian milik aktor", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.parentStudentLink.findMany.mockResolvedValue([
        { id: "link_1", parent_id: "pg_1", student_id: "stu_1" }
      ]);

      const children = await service.listChildren("pg_1", waliActor);

      expect(children).toHaveLength(1);
      expect(prismaMock.parentStudentLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { parent_id: "pg_1" } })
      );
    });
  });

  describe("getStudentOverview", () => {
    it("menolak 403 bila ParentGuardian bukan milik aktor", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue(null);

      await expect(service.getStudentOverview("pg_orang_lain", "stu_1", waliActor)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("menolak 403 bila siswa bukan anak (tidak ada link)", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.parentStudentLink.findFirst.mockResolvedValue(null);

      await expect(service.getStudentOverview("pg_1", "stu_99", waliActor)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("mengembalikan ringkasan untuk anak yang terhubung", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.parentStudentLink.findFirst.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1"
      });
      prismaMock.user.findUnique.mockResolvedValue({ id: "stu_1", full_name: "Anak Satu" });
      prismaMock.grade.count.mockResolvedValue(3);
      prismaMock.attendance.groupBy.mockResolvedValue([
        { status: "HADIR", _count: { _all: 5 } },
        { status: "ALPA", _count: { _all: 1 } }
      ]);
      prismaMock.invoice.count.mockResolvedValue(2);

      const overview = await service.getStudentOverview("pg_1", "stu_1", waliActor);

      expect(overview).toEqual({
        studentId: "stu_1",
        studentName: "Anak Satu",
        gradesCount: 3,
        attendance: { total: 6, alpa: 1 },
        unpaidInvoices: 2
      });
    });
  });

  describe("getChildConsents", () => {
    it("menolak 403 bila ParentGuardian bukan milik aktor", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue(null);

      await expect(service.getChildConsents("pg_orang_lain", "stu_1", waliActor)).rejects.toThrow(
        ForbiddenException
      );
      expect(prismaMock.parentalConsent.findMany).not.toHaveBeenCalled();
    });

    it("mengembalikan consent untuk anak yang terhubung", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.parentStudentLink.findFirst.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1"
      });
      prismaMock.parentalConsent.findMany.mockResolvedValue([{ id: "consent_1" }]);

      const consents = await service.getChildConsents("pg_1", "stu_1", waliActor);

      expect(consents).toHaveLength(1);
      expect(prismaMock.parentalConsent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { student_id: "stu_1" } })
      );
    });
  });
});
