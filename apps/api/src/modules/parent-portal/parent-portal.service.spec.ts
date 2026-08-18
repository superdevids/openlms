import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

jest.mock("@opensis/database", () => ({
  prisma: {
    parentGuardian: { findFirst: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
    parentStudentLink: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
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
    update: jest.Mock;
  };
  parentalConsent: { findMany: jest.Mock };
  grade: { count: jest.Mock };
  attendance: { groupBy: jest.Mock };
  invoice: { count: jest.Mock };
  auditLog: { create: jest.Mock };
};

const waliActor = { userId: "user_wali_1", roles: ["WALI_MURID"] };
const operatorActor = { userId: "user_operator_1", roles: ["OPERATOR"] };

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

    it("REJECTED → wali boleh mengajukan ulang (status kembali PENDING)", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: "stu_1",
        is_active: true,
        roles: [{ role: "SISWA", status: "ACTIVE" }]
      });
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        id: "link_rejected",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "REJECTED"
      });
      prismaMock.parentStudentLink.update.mockResolvedValue({
        id: "link_rejected",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "PENDING"
      });
      prismaMock.auditLog.create.mockResolvedValue({ id: "audit_1" });

      const link = await service.linkChild(
        { parentGuardianId: "pg_1", studentId: "stu_1", relationship: "WALI" },
        waliActor
      );

      expect(link.status).toBe("PENDING");
      expect(prismaMock.parentStudentLink.update).toHaveBeenCalledWith({
        where: { id: "link_rejected" },
        data: { status: "PENDING" }
      });
      expect(prismaMock.parentStudentLink.create).not.toHaveBeenCalled();
    });

    it("berhasil menautkan siswa SISWA aktif milik aktor (status PENDING)", async () => {
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
        relationship: "WALI",
        status: "PENDING"
      });
      prismaMock.auditLog.create.mockResolvedValue({ id: "audit_1" });

      const link = await service.linkChild(
        { parentGuardianId: "pg_1", studentId: "stu_1", relationship: "WALI" },
        waliActor
      );

      expect(link.id).toBe("link_1");
      expect(link.status).toBe("PENDING");
      expect(prismaMock.parentGuardian.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "pg_1", user_id: "user_wali_1" } })
      );
      expect(prismaMock.parentStudentLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parent_id: "pg_1",
            student_id: "stu_1",
            status: "PENDING"
          })
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
        expect.objectContaining({ where: { parent_id: "pg_1", status: "APPROVED" } })
      );
    });

    it("tidak menampilkan tautan non-APPROVED (PENDING/REJECTED disaring query)", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.parentStudentLink.findMany.mockResolvedValue([]);

      const children = await service.listChildren("pg_1", waliActor);

      expect(children).toHaveLength(0);
      expect(prismaMock.parentStudentLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { parent_id: "pg_1", status: "APPROVED" } })
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

    it("404 bila siswa tidak ditemukan", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.parentStudentLink.findFirst.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "APPROVED"
      });
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getStudentOverview("pg_1", "stu_1", waliActor)).rejects.toThrow(
        NotFoundException
      );
    });

    it("mengembalikan ringkasan untuk anak yang terhubung (hanya APPROVED)", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.parentStudentLink.findFirst.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "APPROVED"
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
      expect(prismaMock.parentStudentLink.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parent_id: "pg_1",
            student_id: "stu_1",
            status: "APPROVED"
          })
        })
      );
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

    it("mengembalikan consent untuk anak yang terhubung (hanya APPROVED)", async () => {
      prismaMock.parentGuardian.findFirst.mockResolvedValue({
        id: "pg_1",
        user_id: "user_wali_1"
      });
      prismaMock.parentStudentLink.findFirst.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "APPROVED"
      });
      prismaMock.parentalConsent.findMany.mockResolvedValue([{ id: "consent_1" }]);

      const consents = await service.getChildConsents("pg_1", "stu_1", waliActor);

      expect(consents).toHaveLength(1);
      expect(prismaMock.parentalConsent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { student_id: "stu_1" } })
      );
      expect(prismaMock.parentStudentLink.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parent_id: "pg_1",
            student_id: "stu_1",
            status: "APPROVED"
          })
        })
      );
    });
  });

  describe("allowlist OPERATOR (Rv5-17)", () => {
    it("listPendingLinks mengembalikan tautan PENDING dengan info wali & siswa", async () => {
      prismaMock.parentStudentLink.findMany.mockResolvedValue([
        { id: "link_1", parent_id: "pg_1", student_id: "stu_1", status: "PENDING" }
      ]);

      const links = await service.listPendingLinks();

      expect(links).toHaveLength(1);
      expect(prismaMock.parentStudentLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PENDING" },
          include: expect.objectContaining({
            parent: expect.anything(),
            student: expect.anything()
          })
        })
      );
    });

    it("approveLink menyetujui tautan PENDING + menulis audit", async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "PENDING"
      });
      prismaMock.parentStudentLink.update.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "APPROVED"
      });
      prismaMock.auditLog.create.mockResolvedValue({ id: "audit_1" });

      const link = await service.approveLink("link_1", operatorActor);

      expect(link.status).toBe("APPROVED");
      expect(prismaMock.parentStudentLink.update).toHaveBeenCalledWith({
        where: { id: "link_1" },
        data: { status: "APPROVED" }
      });
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });

    it("approveLink 404 bila tautan tidak ditemukan", async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(service.approveLink("link_404", operatorActor)).rejects.toThrow(
        NotFoundException
      );
      expect(prismaMock.parentStudentLink.update).not.toHaveBeenCalled();
    });

    it("approveLink 409 bila tautan sudah APPROVED (transisi status sama ditolak)", async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "APPROVED"
      });

      await expect(service.approveLink("link_1", operatorActor)).rejects.toThrow(ConflictException);
      expect(prismaMock.parentStudentLink.update).not.toHaveBeenCalled();
    });

    it("rejectLink menolak tautan (status REJECTED) + audit", async () => {
      prismaMock.parentStudentLink.findUnique.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "PENDING"
      });
      prismaMock.parentStudentLink.update.mockResolvedValue({
        id: "link_1",
        parent_id: "pg_1",
        student_id: "stu_1",
        status: "REJECTED"
      });
      prismaMock.auditLog.create.mockResolvedValue({ id: "audit_1" });

      const link = await service.rejectLink("link_1", operatorActor);

      expect(link.status).toBe("REJECTED");
      expect(prismaMock.parentStudentLink.update).toHaveBeenCalledWith({
        where: { id: "link_1" },
        data: { status: "REJECTED" }
      });
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });
  });
});
