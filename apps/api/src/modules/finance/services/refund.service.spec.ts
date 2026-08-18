/**
 * RefundService — unit test (prd04 §5.F.4): create refund, approval berlapis
 * (KEUANGAN → KEPSEK bila >= ambang), reject, PAID + arus kas keluar (REFUND).
 * Store: InMemoryFinanceStore; prisma (appFeatureSetting) di-mock → default ambang.
 */
import { BadRequestException, NotFoundException } from "@nestjs/common";

jest.mock("@opensis/database", () => ({
  prisma: {
    appFeatureSetting: { findUnique: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { InMemoryFinanceStore } from "../finance.store";
import { FinanceConfigService } from "./finance-config.service";
import { RefundService, CreateRefundInput } from "./refund.service";

const prismaMock = prisma as unknown as {
  appFeatureSetting: { findUnique: jest.Mock };
};

function makeHarness() {
  const store = new InMemoryFinanceStore();
  const configService = new FinanceConfigService();
  const service = new RefundService(store, configService);
  return { service, store };
}

function baseInput(overrides: Partial<CreateRefundInput> = {}): CreateRefundInput {
  return {
    paymentId: "pay_1",
    studentId: "stu_1",
    amount: "500000",
    reason: "Kelebihan bayar SPP",
    method: "TRANSFER",
    note: "refund manual",
    createdBy: "u_keuangan",
    ...overrides
  };
}

describe("RefundService.create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.appFeatureSetting.findUnique.mockResolvedValue(null); // default ambang 1jt
  });

  it("refund kecil (< ambang) → PENDING, tanpa approval KEPSEK", async () => {
    const { service } = makeHarness();

    const record = await service.create(baseInput({ amount: "500000" }));

    expect(record.status).toBe("PENDING");
    expect(record.requiresKepsekApproval).toBe(false);
    expect(record.amount.toString()).toBe("500000");
    expect(record.refundNo).toBe(`REF-${new Date().getFullYear()}-00001`);
    expect(record.paymentId).toBe("pay_1");
  });

  it("refund >= ambang (1jt) → requiresKepsekApproval true", async () => {
    const { service } = makeHarness();

    const record = await service.create(baseInput({ amount: "1000000" }));

    expect(record.requiresKepsekApproval).toBe(true);
  });

  it("amount 0/negatif → BadRequest", async () => {
    const { service } = makeHarness();

    await expect(service.create(baseInput({ amount: "0" }))).rejects.toThrow(BadRequestException);
    await expect(service.create(baseInput({ amount: "-1000" }))).rejects.toThrow(
      BadRequestException
    );
  });

  it("reason kosong → BadRequest", async () => {
    const { service } = makeHarness();

    await expect(service.create(baseInput({ reason: "   " }))).rejects.toThrow(BadRequestException);
  });

  it("create menulis AuditLog CREATE dengan refundNo & ambang", async () => {
    const { service, store } = makeHarness();

    const record = await service.create(baseInput());

    const logs = await store.listAuditLogs("Refund", record.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]!.action).toBe("CREATE");
    expect(logs[0]!.actorRole).toBe("KEUANGAN");
    expect(logs[0]!.after).toEqual(
      expect.objectContaining({ refundNo: record.refundNo, amount: "500000" })
    );
  });

  it("nomor refund berurutan per tahun", async () => {
    const { service } = makeHarness();
    await service.create(baseInput());
    const second = await service.create(baseInput());

    const year = new Date().getFullYear();
    expect(second.refundNo).toBe(`REF-${year}-00002`);
  });
});

describe("RefundService.approveByKeuangan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.appFeatureSetting.findUnique.mockResolvedValue(null);
  });

  it("refund kecil → langsung PAID + CashFlowRecord OUT (REFUND)", async () => {
    const { service, store } = makeHarness();
    const record = await service.create(baseInput({ amount: "500000" }));

    const updated = await service.approveByKeuangan(record.id, true, "u_keuangan");

    expect(updated.status).toBe("PAID");
    expect(updated.approvedByKeuangan).toBe("u_keuangan");
    expect(updated.paidAt).not.toBeNull();

    const flows = await store.listCashFlowRecords();
    expect(flows).toHaveLength(1);
    expect(flows[0]!.direction).toBe("OUT");
    expect(flows[0]!.category).toBe("REFUND");
    expect(flows[0]!.referenceId).toBe(record.refundNo);
    expect(flows[0]!.amount.toString()).toBe("500000");
  });

  it("refund besar → APPROVED_KEUANGAN menunggu KEPSEK (belum ada arus kas)", async () => {
    const { service, store } = makeHarness();
    const record = await service.create(baseInput({ amount: "2500000" }));

    const updated = await service.approveByKeuangan(record.id, true, "u_keuangan");

    expect(updated.status).toBe("APPROVED_KEUANGAN");
    expect(updated.approvedByKeuangan).toBe("u_keuangan");
    expect(await store.listCashFlowRecords()).toHaveLength(0);
  });

  it("status bukan PENDING → BadRequest", async () => {
    const { service, store } = makeHarness();
    const record = await service.create(baseInput({ amount: "500000" }));
    await store.updateRefund(record.id, { status: "PAID" });

    await expect(service.approveByKeuangan(record.id, true, "u_keuangan")).rejects.toThrow(
      BadRequestException
    );
  });

  it("approved=false → REJECTED + audit, tanpa arus kas", async () => {
    const { service, store } = makeHarness();
    const record = await service.create(baseInput());

    const updated = await service.approveByKeuangan(record.id, false, "u_keuangan", "kurang bukti");

    expect(updated.status).toBe("REJECTED");
    expect(updated.note).toBe("kurang bukti");
    expect(await store.listCashFlowRecords()).toHaveLength(0);
    const logs = await store.listAuditLogs("Refund", record.id);
    expect(
      logs.some((l) => l.after && (l.after as { status?: string }).status === "REJECTED")
    ).toBe(true);
  });
});

describe("RefundService.approveByKepsek", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.appFeatureSetting.findUnique.mockResolvedValue(null);
  });

  it("refund besar: KEUANGAN → KEPSEK → PAID + arus kas keluar", async () => {
    const { service, store } = makeHarness();
    const record = await service.create(baseInput({ amount: "2500000" }));
    await service.approveByKeuangan(record.id, true, "u_keuangan");

    const updated = await service.approveByKepsek(record.id, true, "u_kepsek");

    expect(updated.status).toBe("PAID");
    expect(updated.approvedByKepsek).toBe("u_kepsek");
    const flows = await store.listCashFlowRecords();
    expect(flows).toHaveLength(1);
    expect(flows[0]!.category).toBe("REFUND");
    expect(flows[0]!.amount.toString()).toBe("2500000");
  });

  it("status bukan APPROVED_KEUANGAN → BadRequest", async () => {
    const { service } = makeHarness();
    const record = await service.create(baseInput({ amount: "2500000" }));

    await expect(service.approveByKepsek(record.id, true, "u_kepsek")).rejects.toThrow(
      BadRequestException
    );
  });

  it("approved=false → REJECTED (tanpa arus kas)", async () => {
    const { service, store } = makeHarness();
    const record = await service.create(baseInput({ amount: "2500000" }));
    await service.approveByKeuangan(record.id, true, "u_keuangan");

    const updated = await service.approveByKepsek(record.id, false, "u_kepsek", "ditolak kepsek");

    expect(updated.status).toBe("REJECTED");
    expect(await store.listCashFlowRecords()).toHaveLength(0);
  });
});

describe("RefundService.get & list", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.appFeatureSetting.findUnique.mockResolvedValue(null);
  });

  it("get refund tidak ditemukan → NotFound", async () => {
    const { service } = makeHarness();
    await expect(service.get("ref_unknown")).rejects.toThrow(NotFoundException);
  });

  it("get mengembalikan record yang ada; list menampilkan semua", async () => {
    const { service, store } = makeHarness();
    const record = await service.create(baseInput());
    await service.create(baseInput({ amount: "2000000" }));

    const found = await service.get(record.id);
    expect(found.id).toBe(record.id);
    expect(await service.list()).toHaveLength(2);
    expect((await store.listAuditLogs("Refund")).length).toBeGreaterThanOrEqual(2);
  });
});
