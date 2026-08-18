import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { PassThrough } from "stream";
import type { RequestContext } from "@opensis/types";
import type { PermissionsResolver } from "../auth/permissions-resolver";

jest.mock("@opensis/database", () => ({
  prisma: {
    dataExportLog: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { ExportService } from "./export.service";

const prismaMock = prisma as unknown as {
  dataExportLog: { findUnique: jest.Mock };
  auditLog: { create: jest.Mock };
};

const ctx = (partial: Partial<RequestContext> = {}): RequestContext => ({
  userId: "u_1",
  roles: ["SISWA"],
  classIds: [],
  homeroomClassId: null,
  requestId: "req_test",
  ...partial
});

describe("ExportService — autorisasi getExportLog", () => {
  const log = {
    id: "log_1",
    export_type: "RAPOR" as const,
    requested_by: "u_1",
    status: "COMPLETED" as const,
    file_url: "exports/rapor_x.pdf",
    record_count: 3,
    started_at: new Date(),
    finished_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  };

  let service: ExportService;
  let permissionsMock: {
    resolvePermissions: jest.Mock;
    resolveOverrides: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    permissionsMock = {
      resolvePermissions: jest.fn().mockResolvedValue([]),
      resolveOverrides: jest.fn().mockResolvedValue([])
    };
    service = new ExportService(permissionsMock as unknown as PermissionsResolver);
  });

  it("pemilik log (requested_by sama) → OK tanpa cek permission", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log);
    const result = await service.getExportLog("log_1", ctx({ userId: "u_1" }));
    expect(result.id).toBe("log_1");
    expect(permissionsMock.resolvePermissions).not.toHaveBeenCalled();
  });

  it("user lain tanpa export:read:school → 403", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log);
    permissionsMock.resolvePermissions.mockResolvedValue([
      { code: "report:read:self", scope: "SENDIRI", deny: false }
    ]);
    await expect(
      service.getExportLog("log_1", ctx({ userId: "u_2", roles: ["SISWA"] }))
    ).rejects.toThrow(ForbiddenException);
  });

  it("user lain dengan export:read:school → OK", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log);
    permissionsMock.resolvePermissions.mockResolvedValue([
      { code: "export:read:school", scope: "SEKOLAH", deny: false }
    ]);
    const result = await service.getExportLog(
      "log_1",
      ctx({ userId: "op_1", roles: ["OPERATOR"] })
    );
    expect(result.id).toBe("log_1");
    expect(permissionsMock.resolvePermissions).toHaveBeenCalled();
  });

  it("log tidak ditemukan → 404", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(null);
    await expect(service.getExportLog("log_x", ctx())).rejects.toThrow(NotFoundException);
  });
});

describe("ExportService — autorisasi PERSONAL (M-05)", () => {
  const personalLog = {
    id: "log_p",
    export_type: "PERSONAL" as const,
    requested_by: "u_1",
    status: "COMPLETED" as const,
    file_url: "exports/pdp_export_u_1.json",
    record_count: 1,
    started_at: new Date(),
    finished_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  };

  let service: ExportService;
  let permissionsMock: {
    resolvePermissions: jest.Mock;
    resolveOverrides: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    permissionsMock = {
      resolvePermissions: jest.fn().mockResolvedValue([]),
      resolveOverrides: jest.fn().mockResolvedValue([])
    };
    service = new ExportService(permissionsMock as unknown as PermissionsResolver);
  });

  it("OPERATOR (export:read:school) unduh PERSONAL milik user lain → 403", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(personalLog);
    permissionsMock.resolvePermissions.mockResolvedValue([
      { code: "export:read:school", scope: "SEKOLAH", deny: false }
    ]);
    await expect(
      service.getExportLog("log_p", ctx({ userId: "op_1", roles: ["OPERATOR"] }))
    ).rejects.toThrow(ForbiddenException);
    // TIDAK boleh jatuh ke jalur export:read:school untuk PERSONAL.
    expect(permissionsMock.resolvePermissions).not.toHaveBeenCalled();
  });

  it("SUPERADMIN unduh PERSONAL milik user lain → OK", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(personalLog);
    const result = await service.getExportLog(
      "log_p",
      ctx({ userId: "super_1", roles: ["SUPERADMIN"] })
    );
    expect(result.id).toBe("log_p");
    expect(permissionsMock.resolvePermissions).not.toHaveBeenCalled();
  });

  it("pemilik (requested_by) unduh PERSONAL sendiri → OK tanpa cek permission", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(personalLog);
    const result = await service.getExportLog("log_p", ctx({ userId: "u_1" }));
    expect(result.id).toBe("log_p");
    expect(permissionsMock.resolvePermissions).not.toHaveBeenCalled();
  });

  it("SISWA lain (tanpa SUPERADMIN) → 403", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(personalLog);
    await expect(
      service.getExportLog("log_p", ctx({ userId: "siswa_2", roles: ["SISWA"] }))
    ).rejects.toThrow(ForbiddenException);
  });

  it("download PERSONAL dengan ctx → AuditLog VIEW data_export_log dicatat", async () => {
    const exportDir = join(tmpdir(), `opensis-export-personal-${Date.now()}`);
    const originalDir = process.env.STORAGE_EXPORT_DIR;
    mkdirSync(exportDir, { recursive: true });
    process.env.STORAGE_EXPORT_DIR = exportDir;
    try {
      writeFileSync(join(exportDir, "pdp_export_u_1.json"), JSON.stringify({ a: 1 }));
      // Service dibangun SETELAH env di-set agar exportDir mengarah ke dir test.
      const svc = new ExportService(permissionsMock as unknown as PermissionsResolver);
      const passthrough = new PassThrough();
      const res = Object.assign(passthrough, {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        headersSent: false
      }) as never;
      const log = { ...personalLog, file_url: "exports/pdp_export_u_1.json" };
      const done = new Promise<void>((resolve, reject) => {
        passthrough.on("data", () => undefined);
        passthrough.on("end", () => resolve());
        passthrough.on("error", reject);
        void svc
          .download(log, res, undefined, ctx({ userId: "u_1", roles: ["SISWA"] }))
          .then(resolve, reject);
      });
      await done;
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "VIEW",
            entity: "data_export_log",
            entity_id: "log_p"
          })
        })
      );
    } finally {
      if (originalDir === undefined) delete process.env.STORAGE_EXPORT_DIR;
      else process.env.STORAGE_EXPORT_DIR = originalDir;
      rmSync(exportDir, { recursive: true, force: true });
    }
  });
});

describe("ExportService — download stream", () => {
  const exportDir = join(tmpdir(), `opensis-export-test-${Date.now()}`);
  const originalDir = process.env.STORAGE_EXPORT_DIR;

  beforeAll(() => {
    mkdirSync(exportDir, { recursive: true });
    process.env.STORAGE_EXPORT_DIR = exportDir;
  });

  afterAll(() => {
    if (originalDir === undefined) delete process.env.STORAGE_EXPORT_DIR;
    else process.env.STORAGE_EXPORT_DIR = originalDir;
    rmSync(exportDir, { recursive: true, force: true });
  });

  it("multi-file tanpa param file → 400; param file tak dikenal → 404", async () => {
    const permissionsMock = {
      resolvePermissions: jest.fn(),
      resolveOverrides: jest.fn()
    } as unknown as PermissionsResolver;
    const service = new ExportService(permissionsMock);
    const log = {
      id: "log_d",
      export_type: "DAPODIK" as const,
      requested_by: "u_1",
      status: "COMPLETED" as const,
      file_url: "exports/dapodik_x/peserta_didik.csv,exports/dapodik_x/pendidik.csv",
      record_count: 2,
      started_at: new Date(),
      finished_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    const res = { setHeader: jest.fn(), status: jest.fn(), headersSent: false } as never;

    await expect(service.download(log, res)).rejects.toThrow("Pilih file");
    await expect(service.download(log, res, "tidak-ada.csv")).rejects.toThrow(NotFoundException);
  });

  it("stream file tunggal dengan Content-Disposition attachment", async () => {
    writeFileSync(join(exportDir, "rapor_a.pdf"), Buffer.from("%PDF-1.4 test"));
    const permissionsMock = {
      resolvePermissions: jest.fn(),
      resolveOverrides: jest.fn()
    } as unknown as PermissionsResolver;
    const service = new ExportService(permissionsMock);
    const log = {
      id: "log_s",
      export_type: "RAPOR" as const,
      requested_by: "u_1",
      status: "COMPLETED" as const,
      file_url: "exports/rapor_a.pdf",
      record_count: 1,
      started_at: new Date(),
      finished_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    // Writable asli (PassThrough) — stream.pipe butuh EventEmitter+Writable.
    const passthrough = new PassThrough();
    const res = Object.assign(passthrough, {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      headersSent: false
    }) as never;

    const result = new Promise<void>((resolve, reject) => {
      passthrough.on("data", () => undefined);
      passthrough.on("end", () => resolve());
      passthrough.on("error", reject);
      void service.download(log, res).then(resolve, reject);
    });
    await result;

    const mockRes = res as unknown as { setHeader: jest.Mock };
    const disposition = mockRes.setHeader.mock.calls.find((c) => c[0] === "Content-Disposition");
    expect(disposition?.[1]).toContain('attachment; filename="rapor_a.pdf"');
    const contentType = mockRes.setHeader.mock.calls.find((c) => c[0] === "Content-Type");
    expect(contentType?.[1]).toBe("application/pdf");
  });
});
