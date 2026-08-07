import { computeBpjsContribution, computeBpjsBundle } from "./bpjs";

const config = {
  kesehatan: { employeeSharePercent: "1", ceiling: "12000000" }, // 1% pekerja, ceiling 12jt
  jht: { employeeSharePercent: "2", ceiling: null }, // 2% pekerja, tanpa ceiling
  jp: { employeeSharePercent: "1", ceiling: "10547000" } // 1% pekerja, ceiling 10.547.000
};

describe("bpjs — potongan pegawai dari konfigurasi (prd04 §5.E.3)", () => {
  it("BPJS Kesehatan 1% dari dasar", () => {
    const result = computeBpjsContribution({
      base: "5000000",
      config: config.kesehatan
    });
    expect(result.toString()).toBe("50000");
  });

  it("BPJS Kesehatan dibatasi ceiling (dasar > 12jt -> hitung dari 12jt)", () => {
    const result = computeBpjsContribution({
      base: "20000000",
      config: config.kesehatan
    });
    expect(result.toString()).toBe("120000"); // 12.000.000 x 1%
  });

  it("JHT 2% tanpa ceiling", () => {
    const result = computeBpjsContribution({
      base: "10000000",
      config: config.jht
    });
    expect(result.toString()).toBe("200000");
  });

  it("JP 1% dengan ceiling 10.547.000", () => {
    const below = computeBpjsContribution({ base: "5000000", config: config.jp });
    expect(below.toString()).toBe("50000");

    const capped = computeBpjsContribution({ base: "20000000", config: config.jp });
    expect(capped.toString()).toBe("105470"); // 10.547.000 x 1%
  });

  it("bundle Kesehatan+JHT+JP + total", () => {
    const bundle = computeBpjsBundle("5000000", config);
    expect(bundle.kesehatan.toString()).toBe("50000");
    expect(bundle.jht.toString()).toBe("100000");
    expect(bundle.jp.toString()).toBe("50000");
    expect(bundle.total.toString()).toBe("200000");
  });

  it("dasar 0 -> 0; tanpa ceiling tidak error", () => {
    expect(computeBpjsContribution({ base: "0", config: config.jht }).toString()).toBe("0");
  });
});
