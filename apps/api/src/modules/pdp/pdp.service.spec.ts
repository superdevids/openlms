import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import type { RequestContext } from "@opensis/types";
import { join } from "node:path";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

jest.mock("@opensis/database", () => {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    userRole: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
    parentalConsent: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn(), create: jest.fn() },
    dataExportLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    pdpRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    ppdbApplicant: { updateMany: jest.fn() },
    parentGuardian: { updateMany: jest.fn() },
    alumni: { updateMany: jest.fn() },
    dataRetentionPolicy: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    refreshToken: { deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
    userPermissionOverride: { deleteMany: jest.fn() },
    examAnswerLog: { deleteMany: jest.fn() },
    attendance: { deleteMany: jest.fn() },
    attendanceRecord: { deleteMany: jest.fn() },
    counselingNote: { updateMany: jest.fn() },
    $transaction: jest.fn()
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});

import { prisma } from "@opensis/database";
import { PdpService } from "./pdp.service";
import { PdpAnonymizeService } from "./pdp-anonymize.service";
import { PdpRetentionService } from "./pdp-retention.service";

const prismaMock = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock };
  userRole: { findMany: jest.Mock };
  enrollment: { findMany: jest.Mock };
  parentalConsent: { findMany: jest.Mock };
  auditLog: { findMany: jest.Mock; create: jest.Mock };
  dataExportLog: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  pdpRequest: {
    findFirst: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  ppdbApplicant: { updateMany: jest.Mock };
  parentGuardian: { updateMany: jest.Mock };
  alumni: { updateMany: jest.Mock };
  dataRetentionPolicy: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  refreshToken: { deleteMany: jest.Mock };
  notification: { deleteMany: jest.Mock };
  userPermissionOverride: { deleteMany: jest.Mock };
  examAnswerLog: { deleteMany: jest.Mock };
  attendance: { deleteMany: jest.Mock };
  attendanceRecord: { deleteMany: jest.Mock };
  counselingNote: { updateMany: jest.Mock };
  $transaction: jest.Mock;
};

const ctx = (partial: Partial<RequestContext> = {}): RequestContext => ({
  userId: "u_1",
  roles: ["SISWA"],
  classIds: [],
  homeroomClassId: null,
  requestId: "req_test",
  ...partial
});

/** Stub data pribadi agar collectData sukses. */
function stubPersonalData() {
  prismaMock.user.findUnique.mockResolvedValue({
    id: "u_1",
    username: "budi",
    email: "budi@opensis.local",
    full_name: "Budi Santoso",
    phone: "0812",
    avatar_url: null,
    is_active: true,
    preferred_language: "id",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z")
  });
  prismaMock.userRole.findMany.mockResolvedValue([
    { role: "SISWA", status: "ACTIVE", joined_at: null }
  ]);
  prismaMock.enrollment.findMany.mockResolvedValue([]);
  prismaMock.parentalConsent.findMany.mockResolvedValue([]);
  prismaMock.auditLog.findMany.mockResolvedValue([]);
}

describe("PdpService", () => {
  let service: PdpService;
  let anonymize: PdpAnonymizeService;
  let retention: PdpRetentionService;

  beforeAll(() => {
    process.env.STORAGE_EXPORT_DIR = join(tmpdir(), "opensis-pdp-test-exports");
  });

  afterAll(() => {
    rmSync(process.env.STORAGE_EXPORT_DIR as string, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.dataExportLog.findMany.mockResolvedValue([]);
    anonymize = new PdpAnonymizeService(prismaMock as never);
    retention = new PdpRetentionService(prismaMock as never);
    service = new PdpService(prismaMock as never, anonymize, retention);
  });

  describe("updateMyProfile — allowlist ketat", () => {
    it("email ditolak 400", async () => {
      await expect(
        service.updateMyProfile("u_1", { email: "x@y.z" } as never, ctx())
      ).rejects.toThrow(BadRequestException);
    });

    it("username ditolak 400", async () => {
      await expect(
        service.updateMyProfile("u_1", { username: "hacker" } as never, ctx())
      ).rejects.toThrow(BadRequestException);
    });

    it("field allowlist diupdate + audit UPDATE user before/after", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u_1",
        full_name: "Budi",
        phone: null,
        preferred_language: "id"
      });
      prismaMock.user.update.mockResolvedValue({
        id: "u_1",
        full_name: "Budi Santoso",
        phone: "0812",
        preferred_language: "en"
      });
      const result = await service.updateMyProfile(
        "u_1",
        { fullName: "Budi Santoso", phone: "0812", preferredLanguage: "en" },
        ctx()
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "u_1" },
        data: { full_name: "Budi Santoso", phone: "0812", preferred_language: "en" }
      });
      expect(result.full_name).toBe("Budi Santoso");
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "UPDATE", entity: "user", entity_id: "u_1" })
        })
      );
    });
  });

  describe("requestDelete — dedupe 1 PENDING per user", () => {
    it("PENDING sudah ada → 409", async () => {
      prismaMock.pdpRequest.findFirst.mockResolvedValue({ id: "req_1", status: "PENDING" });
      await expect(service.requestDelete("u_1", {}, ctx())).rejects.toThrow(ConflictException);
      expect(prismaMock.pdpRequest.create).not.toHaveBeenCalled();
    });

    it("tanpa PENDING → create + audit CREATE pdp_request", async () => {
      prismaMock.pdpRequest.findFirst.mockResolvedValue(null);
      prismaMock.pdpRequest.create.mockResolvedValue({
        id: "req_1",
        user_id: "u_1",
        type: "DELETE",
        status: "PENDING"
      });
      const result = await service.requestDelete("u_1", { reason: "pindah sekolah" }, ctx());
      expect(prismaMock.pdpRequest.create).toHaveBeenCalledWith({
        data: { user_id: "u_1", type: "DELETE", reason: "pindah sekolah" }
      });
      expect(result.id).toBe("req_1");
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "CREATE", entity: "pdp_request" })
        })
      );
    });
  });

  describe("PdpAnonymizeService — anonimisasi PII, data legal dipertahankan", () => {
    it("PII → placeholder, is_active=false, email/username/avatar null", async () => {
      await anonymize.anonymizeUser("u_1", "req_1", ctx());
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "u_1" },
        data: expect.objectContaining({
          is_active: false,
          full_name: "[dihapus]",
          phone: "[dihapus]",
          avatar_url: null,
          email: null,
          username: null
        })
      });
      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: "u_1" }
      });
      expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
        where: { user_id: "u_1" }
      });
      expect(prismaMock.userPermissionOverride.deleteMany).toHaveBeenCalledWith({
        where: { user_id: "u_1" }
      });
    });

    it("H1: PpdbApplicant/ParentGuardian/Alumni milik user dianonimisasi, data akademik dipertahankan", async () => {
      prismaMock.dataExportLog.findMany.mockResolvedValue([]);
      await anonymize.anonymizeUser("u_1", "req_1", ctx());

      expect(prismaMock.ppdbApplicant.updateMany).toHaveBeenCalledWith({
        where: { user_id: "u_1" },
        data: expect.objectContaining({
          full_name: "[dihapus]",
          nisn: "[dihapus]",
          birth_place: "[dihapus]",
          phone: "[dihapus]",
          email: null,
          parent_name: "[dihapus]",
          parent_phone: "[dihapus]",
          documents: []
        })
      });
      expect(prismaMock.parentGuardian.updateMany).toHaveBeenCalledWith({
        where: { user_id: "u_1" },
        data: expect.objectContaining({
          full_name: "[dihapus]",
          phone: "[dihapus]",
          email: null
        })
      });
      // Alumni: NISN (identitas) dianonimisasi; baris & tahun lulus dipertahankan
      // (updateMany TIDAK menghapus baris).
      expect(prismaMock.alumni.updateMany).toHaveBeenCalledWith({
        where: { student_id: "u_1" },
        data: { final_nisn: "[dihapus]" }
      });
      expect(prismaMock.pdpRequest.updateMany).toHaveBeenCalledWith({
        where: { user_id: "u_1" },
        data: { reason: "[dihapus]", processed_note: "[dihapus]" }
      });
      // Data akademik/legal TIDAK di-delete: tidak ada deleteMany Grade/Enrollment
      // /ParentalConsent/AuditLog/DataExportLog — hanya 3 deleteMany sesi.
      expect(prismaMock.dataExportLog.update).not.toHaveBeenCalled();
      const deleteMocks = [
        prismaMock.refreshToken.deleteMany,
        prismaMock.notification.deleteMany,
        prismaMock.userPermissionOverride.deleteMany
      ];
      expect(deleteMocks.filter((m) => m.mock.calls.length > 0)).toHaveLength(3);
    });

    it("M-03: ekspor PERSONAL milik user — file_url di-null + file fisik dihapus", async () => {
      const exportDir = process.env.STORAGE_EXPORT_DIR as string;
      const filename = "pdp_export_u_1_2026-08-01T00-00-00-000Z.json";
      const filePath = join(exportDir, filename);
      writeFileSync(filePath, JSON.stringify({ profile: { full_name: "Budi" } }));
      prismaMock.dataExportLog.findMany.mockResolvedValue([
        { id: "log_p1", file_url: `exports/${filename}` }
      ]);

      await anonymize.anonymizeUser("u_1", "req_1", ctx());

      expect(prismaMock.dataExportLog.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["log_p1"] } },
        data: { file_url: null }
      });
      expect(existsSync(filePath)).toBe(false);
    });

    it("M-03: setelah anonymize, downloadMyExport → 404 (file_url null)", async () => {
      prismaMock.dataExportLog.findUnique.mockResolvedValue({
        id: "log_p1",
        requested_by: "u_1",
        export_type: "PERSONAL",
        file_url: null
      });
      await expect(service.downloadMyExport("u_1", "log_p1")).rejects.toThrow(NotFoundException);
    });

    it("data legal/akademik TIDAK dihapus (hanya 3 deleteMany sesi)", async () => {
      await anonymize.anonymizeUser("u_1", "req_1", ctx());
      const deleteMocks = [
        prismaMock.refreshToken.deleteMany,
        prismaMock.notification.deleteMany,
        prismaMock.userPermissionOverride.deleteMany,
        prismaMock.examAnswerLog.deleteMany,
        prismaMock.attendance.deleteMany,
        prismaMock.attendanceRecord.deleteMany
      ];
      const called = deleteMocks.filter((m) => m.mock.calls.length > 0);
      expect(called).toHaveLength(3);
    });

    it("audit DELETE entity pdp_request saat eksekusi", async () => {
      await anonymize.anonymizeUser("u_1", "req_1", ctx());
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DELETE",
            entity: "pdp_request",
            entity_id: "req_1"
          })
        })
      );
    });
  });

  describe("PdpRetentionService — cutoff delete/anonymize", () => {
    it("DELETE: deleteMany where created_at < cutoff", async () => {
      prismaMock.dataRetentionPolicy.findMany.mockResolvedValue([
        { entity: "Notification", retention_months: 60, action: "DELETE", enabled: true },
        { entity: "Attendance", retention_months: 60, action: "DELETE", enabled: true }
      ]);
      prismaMock.notification.deleteMany.mockResolvedValue({ count: 5 });
      prismaMock.attendance.deleteMany.mockResolvedValue({ count: 3 });

      const result = await retention.run();

      expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
        where: { created_at: { lt: expect.any(Date) } }
      });
      expect(prismaMock.attendance.deleteMany).toHaveBeenCalledWith({
        where: { created_at: { lt: expect.any(Date) } }
      });
      expect(result.summary).toMatchObject({ "Notification.deleted": 5, "Attendance.deleted": 3 });
      expect(result.processed).toBe(8);
    });

    it("ANONYMIZE: kolom teks CounselingNote → placeholder", async () => {
      prismaMock.dataRetentionPolicy.findMany.mockResolvedValue([
        { entity: "CounselingNote", retention_months: 60, action: "ANONYMIZE", enabled: true }
      ]);
      prismaMock.counselingNote.updateMany.mockResolvedValue({ count: 2 });

      const result = await retention.run();

      expect(prismaMock.counselingNote.updateMany).toHaveBeenCalledWith({
        where: { created_at: { lt: expect.any(Date) } },
        data: { topic: "[dihapus]", note: "[dihapus]", follow_up: "[dihapus]" }
      });
      expect(result.summary).toMatchObject({ "CounselingNote.anonymized": 2 });
    });

    it("ARCHIVE: dicatat warning, tidak menghapus", async () => {
      prismaMock.dataRetentionPolicy.findMany.mockResolvedValue([
        { entity: "Notification", retention_months: 60, action: "ARCHIVE", enabled: true }
      ]);
      const result = await retention.run();
      expect(prismaMock.notification.deleteMany).not.toHaveBeenCalled();
      expect(result.summary).toMatchObject({ "Notification.archived": 0 });
    });

    it("DELETE CounselingNote: TIDAK di-hard-delete — kolom dianonimisasi", async () => {
      prismaMock.dataRetentionPolicy.findMany.mockResolvedValue([
        { entity: "CounselingNote", retention_months: 60, action: "DELETE", enabled: true }
      ]);
      prismaMock.counselingNote.updateMany.mockResolvedValue({ count: 2 });

      const result = await retention.run();

      expect(prismaMock.counselingNote.updateMany).toHaveBeenCalledWith({
        where: { created_at: { lt: expect.any(Date) } },
        data: { topic: "[dihapus]", note: "[dihapus]", follow_up: "[dihapus]" }
      });
      expect(result.summary).toMatchObject({ "CounselingNote.deleted": 2 });
    });

    it("ANONYMIZE Notification: belum didukung → warning, 0 diproses", async () => {
      prismaMock.dataRetentionPolicy.findMany.mockResolvedValue([
        { entity: "Notification", retention_months: 60, action: "ANONYMIZE", enabled: true }
      ]);
      const result = await retention.run();
      expect(prismaMock.notification.deleteMany).not.toHaveBeenCalled();
      expect(result.summary).toMatchObject({ "Notification.anonymized": 0 });
    });

    it("M-07: ekspor PERSONAL > 3 bulan → file dihapus + file_url null (log dipertahankan)", async () => {
      const exportDir = process.env.STORAGE_EXPORT_DIR as string;
      const filename = "pdp_export_u_1_2025-01-01T00-00-00-000Z.json";
      const filePath = join(exportDir, filename);
      writeFileSync(filePath, JSON.stringify({ profile: { full_name: "Lama" } }));
      prismaMock.dataRetentionPolicy.findMany.mockResolvedValue([]);
      prismaMock.dataExportLog.findMany.mockResolvedValue([
        {
          id: "log_old",
          export_type: "PERSONAL",
          file_url: `exports/${filename}`
        }
      ]);
      prismaMock.dataExportLog.updateMany.mockResolvedValue({ count: 1 });

      const result = await retention.run();

      expect(prismaMock.dataExportLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            export_type: "PERSONAL",
            file_url: { not: null },
            created_at: { lt: expect.any(Date) }
          })
        })
      );
      expect(prismaMock.dataExportLog.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["log_old"] } },
        data: { file_url: null }
      });
      expect(existsSync(filePath)).toBe(false);
      expect(result.summary).toMatchObject({ "DataExportLog.personal_expired": 1 });
    });
  });

  describe("downloadMyExport — hanya milik sendiri (PERSONAL)", () => {
    it("ekspor milik sendiri PERSONAL → path aman", async () => {
      prismaMock.dataExportLog.findUnique.mockResolvedValue({
        id: "log_1",
        requested_by: "u_1",
        export_type: "PERSONAL",
        file_url: "exports/pdp_export_u_1.json"
      });
      const result = await service.downloadMyExport("u_1", "log_1");
      expect(result.filename).toBe("pdp_export_u_1.json");
      expect(result.filePath).toContain("pdp_export_u_1.json");
    });

    it("ekspor user lain → 403", async () => {
      prismaMock.dataExportLog.findUnique.mockResolvedValue({
        id: "log_1",
        requested_by: "u_2",
        export_type: "PERSONAL",
        file_url: "exports/x.json"
      });
      await expect(service.downloadMyExport("u_1", "log_1")).rejects.toThrow(ForbiddenException);
    });

    it("ekspor non-PERSONAL (NILAI) → 403", async () => {
      prismaMock.dataExportLog.findUnique.mockResolvedValue({
        id: "log_1",
        requested_by: "u_1",
        export_type: "NILAI",
        file_url: "exports/x.csv"
      });
      await expect(service.downloadMyExport("u_1", "log_1")).rejects.toThrow(ForbiddenException);
    });

    it("log tidak ditemukan → 404", async () => {
      prismaMock.dataExportLog.findUnique.mockResolvedValue(null);
      await expect(service.downloadMyExport("u_1", "log_x")).rejects.toThrow(NotFoundException);
    });
  });

  describe("collectPersonalData & exportPersonalData", () => {
    it("collectPersonalData: query scoped user.id + audit VIEW pdp_data_access", async () => {
      stubPersonalData();
      const data = await service.collectPersonalData("u_1", ctx());
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u_1" },
        select: expect.any(Object)
      });
      expect(data.profile.full_name).toBe("Budi Santoso");
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "VIEW",
            entity: "pdp_data_access",
            entity_id: "u_1"
          })
        })
      );
    });

    it("exportPersonalData: DataExportLog PERSONAL COMPLETED + audit EXPORT", async () => {
      stubPersonalData();
      prismaMock.dataExportLog.create.mockResolvedValue({
        id: "log_1",
        file_url: "exports/pdp_export_u_1.json"
      });
      const result = await service.exportPersonalData("u_1", {}, ctx());
      expect(prismaMock.dataExportLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          export_type: "PERSONAL",
          requested_by: "u_1",
          status: "COMPLETED"
        })
      });
      expect(result.format).toBe("json");
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "EXPORT", entity: "pdp_data_export" })
        })
      );
    });

    it("exportPersonalData CSV: nilai diawali formula (=/+) dinetralkan prefix apostrof", async () => {
      stubPersonalData();
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u_1",
        username: "budi",
        email: "budi@opensis.local",
        full_name: "=SUM(A1:A9)",
        phone: "+62812",
        avatar_url: null,
        is_active: true,
        preferred_language: "id",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z")
      });
      let fileUrl = "";
      prismaMock.dataExportLog.create.mockImplementation(
        async ({ data }: { data: { file_url: string } }) => {
          fileUrl = data.file_url;
          return { id: "log_1", file_url: data.file_url };
        }
      );

      await service.exportPersonalData("u_1", { format: "csv" }, ctx());

      const filename = fileUrl.replace(/^exports\//, "");
      const content = readFileSync(
        join(process.env.STORAGE_EXPORT_DIR as string, filename),
        "utf8"
      );
      expect(content).toContain("section,field,value");
      expect(content).toContain("'=SUM(A1:A9)");
      expect(content).toContain("'+62812");
    });
  });

  describe("approveRequest — anonimisasi + EXECUTED", () => {
    it("PENDING → anonymizeUser dipanggil + status EXECUTED", async () => {
      prismaMock.pdpRequest.findUnique.mockResolvedValue({
        id: "req_1",
        user_id: "u_1",
        status: "PENDING"
      });
      prismaMock.pdpRequest.update.mockResolvedValue({ id: "req_1", status: "EXECUTED" });
      prismaMock.user.update.mockResolvedValue({ id: "u_1" });
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.notification.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.userPermissionOverride.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.approveRequest(
        "req_1",
        "admin_1",
        { note: "disetujui" },
        ctx({ userId: "admin_1", roles: ["SUPERADMIN"] })
      );

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "u_1" },
          data: expect.objectContaining({ is_active: false, full_name: "[dihapus]" })
        })
      );
      expect(prismaMock.pdpRequest.update).toHaveBeenCalledWith({
        where: { id: "req_1" },
        data: expect.objectContaining({ status: "EXECUTED", processed_by: "admin_1" })
      });
      expect(result.status).toBe("EXECUTED");
    });

    it("sudah diproses → 409", async () => {
      prismaMock.pdpRequest.findUnique.mockResolvedValue({
        id: "req_1",
        user_id: "u_1",
        status: "EXECUTED"
      });
      await expect(
        service.approveRequest("req_1", "admin_1", {}, ctx({ userId: "admin_1" }))
      ).rejects.toThrow(ConflictException);
    });
  });
});
