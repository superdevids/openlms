import { ConflictException, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import type { FinanceStore } from "../finance.store";
import type { NotificationService } from "../../notifications/notifications.service";
import type { RealtimeGateway } from "../../realtime/realtime.gateway";

jest.mock("@opensis/database", () => ({
  prisma: {
    payment: { findUnique: jest.fn() },
    invoice: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn()
  }
}));

import { prisma } from "@opensis/database";
import { PaymentService } from "./payment.service";

const prismaMock = prisma as unknown as {
  payment: { findUnique: jest.Mock };
  invoice: { findUnique: jest.Mock; update: jest.Mock };
  auditLog: { create: jest.Mock };
  $transaction: jest.Mock;
};

// Tx TERPISAH dari prisma global → tes membuktikan recompute memakai tx,
// bukan prisma global (recompute terjadi DALAM transaksi yang sama).
const tx = {
  payment: { updateMany: jest.fn(), findUnique: jest.fn() },
  invoice: { findUnique: jest.fn(), update: jest.fn() },
  auditLog: { create: jest.fn() }
};

let paymentStatus: string;

/** Mock stateful: mensimulasikan conditional update atomik (where.status). */
function installStatefulVerifyMock() {
  paymentStatus = "PENDING";
  prismaMock.$transaction.mockImplementation(async (cb: (t: typeof tx) => Promise<unknown>) =>
    cb(tx)
  );
  prismaMock.payment.findUnique.mockResolvedValue({
    id: "pay_1",
    invoice_id: "inv_1",
    status: "PENDING",
    amount: new Decimal("1000"),
    note: null,
    invoice: { id: "inv_1", invoice_no: "INV-001", student_id: "s_1" }
  });
  tx.payment.updateMany.mockImplementation(
    async ({
      where,
      data
    }: {
      where: { id: string; status: string };
      data: { status: string };
    }) => {
      if (where.id === "pay_1" && where.status === "PENDING" && paymentStatus === "PENDING") {
        paymentStatus = data.status;
        return { count: 1 };
      }
      return { count: 0 };
    }
  );
  tx.payment.findUnique.mockImplementation(async () => ({
    id: "pay_1",
    invoice_id: "inv_1",
    status: paymentStatus,
    verified_by: paymentStatus === "PAID" ? "u_1" : null,
    verified_at: paymentStatus === "PAID" ? new Date() : null,
    amount: new Decimal("1000"),
    note: null,
    invoice: { id: "inv_1", invoice_no: "INV-001", student_id: "s_1" }
  }));
  tx.invoice.findUnique.mockImplementation(async () => ({
    id: "inv_1",
    amount: new Decimal("1000"),
    discount: new Decimal("0"),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
    payments: [{ status: paymentStatus, amount: new Decimal("1000") }]
  }));
  tx.invoice.update.mockResolvedValue({});
  tx.auditLog.create.mockResolvedValue({});
}

describe("PaymentService.verify — atomic claim (REL-002)", () => {
  let service: PaymentService;
  const notifications = { createForUser: jest.fn() };
  const realtime = { emitToUser: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    installStatefulVerifyMock();
    notifications.createForUser.mockResolvedValue({});
    realtime.emitToUser.mockReturnValue(undefined);
    service = new PaymentService(
      {} as unknown as FinanceStore,
      notifications as unknown as NotificationService,
      realtime as unknown as RealtimeGateway
    );
  });

  it("verify sukses: updateMany kondisional + recompute DALAM tx + notifikasi setelah commit", async () => {
    const result = await service.verify("pay_1", true, "u_1");

    expect(result.status).toBe("PAID");
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PENDING" },
      data: expect.objectContaining({ status: "PAID", verified_by: "u_1" })
    });
    // Recompute memakai tx (bukan prisma global) → invoice ter-update dalam transaksi.
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv_1" },
      data: { status: "PAID" }
    });
    expect(prismaMock.invoice.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    // Notifikasi hanya setelah commit (satu verify sukses → satu notifikasi).
    expect(notifications.createForUser).toHaveBeenCalledTimes(1);
    expect(realtime.emitToUser).toHaveBeenCalledTimes(1);
  });

  it("race: dua verify bersamaan → 1 sukses, 1 ConflictException, notifikasi sekali", async () => {
    const results = await Promise.allSettled([
      service.verify("pay_1", true, "u_1"),
      service.verify("pay_1", true, "u_1")
    ]);

    const fulfilled = results.find((r) => r.status === "fulfilled");
    const rejected = results.find((r) => r.status === "rejected");

    expect(fulfilled?.status).toBe("fulfilled");
    if (fulfilled?.status === "fulfilled") {
      expect(fulfilled.value.status).toBe("PAID");
    }
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(ConflictException);
    }
    // Yang kalah race tidak boleh memicu notifikasi → total tetap 1.
    expect(notifications.createForUser).toHaveBeenCalledTimes(1);
  });

  it("verify kedua (status sudah PAID) → ConflictException, tanpa notifikasi baru", async () => {
    await service.verify("pay_1", true, "u_1");
    await expect(service.verify("pay_1", true, "u_1")).rejects.toBeInstanceOf(ConflictException);
    expect(notifications.createForUser).toHaveBeenCalledTimes(1);
  });

  it("approved=false → status CANCELLED, verified_at null, tanpa notifikasi", async () => {
    await service.verify("pay_1", false, "u_1", "bukti tidak jelas");

    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PENDING" },
      data: expect.objectContaining({ status: "CANCELLED", verified_at: null })
    });
    expect(notifications.createForUser).not.toHaveBeenCalled();
    expect(realtime.emitToUser).not.toHaveBeenCalled();
  });

  it("payment tidak ditemukan → NotFoundException, tanpa claim", async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);
    await expect(service.verify("pay_x", true, "u_1")).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
  });
});
