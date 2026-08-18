/**
 * PayrollRunService — unit test (prd04 §5.E.2).
 * Store: InMemoryPayrollStore (tanpa DB). Prisma (Staff/StaffAttendance/UserRole)
 * di-mock via jest.mock("@opensis/database").
 */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";

jest.mock("@opensis/database", () => ({
  prisma: {
    staff: { findMany: jest.fn() },
    staffAttendance: { findMany: jest.fn() },
    userRole: { findMany: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { InMemoryPayrollStore } from "../payroll.store";
import { PayrollRunService, RunVariableHours } from "./payroll-run.service";
import { PayrollComponentService } from "./payroll-master.service";
import { PAYROLL_STATUS_EVENT } from "../../notifications/notification-events";
import type { RealtimeGateway } from "../../realtime/realtime.gateway";

const prismaMock = prisma as unknown as {
  staff: { findMany: jest.Mock };
  staffAttendance: { findMany: jest.Mock };
  userRole: { findMany: jest.Mock };
};

function makeHarness() {
  const store = new InMemoryPayrollStore();
  const realtime = { emitToUser: jest.fn() };
  const service = new PayrollRunService(
    store,
    new PayrollComponentService(store),
    realtime as unknown as RealtimeGateway
  );
  return { service, store, realtime };
}

/** Seed struktur gaji via store (komponen tetap + rate variabel). */
function seedStructure(
  store: InMemoryPayrollStore,
  staffId: string,
  components: Record<string, string>,
  attendanceAllowancePerDay: string | null = null
) {
  return store.createSalaryStructure({
    staffId,
    effectiveFrom: "2026-01",
    components,
    attendanceAllowancePerDay,
    createdBy: "u_1"
  });
}

describe("PayrollRunService.create — idempoten per periode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("create pertama membuat run DRAFT + audit CREATE", async () => {
    const { service, store } = makeHarness();

    const run = await service.create({ period: "2026-01", createdBy: "u_1" });

    expect(run.status).toBe("DRAFT");
    expect(run.period).toBe("2026-01");
    const logs = await store.listAuditLogs("PayrollRun", run.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]!.action).toBe("CREATE");
    expect(logs[0]!.after).toEqual(expect.objectContaining({ period: "2026-01", status: "DRAFT" }));
  });

  it("create periode yang sama saat run belum PAID → mengembalikan run yang sama (idempoten)", async () => {
    const { service, store } = makeHarness();

    const first = await service.create({ period: "2026-01", createdBy: "u_1" });
    const second = await service.create({ period: "2026-01", createdBy: "u_1" });

    expect(second.id).toBe(first.id);
    expect((await store.listRuns()).length).toBe(1);
  });

  it("create periode yang sudah PAID → BadRequest", async () => {
    const { service, store } = makeHarness();
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await store.updateRun(run.id, { status: "PAID" });

    await expect(service.create({ period: "2026-01", createdBy: "u_1" })).rejects.toThrow(
      BadRequestException
    );
  });

  it("create tanpa period memakai bulan berjalan", async () => {
    const { service, store } = makeHarness();
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const run = await service.create({ createdBy: "u_1" });

    expect(run.period).toBe(period);
    expect(await store.findRunByPeriod(period)).not.toBeNull();
  });
});

describe("PayrollRunService.calculate", () => {
  let harness: ReturnType<typeof makeHarness>;

  beforeEach(() => {
    jest.clearAllMocks();
    harness = makeHarness();
  });

  it("menghitung komponen tetap + variabel (HONOR_MENGAJAR×JTM, LEMBUR) → CALCULATED", async () => {
    const { service, store } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await seedStructure(store, "st_1", {
      GAJI_POKOK: "9000000",
      HONOR_MENGAJAR: "100000",
      LEMBUR: "50000"
    });
    prismaMock.staff.findMany.mockResolvedValue([{ id: "st_1", ter_category: "A" }]);
    prismaMock.staffAttendance.findMany.mockResolvedValue([]);
    const hours: RunVariableHours[] = [{ staffId: "st_1", jtmHours: 10, lemburHours: 4 }];

    const result = await service.calculate(run.id, hours);

    expect(result.status).toBe("CALCULATED");
    expect(result.staffCount).toBe(1);
    const item = result.items[0]!;
    // gross = 9.000.000 + 10×100.000 + 4×50.000 = 10.200.000
    expect(item.gross.toString()).toBe("10200000");
    expect(item.detailComponents.find((c) => c.code === "HONOR_MENGAJAR")?.amount.toString()).toBe(
      "1000000"
    );
    expect(item.detailComponents.find((c) => c.code === "LEMBUR")?.amount.toString()).toBe(
      "200000"
    );
    // PPh21 TER A @10.200.000 (bracket 2,25%) + BPJS 1%+2%+1% dari 9.000.000
    expect(item.pph21.toString()).toBe("229500");
    expect(item.totalDeductions.toString()).toBe("589500");
    expect(item.net.toString()).toBe("9610500");
  });

  it("TER kategori A vs C dipilih per staff (pph21 berbeda pada gross sama)", async () => {
    const { service, store } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await seedStructure(store, "st_a", { GAJI_POKOK: "9000000" });
    await seedStructure(store, "st_c", { GAJI_POKOK: "9000000" });
    prismaMock.staff.findMany.mockResolvedValue([
      { id: "st_a", ter_category: "A" },
      { id: "st_c", ter_category: "C" }
    ]);
    prismaMock.staffAttendance.findMany.mockResolvedValue([]);

    const result = await service.calculate(run.id, []);

    const itemA = result.items.find((i) => i.staffId === "st_a");
    const itemC = result.items.find((i) => i.staffId === "st_c");
    expect(itemA?.pph21.toString()).toBe("157500"); // TER A 1,75%
    expect(itemC?.pph21.toString()).toBe("112500"); // TER C 1,25%
    expect(itemA?.pph21.toString()).not.toBe(itemC?.pph21.toString());
  });

  it("kehadiran: menghitung hari hadir + TUNJANGAN_KEHADIRAN per hari", async () => {
    const { service, store } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await seedStructure(store, "st_a", { GAJI_POKOK: "1000000" }, "10000");
    prismaMock.staff.findMany.mockResolvedValue([{ id: "st_a", ter_category: "A" }]);
    prismaMock.staffAttendance.findMany.mockResolvedValue([
      { staff_id: "st_a", status: "HADIR" },
      { staff_id: "st_a", status: "HADIR" },
      { staff_id: "st_a", status: "TERLAMBAT" },
      { staff_id: "st_a", status: "IZIN" },
      { staff_id: "st_other", status: "HADIR" }
    ]);

    const result = await service.calculate(run.id, []);

    const item = result.items[0]!;
    expect(item.attendanceDays).toBe(3); // HADIR+TERLAMBAT saja (IZIN tidak dihitung)
    expect(
      item.detailComponents.find((c) => c.code === "TUNJANGAN_KEHADIRAN")?.amount.toString()
    ).toBe("30000");
  });

  it("net < UMR → belowUmr true + warning", async () => {
    const { service, store } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await seedStructure(store, "st_u", { GAJI_POKOK: "1000000" });
    prismaMock.staff.findMany.mockResolvedValue([{ id: "st_u", ter_category: "A" }]);
    prismaMock.staffAttendance.findMany.mockResolvedValue([]);

    const result = await service.calculate(run.id, []);

    const item = result.items[0]!;
    expect(item.net.toString()).toBe("960000");
    expect(item.belowUmr).toBe(true);
    expect(item.warnings.some((w) => w.includes("di bawah UMR"))).toBe(true);
  });

  it("run berstatus VALIDATED → tidak bisa dihitung ulang (BadRequest)", async () => {
    const { service, store } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await (store as InMemoryPayrollStore).updateRun(run.id, { status: "VALIDATED" });

    await expect(service.calculate(run.id, [])).rejects.toThrow(BadRequestException);
  });

  it("periode tanpa konfigurasi pajak/BPJS → BadRequest", async () => {
    const { service } = harness;
    const run = await service.create({ period: "2026-09", createdBy: "u_1" });
    prismaMock.staff.findMany.mockResolvedValue([]);

    await expect(service.calculate(run.id, [])).rejects.toThrow(BadRequestException);
  });
});

describe("PayrollRunService — state machine", () => {
  let harness: ReturnType<typeof makeHarness>;

  beforeEach(() => {
    jest.clearAllMocks();
    harness = makeHarness();
  });

  it("transisi valid DRAFT→CALCULATED→VALIDATED→APPROVED_KEUANGAN→PAID + generate payslip", async () => {
    const { service, store, realtime } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await seedStructure(store, "st_1", { GAJI_POKOK: "3000000" });
    prismaMock.staff.findMany.mockResolvedValue([{ id: "st_1", ter_category: "A" }]);
    prismaMock.staffAttendance.findMany.mockResolvedValue([]);
    prismaMock.userRole.findMany.mockResolvedValue([{ user_id: "user_kepsek" }]);

    const calculated = await service.calculate(run.id, []);
    expect(calculated.status).toBe("CALCULATED");

    const validated = await service.validate(run.id, "u_finance");
    expect(validated.status).toBe("VALIDATED");

    const approvedKeuangan = await service.approveByKeuangan(run.id, "u_finance");
    expect(approvedKeuangan.status).toBe("APPROVED_KEUANGAN");
    expect(approvedKeuangan.approvedByKeuangan).toBe("u_finance");

    const paid = await service.approveByKepsek(run.id, "u_kepsek");
    expect(paid.status).toBe("PAID");
    expect(paid.approvedByKepsek).toBe("u_kepsek");
    expect(paid.paidAt).not.toBeNull();

    // approve-kepsek generate payslip digital per pegawai
    const payslips = await store.listPayslips();
    expect(payslips).toHaveLength(1);
    expect(payslips[0]!.staffId).toBe("st_1");
    expect(payslips[0]!.period).toBe("2026-01");
    expect(payslips[0]!.snapshots[0]!.net.toString()).toBe("2880000");

    // status event di-emit ke user KEPSEK/KEUANGAN aktif
    expect(realtime.emitToUser).toHaveBeenCalledWith("user_kepsek", PAYROLL_STATUS_EVENT, {
      runId: paid.id,
      period: "2026-01",
      status: "PAID"
    });

    // audit trail transisi tercatat
    const logs = await store.listAuditLogs("PayrollRun", run.id);
    expect(logs.filter((l) => l.action === "UPDATE").length).toBeGreaterThanOrEqual(4);
  });

  it("validate dari DRAFT → BadRequest (transisi invalid)", async () => {
    const { service } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });

    await expect(service.validate(run.id, "u_finance")).rejects.toThrow(BadRequestException);
  });

  it("approveByKeuangan dari status non-VALIDATED → BadRequest", async () => {
    const { service } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });

    await expect(service.approveByKeuangan(run.id, "u_finance")).rejects.toThrow(
      BadRequestException
    );
  });

  it("approveByKepsek dari status non-APPROVED_KEUANGAN → BadRequest", async () => {
    const { service, store } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await (store as InMemoryPayrollStore).updateRun(run.id, { status: "VALIDATED" });

    await expect(service.approveByKepsek(run.id, "u_kepsek")).rejects.toThrow(BadRequestException);
  });

  it("calculate pada run PAID → BadRequest (tidak bisa dihitung ulang)", async () => {
    const { service, store } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await (store as InMemoryPayrollStore).updateRun(run.id, { status: "PAID" });

    await expect(service.calculate(run.id, [])).rejects.toThrow(BadRequestException);
  });
});

describe("PayrollRunService — rekap & get", () => {
  let harness: ReturnType<typeof makeHarness>;

  beforeEach(() => {
    jest.clearAllMocks();
    harness = makeHarness();
  });

  it("rekapForKepsek: ringkasan tanpa detail per pegawai + belowUmrCount", async () => {
    const { service, store } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });
    await seedStructure(store, "st_ok", { GAJI_POKOK: "3000000" });
    await seedStructure(store, "st_low", { GAJI_POKOK: "1000000" });
    prismaMock.staff.findMany.mockResolvedValue([
      { id: "st_ok", ter_category: "A" },
      { id: "st_low", ter_category: "A" }
    ]);
    prismaMock.staffAttendance.findMany.mockResolvedValue([]);

    const calculated = await service.calculate(run.id, []);
    expect(calculated.items).toHaveLength(2);

    const recap = await service.rekapForKepsek(run.id);
    expect(recap.period).toBe("2026-01");
    expect(recap.staffCount).toBe(2);
    expect(recap.belowUmrCount).toBe(1);
    expect(recap.totalNet.toString()).toBe(
      new Decimal("2880000").plus(new Decimal("960000")).toString()
    );
    expect(recap).not.toHaveProperty("items");
  });

  it("get run yang tidak ada → NotFound", async () => {
    const { service } = harness;
    await expect(service.get("run_unknown")).rejects.toThrow(NotFoundException);
  });

  it("get mengembalikan run yang ada", async () => {
    const { service } = harness;
    const run = await service.create({ period: "2026-01", createdBy: "u_1" });

    const found = await service.get(run.id);
    expect(found.id).toBe(run.id);
  });
});
