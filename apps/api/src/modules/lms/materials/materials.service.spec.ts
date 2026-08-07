import { ForbiddenException } from "@nestjs/common";
import type { RequestContext } from "@openlms/types";

jest.mock("@openlms/database", () => ({
  prisma: {
    classSubject: { findUnique: jest.fn() },
    material: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    auditLog: { create: jest.fn() }
  }
}));

import { prisma } from "@openlms/database";
import { MaterialsService } from "./materials.service";
import { StorageService } from "../storage/storage.service";

const prismaMock = prisma as unknown as {
  classSubject: { findUnique: jest.Mock };
  material: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  auditLog: { create: jest.Mock };
};

const teacherOfCs1: RequestContext = {
  userId: "t_1",
  roles: ["GURU"],
  classIds: ["c_1"],
  homeroomClassId: null,
  requestId: "req_test"
};

const teacherOfOther: RequestContext = {
  userId: "t_2",
  roles: ["GURU"],
  classIds: ["c_2"],
  homeroomClassId: null,
  requestId: "req_test"
};

describe("MaterialsService — scope guru pengampu (F2-T5)", () => {
  let service: MaterialsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaterialsService(new StorageService());
    prismaMock.classSubject.findUnique.mockResolvedValue({
      id: "cs_1",
      teacher_id: "t_1"
    });
  });

  it("guru yang bukan pengampu tidak bisa membuat materi → 403", async () => {
    await expect(
      service.create(
        {
          classSubjectId: "cs_1",
          title: "Materi 1",
          type: "DOCUMENT",
          contentUrl: "materials/cs_1/x.pdf"
        },
        teacherOfOther
      )
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.material.create).not.toHaveBeenCalled();
  });

  it("guru pengampu berhasil membuat materi + AuditLog", async () => {
    prismaMock.material.create.mockResolvedValue({
      id: "m_1",
      title: "Materi 1",
      is_published: false
    });

    const result = await service.create(
      {
        classSubjectId: "cs_1",
        title: "Materi 1",
        type: "DOCUMENT",
        contentUrl: "materials/cs_1/x.pdf",
        fileSize: 1024
      },
      teacherOfCs1
    );

    expect(result.id).toBe("m_1");
    expect(prismaMock.material.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          class_subject_id: "cs_1",
          is_published: false,
          created_by: "t_1"
        })
      })
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it("request signed upload memakai path bucket materials (local storage)", async () => {
    const res = await service.requestSignedUpload(
      { filename: "bahan ajar.pdf", classSubjectId: "cs_1", contentType: "application/pdf" },
      teacherOfCs1
    );
    expect(res.method).toBe("PUT");
    expect(res.objectPath).toMatch(/^materials\/cs_1\//);
    expect(res.uploadUrl).toContain("/api/v1/files/upload");
  });
});
