import { Decimal } from "@prisma/client/runtime/library";
import { allocatePayment, isOverpayment, totalOutstanding } from "./payment-allocation";

describe("payment-allocation (alokasi pembayaran parsial/cicilan — prd04 §5.F.2)", () => {
  it("alokasi parsial ke satu invoice: sisa outstanding tetap", () => {
    const result = allocatePayment("300000", [{ invoiceId: "inv-1", outstanding: "1000000" }]);
    expect(result.allocations[0]?.allocated.toString()).toBe("300000");
    expect(result.remaining.toString()).toBe("0");
    expect(result.totalAllocated.toString()).toBe("300000");
  });

  it("cicilan lintas 2 invoice terisi berurutan (FIFO)", () => {
    const result = allocatePayment("1500000", [
      { invoiceId: "inv-1", outstanding: "1000000" },
      { invoiceId: "inv-2", outstanding: "1000000" }
    ]);
    expect(result.allocations[0]?.allocated.toString()).toBe("1000000");
    expect(result.allocations[1]?.allocated.toString()).toBe("500000");
    expect(result.remaining.toString()).toBe("0");
  });

  it("kelebihan bayar (amount > total outstanding) -> sisa dikembalikan", () => {
    const targets = [
      { invoiceId: "inv-1", outstanding: "200000" },
      { invoiceId: "inv-2", outstanding: "300000" }
    ];
    const result = allocatePayment("600000", targets);
    expect(result.totalAllocated.toString()).toBe("500000");
    expect(result.remaining.toString()).toBe("100000");
    expect(isOverpayment("600000", targets)).toBe(true);
  });

  it("invoice dengan outstanding 0 tidak menerima alokasi", () => {
    const result = allocatePayment("100000", [{ invoiceId: "inv-paid", outstanding: "0" }]);
    expect(result.allocations[0]?.allocated.toString()).toBe("0");
    expect(result.remaining.toString()).toBe("100000");
  });

  it("totalOutstanding menjumlahkan semua target", () => {
    expect(
      totalOutstanding([
        { invoiceId: "a", outstanding: "100000" },
        { invoiceId: "b", outstanding: "250000.5" }
      ]).toString()
    ).toBe("350000.5");
  });

  it("nilai Decimal dipakai apa adanya (tidak kehilangan presisi)", () => {
    const result = allocatePayment(new Decimal("99999.99"), [
      { invoiceId: "inv-1", outstanding: new Decimal("50000.005") }
    ]);
    expect(result.allocations[0]?.allocated.toString()).toBe("50000.01"); // HALF_UP
    expect(result.remaining.toString()).toBe("49999.98");
  });
});
