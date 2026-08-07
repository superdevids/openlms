import { computeInvoiceTotals, computeNetAmount } from "./invoice-status";

const due = new Date("2026-08-31T00:00:00Z");

describe("invoice-status (status & outstanding tagihan — prd04 §5.F.2)", () => {
  it("belum bayar & belum jatuh tempo -> PENDING", () => {
    const totals = computeInvoiceTotals({
      amount: "1000000",
      discount: 0,
      paidSum: 0,
      dueDate: due,
      now: new Date("2026-08-15T00:00:00Z")
    });
    expect(totals.status).toBe("PENDING");
    expect(totals.outstanding.toString()).toBe("1000000");
  });

  it("belum bayar & lewat jatuh tempo -> OVERDUE", () => {
    const totals = computeInvoiceTotals({
      amount: "1000000",
      discount: 0,
      paidSum: 0,
      dueDate: due,
      now: new Date("2026-09-02T00:00:00Z")
    });
    expect(totals.status).toBe("OVERDUE");
  });

  it("bayar sebagian -> PARTIAL; lunas -> PAID", () => {
    const partial = computeInvoiceTotals({
      amount: "1000000",
      discount: 0,
      paidSum: "400000",
      dueDate: due,
      now: new Date("2026-08-15T00:00:00Z")
    });
    expect(partial.status).toBe("PARTIAL");
    expect(partial.outstanding.toString()).toBe("600000");

    const paid = computeInvoiceTotals({
      amount: "1000000",
      discount: 0,
      paidSum: "1000000",
      dueDate: due,
      now: new Date("2026-08-15T00:00:00Z")
    });
    expect(paid.status).toBe("PAID");
    expect(paid.outstanding.toString()).toBe("0");
  });

  it("bayar sebagian tapi lewat jatuh tempo -> OVERDUE (bukan PARTIAL)", () => {
    const totals = computeInvoiceTotals({
      amount: "1000000",
      discount: 0,
      paidSum: "400000",
      dueDate: due,
      now: new Date("2026-09-02T00:00:00Z")
    });
    expect(totals.status).toBe("OVERDUE");
    expect(totals.outstanding.toString()).toBe("600000");
  });

  it("carry-over mengesampingkan status lain", () => {
    const totals = computeInvoiceTotals({
      amount: "1000000",
      discount: 0,
      paidSum: 0,
      dueDate: due,
      now: new Date("2026-08-15T00:00:00Z"),
      carriedOver: true
    });
    expect(totals.status).toBe("CARRIED_OVER");
  });

  it("diskon mengurangi netAmount; outstanding tidak pernah negatif", () => {
    expect(computeNetAmount("1000000", "100000").toString()).toBe("900000");
    const overpaid = computeInvoiceTotals({
      amount: "1000000",
      discount: 0,
      paidSum: "1200000",
      dueDate: due,
      now: new Date("2026-08-15T00:00:00Z")
    });
    expect(overpaid.status).toBe("PAID");
    expect(overpaid.outstanding.toString()).toBe("0");
  });
});
