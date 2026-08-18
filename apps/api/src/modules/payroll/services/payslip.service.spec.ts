/**
 * PayslipService — unit test (prd04 §5.E.4): akses slip (scope sekolah vs self,
 * anti-IDOR via Staff.user_id). Store: InMemoryPayrollStore; PrismaClient di-mock.
 */
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import type { PrismaClient } from "@prisma/client";
import { InMemoryPayrollStore } from "../payroll.store";
import { PayslipService, PayslipActor } from "./payslip.service";

function makePrismaMock() {
  return { staff: { findFirst: jest.fn() } } as unknown as PrismaClient;
}

const prismaMock = (p: PrismaClient) => p as unknown as { staff: { findFirst: jest.Mock } };

/** Seed store dengan satu payslip untuk st_1 (run PAID). */
async function seedPayslip(store: InMemoryPayrollStore, staffId: string) {
  const run = await store.createRun({ period: "2026-01", createdBy: "u_1" });
  const payslip = await store.createPayslip({
    runId: run.id,
    staffId,
    period: "2026-01",
    snapshot: {
      gross: new Decimal("3000000"),
      pph21: new Decimal("0"),
      bpjsKesehatan: new Decimal("30000"),
      bpjsJht: new Decimal("60000"),
      bpjsJp: new Decimal("30000"),
      otherDeductions: new Decimal("0"),
      net: new Decimal("2880000"),
      issuedAt: new Date()
    }
  });
  return payslip;
}

describe("PayslipService.myPayslips — scope akses", () => {
  let store: InMemoryPayrollStore;
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: PayslipService;

  beforeEach(() => {
    store = new InMemoryPayrollStore();
    prisma = makePrismaMock();
    service = new PayslipService(store, prisma);
  });

  it("staff sekolah (KEUANGAN) → bebas ambil slip staff mana pun", async () => {
    await seedPayslip(store, "st_1");
    const actor: PayslipActor = { userId: "u_keuangan", roles: ["KEUANGAN"] };

    const result = await service.myPayslips("st_1", actor);

    expect(result).toHaveLength(1);
    expect(result[0]!.staffId).toBe("st_1");
    expect(prismaMock(prisma).staff.findFirst).not.toHaveBeenCalled();
  });

  it("GURU (scope self) → staffId di-resolve dari Staff.user_id", async () => {
    await seedPayslip(store, "st_1");
    prismaMock(prisma).staff.findFirst.mockResolvedValue({ id: "st_1" });
    const actor: PayslipActor = { userId: "user_guru_1", roles: ["GURU"] };

    const result = await service.myPayslips("st_1", actor);

    expect(result).toHaveLength(1);
    expect(prismaMock(prisma).staff.findFirst).toHaveBeenCalledWith({
      where: { user_id: "user_guru_1" },
      select: { id: true }
    });
  });

  it("GURU minta staff lain → Forbidden (anti-IDOR)", async () => {
    prismaMock(prisma).staff.findFirst.mockResolvedValue({ id: "st_1" });
    const actor: PayslipActor = { userId: "user_guru_1", roles: ["GURU"] };

    await expect(service.myPayslips("st_99", actor)).rejects.toThrow(ForbiddenException);
    expect(prismaMock(prisma).staff.findFirst).toHaveBeenCalled();
  });

  it("GURU tanpa relasi Staff (user_id tak dikenal) → Forbidden", async () => {
    prismaMock(prisma).staff.findFirst.mockResolvedValue(null);
    const actor: PayslipActor = { userId: "user_unknown", roles: ["GURU"] };

    await expect(service.myPayslips("st_1", actor)).rejects.toThrow(ForbiddenException);
  });
});

describe("PayslipService.get — detail slip", () => {
  let store: InMemoryPayrollStore;
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: PayslipService;
  let payslipId: string;

  beforeEach(async () => {
    store = new InMemoryPayrollStore();
    prisma = makePrismaMock();
    service = new PayslipService(store, prisma);
    payslipId = (await seedPayslip(store, "st_1")).id;
  });

  it("slip tidak ditemukan → NotFound", async () => {
    const actor: PayslipActor = { userId: "u_keuangan", roles: ["KEUANGAN"] };
    await expect(service.get("ps_none", actor)).rejects.toThrow(NotFoundException);
  });

  it("KEUANGAN → boleh akses slip siapa pun", async () => {
    const actor: PayslipActor = { userId: "u_keuangan", roles: ["KEUANGAN"] };
    const result = await service.get(payslipId, actor);
    expect(result.staffId).toBe("st_1");
  });

  it("GURU pemilik slip → diizinkan (via Staff.user_id)", async () => {
    prismaMock(prisma).staff.findFirst.mockResolvedValue({ id: "st_1" });
    const actor: PayslipActor = { userId: "user_guru_1", roles: ["GURU"] };

    const result = await service.get(payslipId, actor);
    expect(result.id).toBe(payslipId);
  });

  it("GURU bukan pemilik slip → Forbidden (anti-IDOR)", async () => {
    prismaMock(prisma).staff.findFirst.mockResolvedValue({ id: "st_other" });
    const actor: PayslipActor = { userId: "user_guru_2", roles: ["GURU"] };

    await expect(service.get(payslipId, actor)).rejects.toThrow(ForbiddenException);
  });
});
