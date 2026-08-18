import { ForbiddenException } from "@nestjs/common";
import type { RequestContext } from "@opensis/types";
import { PERMISSIONS_KEY } from "../../common/require-permission.decorator";
import { RaporController } from "./rapor.controller";

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
  schoolProfile: { findFirst: jest.Mock };
  enrollment: { findFirst: jest.Mock };
  dataExportLog: { create: jest.Mock };
};

const ctx = (partial: Partial<RequestContext> = {}): RequestContext => ({
  userId: "u_1",
  roles: ["SISWA"],
  classIds: [],
  homeroomClassId: null,
  requestId: "req_test",
  ...partial
});

describe("RaporController — export-pdf permission matrix", () => {
  it("POST export-pdf mengizinkan report:export:self | class | school", () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      RaporController.prototype.exportPdf
    ) as string[];
    expect(permissions).toContain("report:export:self");
    expect(permissions).toContain("report:export:class");
    expect(permissions).toContain("report:export:school");
  });

  it("GET rapor siswa tetap memakai report:read:self/class/school (v1 tidak berubah)", () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      RaporController.prototype.studentRapor
    ) as string[];
    expect(permissions).toContain("report:read:self");
    expect(permissions).toContain("report:read:class");
    expect(permissions).toContain("report:read:school");
  });

  it("row-level: SISWA mengekspor siswa lain → 403 (assertCanReadRapor)", async () => {
    const service = new RaporService(undefined);
    await expect(
      service.requestRaporExport(
        "stu_2",
        { semester: "GANJIL" },
        ctx({ userId: "stu_1", roles: ["SISWA"] })
      )
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.dataExportLog.create).not.toHaveBeenCalled();
  });

  it("row-level: KEPSEK (scope sekolah) ekspor siswa mana pun → log + enqueue", async () => {
    prismaMock.schoolProfile.findFirst.mockResolvedValue({
      current_academic_year: { code: "2026/2027" }
    });
    prismaMock.dataExportLog.create.mockResolvedValue({ id: "log_k" });
    const queueMock = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const service = new RaporService(queueMock as unknown as IJobQueue);

    const result = await service.requestRaporExport(
      "stu_1",
      { semester: "GENAP" },
      ctx({ userId: "kepsek_1", roles: ["KEPSEK"] })
    );
    expect(result.exportLogId).toBe("log_k");
    expect(queueMock.enqueue).toHaveBeenCalledWith("report.generate", {
      exportLogId: "log_k",
      params: { studentId: "stu_1", semester: "GENAP", academicYear: "2026/2027" }
    });
  });
});
