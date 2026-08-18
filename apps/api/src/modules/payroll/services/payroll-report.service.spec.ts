/**
 * PayrollReportService — unit test (prd04 §5.E.5): rekap per periode (hanya
 * PAID), komparasi bulanan, rekap potongan PPh21/BPJS. Store: in-memory.
 */
import { Decimal } from "@prisma/client/runtime/library";
import { InMemoryPayrollStore } from "../payroll.store";
import { PayrollReportService } from "./payroll-report.service";
import { ZERO } from "../calculator/money";
import { PayrollRunItemRecord } from "../payroll.types";

function makeItem(
  staffId: string,
  pph21: string,
  bpjsKesehatan: string,
  bpjsJht: string,
  bpjsJp: string,
  otherDeductions: string,
  net: string
): PayrollRunItemRecord {
  const pph = new Decimal(pph21);
  const bpjsTotal = new Decimal(bpjsKesehatan).plus(bpjsJht).plus(bpjsJp);
  const gross = new Decimal(net).plus(pph).plus(bpjsTotal).plus(otherDeductions);
  return {
    id: `item_${staffId}`,
    runId: `run_${staffId}`,
    staffId,
    gross,
    pph21: pph,
    bpjsKesehatan: new Decimal(bpjsKesehatan),
    bpjsJht: new Decimal(bpjsJht),
    bpjsJp: new Decimal(bpjsJp),
    otherDeductions: new Decimal(otherDeductions),
    totalDeductions: pph.plus(bpjsTotal).plus(otherDeductions),
    net: new Decimal(net),
    attendanceDays: 0,
    belowUmr: false,
    warnings: [],
    detailComponents: []
  };
}

/** Seed run PAID lengkap dengan items (via store — totals dihitung store). */
async function seedPaidRun(store: InMemoryPayrollStore, period: string) {
  const run = await store.createRun({ period, createdBy: "u_1" });
  await store.updateRun(run.id, { status: "PAID" });
  await store.setRunItems(run.id, [
    makeItem("st_1", "157500", "90000", "180000", "90000", "100000", "8482500"),
    makeItem("st_2", "112500", "90000", "180000", "90000", "0", "8572500")
  ]);
  return store.getRun(run.id);
}

describe("PayrollReportService.summaryByPeriod", () => {
  let store: InMemoryPayrollStore;
  let service: PayrollReportService;

  beforeEach(async () => {
    store = new InMemoryPayrollStore();
    service = new PayrollReportService(store);
    await seedPaidRun(store, "2026-01");
    await seedPaidRun(store, "2026-02");
    // run belum PAID — tidak boleh masuk rekap
    const draft = await store.createRun({ period: "2026-03", createdBy: "u_1" });
    await store.setRunItems(draft.id, [makeItem("st_9", "0", "0", "0", "0", "0", "100000")]);
  });

  it("filter periode → hanya run PAID pada periode diminta", async () => {
    const result = await service.summaryByPeriod(["2026-01"]);

    expect(result).toHaveLength(1);
    expect(result[0]!.period).toBe("2026-01");
    expect(result[0]!.staffCount).toBe(2);
    // pph21 = 157.500 + 112.500
    expect(result[0]!.pph21.toString()).toBe("270000");
    // bpjsTotal = (90+180+90) x 2
    expect(result[0]!.bpjsTotal.toString()).toBe("720000");
  });

  it("tanpa filter periode → semua run PAID (run DRAFT tidak masuk)", async () => {
    const result = await service.summaryByPeriod([]);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.period).sort()).toEqual(["2026-01", "2026-02"]);
  });

  it("periode yang tidak punya run PAID → kosong", async () => {
    const result = await service.summaryByPeriod(["2026-05"]);
    expect(result).toHaveLength(0);
  });
});

describe("PayrollReportService.monthlyComparison", () => {
  let store: InMemoryPayrollStore;
  let service: PayrollReportService;

  beforeEach(async () => {
    store = new InMemoryPayrollStore();
    service = new PayrollReportService(store);
    await seedPaidRun(store, "2026-01");
    await seedPaidRun(store, "2026-02");
  });

  it("deltaNet = net bulan ini - net bulan lalu", async () => {
    const result = await service.monthlyComparison("2026-02");

    expect(result.current?.period).toBe("2026-02");
    expect(result.previous?.period).toBe("2026-01");
    // kedua run total net sama → delta 0; cek field hadir
    expect(result.deltaNet.toString()).toBe("0");
  });

  it("net berbeda antar periode → deltaNet terhitung", async () => {
    const runJan = await store.findRunByPeriod("2026-01");
    await store.updateRun(runJan!.id, { totalNet: new Decimal("15000000") });

    const result = await service.monthlyComparison("2026-02");
    // current net = 17.055.000, previous = 15.000.000
    expect(result.deltaNet.toString()).toBe("2055000");
  });

  it("tanpa run bulan sebelumnya → deltaNet ZERO", async () => {
    const result = await service.monthlyComparison("2026-06");

    expect(result.current).toBeNull();
    expect(result.previous).toBeNull();
    expect(result.deltaNet.toString()).toBe(ZERO.toString());
  });
});

describe("PayrollReportService.deductionRecap & rekapKepsek", () => {
  let store: InMemoryPayrollStore;
  let service: PayrollReportService;

  beforeEach(async () => {
    store = new InMemoryPayrollStore();
    service = new PayrollReportService(store);
    await seedPaidRun(store, "2026-01");
  });

  it("deductionRecap menjumlahkan PPh21/BPJS/other dari seluruh item", async () => {
    const recap = await service.deductionRecap("2026-01");

    expect(recap.period).toBe("2026-01");
    expect(recap.pph21.toString()).toBe("270000");
    expect(recap.bpjsKesehatan.toString()).toBe("180000");
    expect(recap.bpjsJht.toString()).toBe("360000");
    expect(recap.bpjsJp.toString()).toBe("180000");
    expect(recap.other.toString()).toBe("100000");
  });

  it("deductionRecap periode tanpa run → seluruh nilai ZERO", async () => {
    const recap = await service.deductionRecap("2026-09");

    expect(recap.pph21.toString()).toBe("0");
    expect(recap.bpjsKesehatan.toString()).toBe("0");
    expect(recap.bpjsJht.toString()).toBe("0");
    expect(recap.bpjsJp.toString()).toBe("0");
    expect(recap.other.toString()).toBe("0");
  });

  it("rekapKepsek: ringkasan total + belowUmrCount tanpa detail pegawai", async () => {
    const run = (await store.findRunByPeriod("2026-01"))!;
    const recap = service.rekapKepsek(run);

    expect(recap.period).toBe("2026-01");
    expect(recap.status).toBe("PAID");
    expect(recap.staffCount).toBe(2);
    expect(recap.belowUmrCount).toBe(0);
    expect(recap).not.toHaveProperty("items");
    expect(recap).not.toHaveProperty("pph21");
  });

  it("rekapKepsek menghitung belowUmrCount dari item", async () => {
    const run = (await store.findRunByPeriod("2026-01"))!;
    run.items = [
      ...run.items,
      {
        id: "item_low",
        runId: run.id,
        staffId: "st_low",
        gross: new Decimal("1000000"),
        pph21: new Decimal("0"),
        bpjsKesehatan: new Decimal("10000"),
        bpjsJht: new Decimal("20000"),
        bpjsJp: new Decimal("10000"),
        otherDeductions: new Decimal("0"),
        totalDeductions: new Decimal("40000"),
        net: new Decimal("960000"),
        attendanceDays: 0,
        belowUmr: true,
        warnings: ["Gaji net di bawah UMR"],
        detailComponents: []
      }
    ];

    const recap = service.rekapKepsek(run);
    expect(recap.belowUmrCount).toBe(1);
  });
});
