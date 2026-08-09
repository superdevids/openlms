import type { RolloverService } from "../../rollover/rollover.service";

jest.mock("@opensis/database", () => ({
  prisma: {
    rolloverRun: { findUnique: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { RolloverProcessor } from "./rollover.processor";

const prismaMock = prisma as unknown as {
  rolloverRun: { findUnique: jest.Mock };
};

describe("RolloverProcessor — idempotensi status (REL-001)", () => {
  let processor: RolloverProcessor;
  const service = { execute: jest.fn() };
  const payload = { runId: "r_1", idempotencyKey: "k_1", actorId: "a_1" };

  beforeEach(() => {
    jest.clearAllMocks();
    service.execute.mockResolvedValue({ status: "DONE" });
    processor = new RolloverProcessor(service as unknown as RolloverService);
  });

  it("payload tidak lengkap → dilewati tanpa query/execute", async () => {
    await processor.handle({ runId: "r_1" } as never);
    expect(prismaMock.rolloverRun.findUnique).not.toHaveBeenCalled();
    expect(service.execute).not.toHaveBeenCalled();
  });

  it.each(["RUNNING", "DONE", "ROLLED_BACK"])(
    "status %s (terminal/eksklusif) → dilewati, execute tidak dipanggil",
    async (status) => {
      prismaMock.rolloverRun.findUnique.mockResolvedValue({
        id: "r_1",
        idempotency_key: "k_1",
        status
      });
      await processor.handle(payload);
      expect(service.execute).not.toHaveBeenCalled();
    }
  );

  it.each(["DRAFT", "PREVIEW", "FAILED"])(
    "status %s → diproses (execute dipanggil)",
    async (status) => {
      prismaMock.rolloverRun.findUnique.mockResolvedValue({
        id: "r_1",
        idempotency_key: "k_1",
        status
      });
      await processor.handle(payload);
      expect(service.execute).toHaveBeenCalledTimes(1);
      expect(service.execute).toHaveBeenCalledWith("r_1", "a_1");
    }
  );

  it("run tidak ditemukan (fresh) → diproses", async () => {
    prismaMock.rolloverRun.findUnique.mockResolvedValue(null);
    await processor.handle(payload);
    expect(service.execute).toHaveBeenCalledTimes(1);
  });

  it("runId berbeda dari idempotency_key → tetap diproses (execute)", async () => {
    prismaMock.rolloverRun.findUnique.mockResolvedValue({
      id: "r_LAIN",
      idempotency_key: "k_1",
      status: "PREVIEW"
    });
    await processor.handle(payload);
    expect(service.execute).toHaveBeenCalledTimes(1);
  });
});
