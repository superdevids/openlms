import { RaporExportService } from "../../export/rapor-export.service";
import { DapodikExportService } from "../../export/dapodik-export.service";
import { ReportProcessor } from "./report.processor";

jest.mock("@opensis/database", () => ({
  prisma: {
    dataExportLog: { findUnique: jest.fn(), update: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";

const prismaMock = prisma as unknown as {
  dataExportLog: { findUnique: jest.Mock; update: jest.Mock };
};

const log = (overrides: Record<string, unknown> = {}) => ({
  id: "log_1",
  export_type: "RAPOR",
  requested_by: "u_1",
  status: "PENDING",
  file_url: null,
  record_count: null,
  started_at: null,
  finished_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
});

describe("ReportProcessor — dispatcher report.generate", () => {
  let processor: ReportProcessor;
  let raporMock: { generate: jest.Mock };
  let dapodikMock: { generate: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    raporMock = { generate: jest.fn().mockResolvedValue(undefined) };
    dapodikMock = { generate: jest.fn().mockResolvedValue(undefined) };
    processor = new ReportProcessor(
      raporMock as unknown as RaporExportService,
      dapodikMock as unknown as DapodikExportService
    );
    prismaMock.dataExportLog.update.mockResolvedValue({ id: "log_1" });
  });

  it("payload tanpa exportLogId → dilewati tanpa update", async () => {
    await processor.handle({ foo: "bar" });
    expect(prismaMock.dataExportLog.update).not.toHaveBeenCalled();
  });

  it("log tidak ditemukan → dilewati", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(null);
    await processor.handle({ exportLogId: "log_x" });
    expect(prismaMock.dataExportLog.update).not.toHaveBeenCalled();
  });

  it("COMPLETED → dilewati (idempoten)", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log({ status: "COMPLETED" }));
    await processor.handle({ exportLogId: "log_1" });
    expect(prismaMock.dataExportLog.update).not.toHaveBeenCalled();
    expect(raporMock.generate).not.toHaveBeenCalled();
  });

  it("PROCESSING → dilewati (anti duplikasi)", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log({ status: "PROCESSING" }));
    await processor.handle({ exportLogId: "log_1" });
    expect(prismaMock.dataExportLog.update).not.toHaveBeenCalled();
  });

  it("RAPOR → PROCESSING lalu raporExportService.generate + COMPLETED oleh generator", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log());
    await processor.handle({
      exportLogId: "log_1",
      params: { studentId: "stu_1", semester: "GANJIL", academicYear: "2026/2027" }
    });

    expect(prismaMock.dataExportLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PROCESSING" }) })
    );
    expect(raporMock.generate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "log_1" }),
      expect.objectContaining({ studentId: "stu_1" })
    );
    expect(dapodikMock.generate).not.toHaveBeenCalled();
  });

  it("DAPODIK → dapodikExportService.generate", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log({ export_type: "DAPODIK" }));
    await processor.handle({ exportLogId: "log_1", params: { academicYear: "2026/2027" } });
    expect(dapodikMock.generate).toHaveBeenCalledWith(
      expect.objectContaining({ export_type: "DAPODIK" }),
      expect.objectContaining({ academicYear: "2026/2027" })
    );
    expect(raporMock.generate).not.toHaveBeenCalled();
  });

  it("export_type tidak dikenal → FAILED + throw", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log({ export_type: "ANBK" }));
    await expect(processor.handle({ exportLogId: "log_1" })).rejects.toThrow("tidak didukung");
    const calls = prismaMock.dataExportLog.update.mock.calls;
    expect(calls.some((c) => c[0].data.status === "FAILED")).toBe(true);
  });

  it("generator gagal → FAILED + throw (service sudah menandai, update ganda aman)", async () => {
    prismaMock.dataExportLog.findUnique.mockResolvedValue(log());
    raporMock.generate.mockRejectedValue(new Error("pdf error"));
    await expect(
      processor.handle({ exportLogId: "log_1", params: { studentId: "stu_1" } })
    ).rejects.toThrow("pdf error");
    const calls = prismaMock.dataExportLog.update.mock.calls;
    expect(calls.some((c) => c[0].data.status === "FAILED")).toBe(true);
  });
});
