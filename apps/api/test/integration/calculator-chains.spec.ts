/**
 * Integration test (ringan, TANPA PostgreSQL) — rantai modul murni:
 * finance: allocatePayment → lateFee → reconciliation; payroll: tax → bpjs.
 * Murni unit-integrasi antar kalkulator (tidak menyentuh DB).
 */
import { Decimal } from "@prisma/client/runtime/library";
import { computeLateFee } from "../../src/modules/finance/calculator/late-fee";
import {
  allocatePayment,
  isOverpayment
} from "../../src/modules/finance/calculator/payment-allocation";
import { matchRowToPayments } from "../../src/modules/finance/calculator/reconciliation-match";
import { computeBpjsBundle } from "../../src/modules/payroll/calculator/bpjs";
import { computePph21TerMonthly } from "../../src/modules/payroll/calculator/tax";

/** Bracket TER bulanan bertipe Decimal (kontrak TerMonthlyBracket). */
const bracket = (min: string, max: string | null, rate: string) => ({
  minGross: new Decimal(min),
  maxGross: max === null ? null : new Decimal(max),
  ratePercent: new Decimal(rate)
});

describe("INTEGRATION (ringan) — alur keuangan SPP", () => {
  it("skenario penuh: bayar muka → alokasi → denda → rekonsiliasi", () => {
    // 1) Alokasi pembayaran ke 2 invoice
    const alloc = allocatePayment("1500000", [
      { invoiceId: "inv-1", outstanding: "1000000" },
      { invoiceId: "inv-2", outstanding: "600000" }
    ]);
    expect(alloc.allocations[0]?.allocated.toString()).toBe("1000000");
    expect(alloc.allocations[1]?.allocated.toString()).toBe("500000");
    expect(alloc.remaining.toString()).toBe("0");

    // 2) Denda keterlambatan invoice 2 (10 hari, 0,5%/hari, grace 3)
    const fee = computeLateFee(
      { graceDays: 3, feeType: "PERSEN_PER_HARI", value: "0.5", maxAmount: "50000" },
      "600000",
      10
    );
    // chargeable = 7 hari → 600000 * 0.5% * 7 = 21000
    expect(fee.amount.toString()).toBe("21000");

    // 3) Rekonsiliasi: invoice 1 sudah lunas dan cocok di mutasi bank
    const match = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-01",
        keterangan: "SPP",
        referensi: "inv-1",
        nominal: new Decimal("1000000"),
        tipe: "KREDIT"
      },
      [
        {
          id: "pay-1",
          invoiceNo: "inv-1",
          amount: new Decimal("1000000"),
          paidAt: new Date("2026-08-01"),
          method: "TRANSFER"
        }
      ]
    );
    expect(match.status).toBe("MATCHED");
    expect(match.confidence).toBe(1);
  });

  it("skenario kelebihan bayar → deteksi overpayment → refund candidate", () => {
    const overpaid = isOverpayment("250000", [{ invoiceId: "inv-1", outstanding: "200000" }]);
    expect(overpaid).toBe(true);
    const alloc = allocatePayment("250000", [{ invoiceId: "inv-1", outstanding: "200000" }]);
    expect(alloc.remaining.toString()).toBe("50000");
  });
});

describe("INTEGRATION (ringan) — rantai payroll PPh21 + BPJS", () => {
  it("gaji 8jt → PPh TER 2% + BPJS (kes+JHT+JP) dihitung konsisten", () => {
    const tax = computePph21TerMonthly({
      gross: "8000000",
      brackets: [bracket("0", null, "2")]
    });
    expect(tax.toString()).toBe("160000");

    const bpjs = computeBpjsBundle("8000000", {
      kesehatan: { employeeSharePercent: "1", ceiling: "12000000" },
      jht: { employeeSharePercent: "2", ceiling: "12000000" },
      jp: { employeeSharePercent: "1", ceiling: "8000000" }
    });
    expect(bpjs.kesehatan.toString()).toBe("80000");
    expect(bpjs.jht.toString()).toBe("160000");
    expect(bpjs.jp.toString()).toBe("80000");
    expect(bpjs.total.toString()).toBe("320000");
  });

  it("gaji di bawah ceiling → proporsional, tidak dipotong", () => {
    const tax = computePph21TerMonthly({
      gross: "1000000",
      brackets: [bracket("0", null, "5")]
    });
    expect(tax.toString()).toBe("50000");
  });
});
