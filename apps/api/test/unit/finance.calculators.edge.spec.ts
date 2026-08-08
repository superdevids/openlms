/**
 * Unit test — Finance calculator edge: allocatePayment (negative, overpayment,
 * empty, precision), totalOutstanding, isOverpayment, late-fee (persen/hari,
 * graceDays, cap), reconciliation (baris malformed, toleransi, DEBIT).
 */
import { Decimal } from "@prisma/client/runtime/library";
import {
  allocatePayment,
  isOverpayment,
  totalOutstanding
} from "../../src/modules/finance/calculator/payment-allocation";
import { chargeableDays, computeLateFee } from "../../src/modules/finance/calculator/late-fee";
import {
  matchRowToPayments,
  parseMutasiCsv,
  toPaymentCandidates
} from "../../src/modules/finance/calculator/reconciliation-match";
import { money, ZERO } from "../../src/modules/finance/calculator/money";

describe("payment-allocation edge", () => {
  it("amount 0 → tanpa alokasi (break loop), sisa 0", () => {
    const result = allocatePayment("0", [{ invoiceId: "i1", outstanding: "100000" }]);
    expect(result.allocations).toEqual([]);
    expect(result.remaining.toString()).toBe("0");
    expect(result.totalAllocated.toString()).toBe("0");
  });

  it("amount negatif → alokasi negatif diteruskan (fungsi murni; validasi di pemanggil)", () => {
    const result = allocatePayment("-50000", [{ invoiceId: "i1", outstanding: "100000" }]);
    expect(result.allocations[0]?.allocated.toString()).toBe("-50000");
  });

  it("target dengan outstanding negatif dilewati (allocated 0)", () => {
    const result = allocatePayment("100000", [
      { invoiceId: "i1", outstanding: "-1000" },
      { invoiceId: "i2", outstanding: "50000" }
    ]);
    expect(result.allocations[0]?.allocated.toString()).toBe("0");
    expect(result.allocations[1]?.allocated.toString()).toBe("50000");
    expect(result.remaining.toString()).toBe("50000");
  });

  it("target kosong → sisa = amount, total 0", () => {
    const result = allocatePayment("100000", []);
    expect(result.allocations).toEqual([]);
    expect(result.remaining.toString()).toBe("100000");
    expect(result.totalAllocated.toString()).toBe("0");
  });

  it("amount pas habis di invoice terakhir → sisa 0", () => {
    const result = allocatePayment("150000", [
      { invoiceId: "i1", outstanding: "100000" },
      { invoiceId: "i2", outstanding: "50000" }
    ]);
    expect(result.remaining.toString()).toBe("0");
    expect(result.totalAllocated.toString()).toBe("150000");
    expect(result.allocations).toHaveLength(2);
  });

  it("overpayment: sisa dikembalikan (calon refund)", () => {
    const result = allocatePayment("120000", [{ invoiceId: "i1", outstanding: "100000" }]);
    expect(result.remaining.toString()).toBe("20000");
  });

  it("presisi desimal: 3 digit dibulatkan HALF_UP", () => {
    const result = allocatePayment("100.005", [{ invoiceId: "i1", outstanding: "100" }]);
    expect(result.allocations[0]?.allocated.toString()).toBe("100");
    expect(result.remaining.toString()).toBe("0.01");
  });

  it("totalOutstanding menjumlahkan semua target", () => {
    expect(
      totalOutstanding([
        { invoiceId: "a", outstanding: "100.5" },
        { invoiceId: "b", outstanding: "200" }
      ]).toString()
    ).toBe("300.5");
    expect(totalOutstanding([]).toString()).toBe("0");
  });

  it("isOverpayment benar untuk kelebihan bayar", () => {
    expect(isOverpayment("200", [{ invoiceId: "a", outstanding: "100" }])).toBe(true);
    expect(isOverpayment("100", [{ invoiceId: "a", outstanding: "100" }])).toBe(false);
    expect(isOverpayment("50", [{ invoiceId: "a", outstanding: "100" }])).toBe(false);
  });

  it("money menormalkan input string/number/Decimal ke 2 desimal", () => {
    expect(money("1.005").toString()).toBe("1.01");
    expect(money(3).toString()).toBe("3");
    expect(money(new Decimal("4.5")).toString()).toBe("4.5");
    expect(ZERO.toString()).toBe("0");
  });
});

describe("late-fee edge", () => {
  it("chargeableDays: graceDays mengurangi hari, floor", () => {
    expect(chargeableDays(10, 3)).toBe(7);
    expect(chargeableDays(3, 3)).toBe(0);
    expect(chargeableDays(2.9, 3)).toBe(0);
    expect(chargeableDays(-5, 3)).toBe(0);
    expect(chargeableDays(Number.NaN, 3)).toBe(0);
    expect(chargeableDays(10, 0)).toBe(10);
    expect(chargeableDays(10, -2)).toBe(10);
  });

  it("NOMINAL: denda tetap tanpa peduli hari (setelah grace)", () => {
    const r = computeLateFee(
      { graceDays: 0, feeType: "NOMINAL", value: "50000", maxAmount: null },
      "100000",
      5
    );
    expect(r.amount.toString()).toBe("50000");
    expect(r.chargeableDays).toBe(5);
    expect(r.capped).toBe(false);
  });

  it("PERSEN_PER_HARI: outstanding × rate/100 × days", () => {
    const r = computeLateFee(
      { graceDays: 0, feeType: "PERSEN_PER_HARI", value: "0.5", maxAmount: null },
      "100000",
      10
    );
    // 100000 * 0.5% * 10 = 5000
    expect(r.amount.toString()).toBe("5000");
  });

  it("grace period penuh: tidak ada denda", () => {
    const r = computeLateFee(
      { graceDays: 30, feeType: "PERSEN_PER_HARI", value: "1", maxAmount: null },
      "100000",
      10
    );
    expect(r.amount.toString()).toBe("0");
    expect(r.chargeableDays).toBe(0);
  });

  it("cap: denda dibatasi maxAmount", () => {
    const r = computeLateFee(
      { graceDays: 0, feeType: "PERSEN_PER_HARI", value: "1", maxAmount: "5000" },
      "1000000",
      10
    );
    expect(r.amount.toString()).toBe("5000");
    expect(r.capped).toBe(true);
  });

  it("maxAmount 0 → denda dipotong jadi 0", () => {
    const r = computeLateFee(
      { graceDays: 0, feeType: "NOMINAL", value: "10000", maxAmount: "0" },
      "50000",
      3
    );
    expect(r.amount.toString()).toBe("0");
  });

  it("NOMINAL negatif di-clamp ke 0", () => {
    const r = computeLateFee(
      { graceDays: 0, feeType: "NOMINAL", value: "-100", maxAmount: null },
      "50000",
      3
    );
    expect(r.amount.toString()).toBe("0");
  });
});

describe("reconciliation-match edge", () => {
  const pay = (
    id: string,
    invoiceNo: string,
    amount: string,
    paidAt: Date | null
  ): ReturnType<typeof toPaymentCandidates>[number] => ({
    id,
    invoiceNo,
    amount: new Decimal(amount),
    paidAt,
    method: "MANUAL"
  });

  it("baris DEBIT tidak pernah MATCHED", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-01",
        keterangan: "x",
        referensi: "INV-1",
        nominal: new Decimal("100"),
        tipe: "DEBIT"
      },
      [pay("p1", "INV-1", "100", new Date("2026-08-01"))]
    );
    expect(result.status).toBe("UNMATCHED");
  });

  it("referensi cocok tapi nominal beda di atas toleransi → confidence 0.8", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-01",
        keterangan: "x",
        referensi: "INV-1",
        nominal: new Decimal("105"),
        tipe: "KREDIT"
      },
      [pay("p1", "INV-1", "100", new Date("2026-08-01"))]
    );
    expect(result.status).toBe("MATCHED");
    expect(result.confidence).toBe(0.8);
    expect(result.reason).toContain("toleransi");
  });

  it("nominal dalam toleransi (dengan referensi) → confidence 1 (cocok sempurna)", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-01",
        keterangan: "x",
        referensi: "INV-1",
        nominal: new Decimal("100.02"),
        tipe: "KREDIT"
      },
      [pay("p1", "INV-1", "100", new Date("2026-08-01"))],
      { tolerance: "0.05" }
    );
    expect(result.status).toBe("MATCHED");
    expect(result.confidence).toBe(1);
  });

  it("nominal beda di atas toleransi (dengan referensi) → tetap 0.8 (fuzzy referensi)", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-01",
        keterangan: "x",
        referensi: "INV-1",
        nominal: new Decimal("999"),
        tipe: "KREDIT"
      },
      [pay("p1", "INV-1", "100", new Date("2026-08-01"))]
    );
    expect(result.status).toBe("MATCHED");
    expect(result.confidence).toBe(0.8);
  });

  it("tanpa referensi: nominal + tanggal dalam toleransi → confidence 0.5", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-02",
        keterangan: "x",
        referensi: null,
        nominal: new Decimal("250000"),
        tipe: "KREDIT"
      },
      [pay("p1", "INV-2", "250000", new Date("2026-08-02T09:00:00Z"))]
    );
    expect(result.status).toBe("MATCHED");
    expect(result.confidence).toBe(0.5);
  });

  it("tanpa referensi: nominal sama tapi tanggal di luar toleransi → tetap 0.5", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-01-01",
        keterangan: "x",
        referensi: null,
        nominal: new Decimal("250000"),
        tipe: "KREDIT"
      },
      [pay("p1", "INV-2", "250000", new Date("2026-08-02"))],
      { dateToleranceDays: 3 }
    );
    expect(result.status).toBe("MATCHED");
    expect(result.reason).toContain("tanggal di luar batas");
  });

  it("tidak ada yang cocok → UNMATCHED", () => {
    const result = matchRowToPayments(
      {
        rowIndex: 0,
        tanggal: "2026-08-01",
        keterangan: "x",
        referensi: null,
        nominal: new Decimal("1"),
        tipe: "KREDIT"
      },
      [pay("p1", "INV-2", "250000", new Date("2026-08-01"))]
    );
    expect(result.status).toBe("UNMATCHED");
    expect(result.confidence).toBe(0);
  });

  it("parseMutasiCsv melewati header & baris malformed, parses nominal Indonesia", () => {
    const csv = [
      "tanggal,keterangan,referensi,nominal,tipe",
      "2026-08-01,Bayar SPP,INV-1,500.000,KREDIT",
      "garbage,,,",
      "2026-08-02,Tf,INV-2,1.500.000,50,KREDIT",
      ""
    ].join("\n");
    const rows = parseMutasiCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.nominal.toString()).toBe("500000");
    expect(rows[0]?.tipe).toBe("KREDIT");
    expect(rows[0]?.referensi).toBe("INV-1");
  });

  it("parseMutasiCsv kosong → []", () => {
    expect(parseMutasiCsv("")).toEqual([]);
    expect(parseMutasiCsv("\n\n")).toEqual([]);
  });

  it("parseMutasiCsv default tipe KREDIT bila bukan DEBIT", () => {
    const rows = parseMutasiCsv("2026-08-01,x,,100,X\n");
    expect(rows[0]?.tipe).toBe("KREDIT");
  });

  it("toPaymentCandidates mengonversi amount ke Decimal", () => {
    const candidates = toPaymentCandidates([
      { id: "p1", invoiceNo: "INV-1", amount: "100.5", paidAt: null, method: "TRANSFER" }
    ]);
    expect(candidates[0]?.amount).toBeInstanceOf(Decimal);
    expect(candidates[0]?.amount.toString()).toBe("100.5");
  });
});
