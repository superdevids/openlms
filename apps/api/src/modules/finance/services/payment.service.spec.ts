import { ConflictException, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import type { FinanceStore } from "../finance.store";
import type { NotificationService } from "../../notifications/notifications.service";
import type { RealtimeGateway } from "../../realtime/realtime.gateway";

jest.mock("@opensis/database", () => ({
  prisma: {
    payment: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    invoice: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn()
  }
}));

import { prisma } from "@opensis/database";
import { PaymentService } from "./payment.service";

const prismaMock = prisma as unknown as {
  payment: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
  invoice: { findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock };
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
    const result = await service.verify("pay_1", true, "u_1", undefined, ["KEUANGAN"]);

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
    // R-13: entity lowercase + actor_role deterministik (bukan null).
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_id: "u_1",
        actor_role: "KEUANGAN",
        action: "UPDATE",
        entity: "payment",
        entity_id: "pay_1"
      })
    });
    // Notifikasi hanya setelah commit (satu verify sukses → satu notifikasi).
    expect(notifications.createForUser).toHaveBeenCalledTimes(1);
    expect(realtime.emitToUser).toHaveBeenCalledTimes(1);
  });

  it("verify tanpa actorRoles → actor_role null (bukan undefined/boom)", async () => {
    await service.verify("pay_1", true, "u_1");

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_id: "u_1",
        actor_role: null,
        entity: "payment"
      })
    });
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

  it("verify payment ber-alokasi lintas tagihan → recompute invoice primer DAN semua invoice sekunder", async () => {
    // Payment PENDING dengan alokasi ke 2 invoice (recordAllocated).
    paymentStatus = "PENDING";
    tx.payment.updateMany.mockImplementation(
      async ({
        where,
        data
      }: {
        where: { id: string; status: string };
        data: { status: string };
      }) => {
        if (where.id === "pay_alloc" && where.status === "PENDING" && paymentStatus === "PENDING") {
          paymentStatus = data.status;
          return { count: 1 };
        }
        return { count: 0 };
      }
    );
    tx.payment.findUnique.mockImplementation(async () => ({
      id: "pay_alloc",
      invoice_id: "inv_1",
      status: paymentStatus,
      verified_by: null,
      verified_at: null,
      amount: new Decimal("500000"),
      note: "alokasi: inv_1=300000.00,inv_2=200000.00",
      allocations: [
        { invoiceId: "inv_1", allocated: "300000.00" },
        { invoiceId: "inv_2", allocated: "200000.00" }
      ],
      invoice: { id: "inv_1", invoice_no: "INV-001", student_id: "s_1" }
    }));
    tx.invoice.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "inv_2") {
        return {
          id: "inv_2",
          amount: new Decimal("200000"),
          discount: new Decimal("0"),
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          payments: [{ status: paymentStatus, amount: new Decimal("200000") }]
        };
      }
      return {
        id: "inv_1",
        amount: new Decimal("1000"),
        discount: new Decimal("0"),
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        payments: [{ status: paymentStatus, amount: new Decimal("1000") }]
      };
    });
    tx.invoice.update.mockClear();

    const result = await service.verify("pay_alloc", true, "u_1");

    expect(result.status).toBe("PAID");
    // Status invoice SEKUNDER (inv_2) ikut dihitung ulang dalam transaksi yang sama.
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv_2" },
      data: { status: "PAID" }
    });
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv_1" },
      data: { status: "PAID" }
    });
    // Tidak ada recompute di luar transaksi (prisma global).
    expect(prismaMock.invoice.update).not.toHaveBeenCalled();
    expect(tx.invoice.update.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("PaymentService.record — idempotensi Idempotency-Key (tek-04 §1.7)", () => {
  let service: PaymentService;
  const notifications = { createForUser: jest.fn() };
  const realtime = { emitToUser: jest.fn() };

  const existingPayment = {
    id: "pay_existing",
    invoice_id: "inv_1",
    amount: new Decimal("500000"),
    method: "TRANSFER",
    proof_url: null,
    note: null,
    paid_at: null,
    verified_by: null,
    verified_at: null,
    status: "PENDING",
    idempotency_key: "key_abc",
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentService(
      {} as unknown as FinanceStore,
      notifications as unknown as NotificationService,
      realtime as unknown as RealtimeGateway
    );
  });

  it("replay: key yang sama mengembalikan Payment lama tanpa create", async () => {
    prismaMock.payment.findFirst.mockResolvedValue(existingPayment);

    const result = await service.record({
      invoiceId: "inv_1",
      amount: "500000",
      method: "TRANSFER",
      createdBy: "u_1",
      idempotencyKey: "key_abc"
    });

    expect(result.id).toBe("pay_existing");
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(prismaMock.payment.findFirst).toHaveBeenCalledWith({
      where: { idempotency_key: "key_abc" }
    });
  });

  it("tanpa key → create normal dengan idempotency_key null", async () => {
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      status: "PENDING",
      payments: []
    });
    prismaMock.payment.create.mockResolvedValue(existingPayment);

    await service.record({
      invoiceId: "inv_1",
      amount: "500000",
      method: "TRANSFER",
      createdBy: "u_1"
    });

    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invoice_id: "inv_1",
        status: "PENDING",
        idempotency_key: null
      })
    });
  });

  it("record: menulis AuditLog entity payment + actor_role deterministik", async () => {
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      status: "PENDING",
      payments: []
    });
    prismaMock.payment.create.mockResolvedValue(existingPayment);
    prismaMock.auditLog.create.mockResolvedValue({ id: "log_1", created_at: new Date() });

    await service.record({
      invoiceId: "inv_1",
      amount: "500000",
      method: "TRANSFER",
      createdBy: "u_1",
      actorRoles: ["KEUANGAN"]
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_id: "u_1",
        actor_role: "KEUANGAN",
        action: "CREATE",
        entity: "payment",
        entity_id: "pay_existing",
        after: expect.objectContaining({ status: "PENDING" })
      })
    });
  });

  it("race P2002: create gagal unik → fetch existing dan return (replay)", async () => {
    prismaMock.payment.findFirst.mockResolvedValueOnce(null); // sebelum create
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      status: "PENDING",
      payments: []
    });
    prismaMock.payment.create.mockRejectedValue({ code: "P2002" });
    prismaMock.payment.findFirst.mockResolvedValueOnce(existingPayment); // setelah P2002

    const result = await service.record({
      invoiceId: "inv_1",
      amount: "500000",
      method: "TRANSFER",
      createdBy: "u_1",
      idempotencyKey: "key_abc"
    });

    expect(result.id).toBe("pay_existing");
    expect(prismaMock.payment.findFirst).toHaveBeenCalledTimes(2);
  });

  it("recordAllocated replay: mengembalikan alokasi asli dari kolom allocations", async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      ...existingPayment,
      idempotency_key: "key_alloc",
      allocations: [
        { invoiceId: "inv_1", allocated: "300000.00" },
        { invoiceId: "inv_2", allocated: "200000.00" }
      ]
    });

    const result = await service.recordAllocated({
      invoiceIds: ["inv_1", "inv_2"],
      amount: "500000",
      method: "TRANSFER",
      createdBy: "u_1",
      idempotencyKey: "key_alloc"
    });

    expect(result.payment.id).toBe("pay_existing");
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0]).toEqual({ invoiceId: "inv_1", allocated: new Decimal("300000") });
    expect(result.allocations[1]).toEqual({ invoiceId: "inv_2", allocated: new Decimal("200000") });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("recordAllocated create: alokasi disimpan ke kolom allocations", async () => {
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        id: "inv_1",
        amount: new Decimal("300000"),
        discount: new Decimal("0"),
        due_date: new Date(Date.now() + 86_400_000),
        payments: []
      },
      {
        id: "inv_2",
        amount: new Decimal("400000"),
        discount: new Decimal("0"),
        due_date: new Date(Date.now() + 86_400_000),
        payments: []
      }
    ]);
    const txPayment = { create: jest.fn(), update: jest.fn() };
    prismaMock.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) =>
      cb({ payment: txPayment })
    );
    txPayment.create.mockResolvedValue(existingPayment);
    txPayment.update.mockResolvedValue({});
    prismaMock.auditLog.create.mockResolvedValue({ id: "log_1", created_at: new Date() });

    const result = await service.recordAllocated({
      invoiceIds: ["inv_1", "inv_2"],
      amount: "500000",
      method: "TRANSFER",
      createdBy: "u_1",
      actorRoles: ["KEUANGAN"],
      idempotencyKey: "key_alloc"
    });

    expect(txPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idempotency_key: "key_alloc",
        allocations: [
          { invoiceId: "inv_1", allocated: "300000.00" },
          { invoiceId: "inv_2", allocated: "200000.00" }
        ]
      })
    });
    expect(result.allocations[0]!.allocated.toString()).toBe("300000");
    // Audit CREATE untuk payment alokasi lintas tagihan.
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_id: "u_1",
        actor_role: "KEUANGAN",
        action: "CREATE",
        entity: "payment",
        entity_id: "pay_existing",
        after: expect.objectContaining({ invoice_ids: ["inv_1", "inv_2"] })
      })
    });
  });
});
