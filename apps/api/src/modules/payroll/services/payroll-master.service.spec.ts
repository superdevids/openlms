/**
 * PayrollMasterService — unit test (prd04 §5.E.1): JobPosition, PayrollComponent,
 * SalaryStructure, setStaffTerCategory. Prisma (Staff/AuditLog) di-mock.
 */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

jest.mock("@opensis/database", () => ({
  prisma: {
    staff: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { InMemoryPayrollStore } from "../payroll.store";
import {
  JobPositionService,
  PayrollComponentService,
  SalaryStructureService
} from "./payroll-master.service";
import { SetStaffTerCategoryDto } from "../dto/payroll.dto";

const prismaMock = prisma as unknown as {
  staff: { findUnique: jest.Mock; update: jest.Mock };
  auditLog: { create: jest.Mock };
};

describe("JobPositionService", () => {
  let store: InMemoryPayrollStore;
  let service: JobPositionService;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new InMemoryPayrollStore();
    service = new JobPositionService(store);
  });

  it("create valid → kode uppercase+trim, allowance default '0'", async () => {
    const result = await service.create({ code: " guru ", name: "Guru", createdBy: "u_1" });

    expect(result.code).toBe("GURU");
    expect(result.name).toBe("Guru");
    expect(result.defaultJabatanAllowance.toString()).toBe("0");
    expect(result.active).toBe(true);
  });

  it("create dengan kode kosong → BadRequest", async () => {
    await expect(service.create({ code: "  ", name: "Guru", createdBy: "u_1" })).rejects.toThrow(
      BadRequestException
    );
  });

  it("create dengan kode duplikat → BadRequest", async () => {
    await service.create({ code: "GURU", name: "Guru", createdBy: "u_1" });

    await expect(
      service.create({ code: "GURU", name: "Guru 2", createdBy: "u_1" })
    ).rejects.toThrow(BadRequestException);
  });

  it("update → store.updateJobPosition dengan allowance terkonversi money", async () => {
    const created = await service.create({
      code: "GURU",
      name: "Guru",
      defaultJabatanAllowance: "100000",
      createdBy: "u_1"
    });

    const result = await service.update(created.id, {
      name: "Guru Utama",
      defaultJabatanAllowance: "500000",
      active: true
    });

    expect(result.name).toBe("Guru Utama");
    expect(result.defaultJabatanAllowance.toString()).toBe("500000");
    expect(result.active).toBe(true);
  });
});

describe("PayrollComponentService", () => {
  let store: InMemoryPayrollStore;
  let service: PayrollComponentService;

  beforeEach(() => {
    store = new InMemoryPayrollStore();
    service = new PayrollComponentService(store);
  });

  it("upsert → store.upsertComponent (create + update code sama)", async () => {
    const input = {
      code: "TUNJANGAN_KINERJA",
      name: "Tunjangan Kinerja",
      category: "TUNJANGAN_TETAP" as const,
      kind: "ADDITIVE" as const,
      isTaxable: true,
      isBpjsApplicable: false,
      unit: "BULANAN" as const,
      description: "tunjangan kinerja",
      active: true
    };

    const created = await service.upsert(input);
    expect(created.code).toBe("TUNJANGAN_KINERJA");

    const updated = await service.upsert({ ...input, name: "Tunjangan Kinerja Plus" });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("Tunjangan Kinerja Plus");
  });

  it("list(onlyActive) meneruskan filter ke store", async () => {
    const all = await service.list(false);
    expect(all.length).toBeGreaterThan(0);
    const active = await service.list(true);
    expect(active.every((c) => c.active)).toBe(true);
  });
});

describe("SalaryStructureService", () => {
  let store: InMemoryPayrollStore;
  let service: SalaryStructureService;

  beforeEach(() => {
    store = new InMemoryPayrollStore();
    service = new SalaryStructureService(store);
  });

  it("create valid → tersimpan, active() mengambil revisi terbaru", async () => {
    const created = (await service.create({
      staffId: "st_1",
      effectiveFrom: "2026-01",
      components: { GAJI_POKOK: "3000000", TRANSPORT: "300000" },
      attendanceAllowancePerDay: "10000",
      createdBy: "u_1"
    })) as { staffId: string };
    expect(created.staffId).toBe("st_1");

    await service.create({
      staffId: "st_1",
      effectiveFrom: "2026-06",
      components: { GAJI_POKOK: "3500000" },
      createdBy: "u_1"
    });

    const active = await service.active("st_1", "2026-07");
    expect(active?.components["GAJI_POKOK"]?.toString()).toBe("3500000");
    const all = await service.list("st_1");
    expect(all.length).toBe(2);
  });

  it("create tanpa staffId → BadRequest", async () => {
    await expect(
      service.create({
        staffId: "",
        effectiveFrom: "2026-01",
        components: { GAJI_POKOK: "3000000" },
        createdBy: "u_1"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("create effectiveFrom bukan YYYY-MM → BadRequest", async () => {
    await expect(
      service.create({
        staffId: "st_1",
        effectiveFrom: "2026-1",
        components: { GAJI_POKOK: "3000000" },
        createdBy: "u_1"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("create tanpa komponen → BadRequest", async () => {
    await expect(
      service.create({
        staffId: "st_1",
        effectiveFrom: "2026-01",
        components: {},
        createdBy: "u_1"
      })
    ).rejects.toThrow(BadRequestException);
  });
});

describe("SalaryStructureService.setStaffTerCategory", () => {
  let store: InMemoryPayrollStore;
  let service: SalaryStructureService;
  const actor = { userId: "u_1", roles: ["KEUANGAN"] };

  beforeEach(() => {
    jest.clearAllMocks();
    store = new InMemoryPayrollStore();
    service = new SalaryStructureService(store);
    prismaMock.staff.findUnique.mockResolvedValue({ id: "st_1", ter_category: "A" });
    prismaMock.staff.update.mockResolvedValue({ id: "st_1", ter_category: "B" });
    prismaMock.auditLog.create.mockResolvedValue({ id: "log_1", created_at: new Date() });
  });

  it("sukses: update Staff + audit (before/after ter_category)", async () => {
    const result = await service.setStaffTerCategory("st_1", "B", actor);

    expect(result).toEqual({ id: "st_1", terCategory: "B" });
    expect(prismaMock.staff.update).toHaveBeenCalledWith({
      where: { id: "st_1" },
      data: { ter_category: "B" },
      select: { id: true, ter_category: true }
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_id: "u_1",
        actor_role: "KEUANGAN",
        action: "UPDATE",
        entity: "staff",
        entity_id: "st_1",
        before: { ter_category: "A" },
        after: { ter_category: "B" }
      })
    });
  });

  it("staff tidak ditemukan → NotFound", async () => {
    prismaMock.staff.findUnique.mockResolvedValue(null);

    await expect(service.setStaffTerCategory("st_x", "A", actor)).rejects.toThrow(
      NotFoundException
    );
    expect(prismaMock.staff.update).not.toHaveBeenCalled();
  });

  it("DTO validasi kategori A/B/C (nilai di luar ditolak)", async () => {
    const valid = plainToInstance(SetStaffTerCategoryDto, { category: "B" });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(SetStaffTerCategoryDto, { category: "D" });
    const errors = await validate(invalid);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.constraints).toHaveProperty("isIn");
  });
});
