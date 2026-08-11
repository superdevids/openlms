import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";

jest.mock("@opensis/database", () => ({
  prisma: {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    invoice: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    parentStudentLink: { findMany: jest.fn() },
    auditLog: { create: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { InvoiceService } from "./invoice.service";

const prismaMock = prisma as unknown as {
  user: { findUnique: jest.Mock; findMany: jest.Mock };
  invoice: {
    count: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  parentStudentLink: { findMany: jest.Mock };
  auditLog: { create: jest.Mock };
};

function makeInvoice(id: string, studentId: string) {
  return {
    id,
    student_id: studentId,
    invoice_no: `INV-2026-${id}`,
    type: "SPP",
    period: "2026-08",
    amount: new Decimal("100000"),
    discount: new Decimal("0"),
    due_date: new Date("2026-08-31"),
    status: "PENDING",
    academic_year: "2026/2027",
    original_invoice_id: null,
    carried_to_academic_year: null,
    carry_over_note: null,
    created_by: "op_1",
    created_at: new Date("2026-08-01"),
    updated_at: new Date("2026-08-01"),
    payments: []
  };
}

describe("InvoiceService (SEC-002 scope baca)", () => {
  let service: InvoiceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoiceService();
  });

  describe("list — aktor scope SENDIRI", () => {
    it("SISWA tanpa filter: hanya tagihan milik sendiri", async () => {
      prismaMock.invoice.findMany.mockResolvedValue([makeInvoice("inv_1", "stu_1")]);
      prismaMock.invoice.count.mockResolvedValue(1);
      const actor = { userId: "stu_1", roles: ["SISWA"], classIds: [] };

      const result = await service.list({}, actor);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: { in: ["stu_1"] } })
        })
      );
      expect(prismaMock.parentStudentLink.findMany).not.toHaveBeenCalled();
    });

    it("WALI_MURID tanpa filter: hanya tagihan anak-anak via ParentStudentLink", async () => {
      prismaMock.parentStudentLink.findMany.mockResolvedValue([
        { student_id: "stu_1" },
        { student_id: "stu_2" }
      ]);
      prismaMock.invoice.findMany.mockResolvedValue([makeInvoice("inv_1", "stu_1")]);
      prismaMock.invoice.count.mockResolvedValue(1);
      const actor = { userId: "user_wali_1", roles: ["WALI_MURID"], classIds: [] };

      const result = await service.list({}, actor);

      expect(result.items).toHaveLength(1);
      expect(prismaMock.parentStudentLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ parent: { user_id: "user_wali_1" } })
        })
      );
      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: { in: ["stu_1", "stu_2"] } })
        })
      );
    });

    it("SISWA dengan ?studentId=siswa lain → 403", async () => {
      const actor = { userId: "stu_1", roles: ["SISWA"], classIds: [] };

      await expect(service.list({ studentId: "stu_99" }, actor)).rejects.toThrow(
        ForbiddenException
      );
      expect(prismaMock.invoice.findMany).not.toHaveBeenCalled();
    });

    it("SISWA dengan ?studentId=diri sendiri → diizinkan", async () => {
      prismaMock.invoice.findMany.mockResolvedValue([makeInvoice("inv_1", "stu_1")]);
      prismaMock.invoice.count.mockResolvedValue(1);
      const actor = { userId: "stu_1", roles: ["SISWA"], classIds: [] };

      const result = await service.list({ studentId: "stu_1" }, actor);

      expect(result.items).toHaveLength(1);
      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: "stu_1" })
        })
      );
    });
  });

  describe("list — aktor scope SEKOLAH", () => {
    it("KEUANGAN tanpa filter: melihat semua tagihan tanpa filter student", async () => {
      prismaMock.invoice.findMany.mockResolvedValue([
        makeInvoice("inv_1", "stu_1"),
        makeInvoice("inv_2", "stu_2")
      ]);
      prismaMock.invoice.count.mockResolvedValue(2);
      const actor = { userId: "keu_1", roles: ["KEUANGAN"], classIds: [] };

      const result = await service.list({}, actor);

      expect(result.items).toHaveLength(2);
      const callArg = prismaMock.invoice.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(callArg.where.student_id).toBeUndefined();
      expect(prismaMock.parentStudentLink.findMany).not.toHaveBeenCalled();
    });

    it("KEPSEK dengan ?studentId= → tetap difilter sesuai query", async () => {
      prismaMock.invoice.findMany.mockResolvedValue([makeInvoice("inv_1", "stu_1")]);
      prismaMock.invoice.count.mockResolvedValue(1);
      const actor = { userId: "kep_1", roles: ["KEPSEK"], classIds: [] };

      const result = await service.list({ studentId: "stu_1" }, actor);

      expect(result.items).toHaveLength(1);
      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ student_id: "stu_1" }) })
      );
    });
  });

  describe("list — pagination", () => {
    it("menerapkan skip/take dari page/pageSize", async () => {
      prismaMock.invoice.findMany.mockResolvedValue([makeInvoice("inv_3", "stu_1")]);
      prismaMock.invoice.count.mockResolvedValue(42);
      const actor = { userId: "keu_1", roles: ["KEUANGAN"], classIds: [] };

      const result = await service.list({ page: 3, pageSize: 10 }, actor);

      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
      expect(prismaMock.invoice.count).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result).toEqual({
        items: [expect.objectContaining({ id: "inv_3" })],
        total: 42,
        page: 3,
        pageSize: 10
      });
    });

    it("menggunakan default page=1 dan pageSize=20 saat kosong", async () => {
      prismaMock.invoice.findMany.mockResolvedValue([]);
      prismaMock.invoice.count.mockResolvedValue(0);
      const actor = { userId: "keu_1", roles: ["KEUANGAN"], classIds: [] };

      const result = await service.list({}, actor);

      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 })
      );
      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    });

    it("filter status: total dari item terfilter (status derived in-memory)", async () => {
      const paid = {
        ...makeInvoice("inv_paid", "stu_1"),
        status: "PAID" as const,
        payments: [{ status: "PAID" as const, amount: new Decimal("100000") }]
      };
      const pending = {
        ...makeInvoice("inv_pending", "stu_1"),
        due_date: new Date("2099-01-01")
      };
      prismaMock.invoice.findMany.mockResolvedValue([paid, pending]);
      const actor = { userId: "keu_1", roles: ["KEUANGAN"], classIds: [] };

      const result = await service.list({ status: "PAID" }, actor);

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("inv_paid");
      // Filter status tidak bisa dipaginasi di SQL → tanpa skip/take.
      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ skip: expect.any(Number) })
      );
    });
  });

  describe("findById", () => {
    it("SISWA: invoice milik orang lain → 403", async () => {
      prismaMock.invoice.findUnique.mockResolvedValue(makeInvoice("inv_99", "stu_99"));
      const actor = { userId: "stu_1", roles: ["SISWA"], classIds: [] };

      await expect(service.findById("inv_99", actor)).rejects.toThrow(ForbiddenException);
    });

    it("WALI_MURID: invoice anak → diizinkan", async () => {
      prismaMock.invoice.findUnique.mockResolvedValue(makeInvoice("inv_1", "stu_1"));
      prismaMock.parentStudentLink.findMany.mockResolvedValue([{ student_id: "stu_1" }]);
      const actor = { userId: "user_wali_1", roles: ["WALI_MURID"], classIds: [] };

      const invoice = await service.findById("inv_1", actor);

      expect(invoice.id).toBe("inv_1");
    });

    it("KEUANGAN: invoice siapa pun → diizinkan", async () => {
      prismaMock.invoice.findUnique.mockResolvedValue(makeInvoice("inv_99", "stu_99"));
      const actor = { userId: "keu_1", roles: ["KEUANGAN"], classIds: [] };

      const invoice = await service.findById("inv_99", actor);

      expect(invoice.id).toBe("inv_99");
      expect(prismaMock.parentStudentLink.findMany).not.toHaveBeenCalled();
    });

    it("invoice tidak ditemukan → 404", async () => {
      prismaMock.invoice.findUnique.mockResolvedValue(null);
      const actor = { userId: "keu_1", roles: ["KEUANGAN"], classIds: [] };

      await expect(service.findById("inv_missing", actor)).rejects.toThrow(NotFoundException);
    });
  });
});
