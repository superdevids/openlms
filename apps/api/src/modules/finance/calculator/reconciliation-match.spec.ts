import { Decimal } from "@prisma/client/runtime/library";
import { matchRowToPayments, parseMutasiCsv, toPaymentCandidates } from "./reconciliation-match";

const payments = toPaymentCandidates([
  {
    id: "pay-1",
    invoiceNo: "INV-2026-00001",
    amount: "500000",
    paidAt: new Date("2026-08-05T00:00:00Z"),
    method: "TRANSFER"
  },
  {
    id: "pay-2",
    invoiceNo: "INV-2026-00002",
    amount: "750000",
    paidAt: new Date("2026-08-10T00:00:00Z"),
    method: "TRANSFER"
  }
]);

describe("reconciliation-match (rekonsiliasi bank — prd04 §5.F.5)", () => {
  it("referensi + nominal cocok -> MATCHED confidence 1", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-05",
        keterangan: "transfer SPP",
        referensi: "INV-2026-00001",
        nominal: new Decimal("500000"),
        tipe: "KREDIT"
      },
      payments
    );
    expect(result.status).toBe("MATCHED");
    expect(result.confidence).toBe(1);
    expect(result.matchedPaymentId).toBe("pay-1");
  });

  it("referensi cocok tapi nominal beda kecil -> MATCHED confidence 0.8", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-05",
        keterangan: "SPP",
        referensi: "INV-2026-00002",
        nominal: new Decimal("750001"),
        tipe: "KREDIT"
      },
      payments
    );
    expect(result.status).toBe("MATCHED");
    expect(result.confidence).toBe(0.8);
  });

  it("tanpa referensi, nominal + tanggal cocok -> MATCHED confidence 0.5", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-05",
        keterangan: "transfer masuk",
        referensi: null,
        nominal: new Decimal("500000"),
        tipe: "KREDIT"
      },
      payments
    );
    expect(result.status).toBe("MATCHED");
    expect(result.confidence).toBe(0.5);
    expect(result.matchedPaymentId).toBe("pay-1");
  });

  it("tidak ada kecocokan -> UNMATCHED", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-05",
        keterangan: "transfer asing",
        referensi: "XYZ-999",
        nominal: new Decimal("12345"),
        tipe: "KREDIT"
      },
      payments
    );
    expect(result.status).toBe("UNMATCHED");
    expect(result.confidence).toBe(0);
    expect(result.matchedPaymentId).toBeNull();
  });

  it("mutasi DEBIT (uang keluar) tidak pernah MATCHED", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-05",
        keterangan: "tarik tunai",
        referensi: "INV-2026-00001",
        nominal: new Decimal("500000"),
        tipe: "DEBIT"
      },
      payments
    );
    expect(result.status).toBe("UNMATCHED");
  });

  it("parser CSV membaca header, kutip ganda, dan nominal bertitik", () => {
    const csv = [
      "tanggal,keterangan,referensi,nominal,tipe",
      '"2026-08-05","transfer, SPP","INV-2026-00001","500.000",KREDIT',
      "2026-08-06,Pencairan dana,,750000,DEBIT",
      ""
    ].join("\n");
    const rows = parseMutasiCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.referensi).toBe("INV-2026-00001");
    expect(rows[0]?.nominal.toString()).toBe("500000");
    expect(rows[0]?.tipe).toBe("KREDIT");
    expect(rows[1]?.tipe).toBe("DEBIT");
  });
});
