import { computeRecap } from "./grade-recap";
import { buildCsv, buildSimplePdf } from "./export-file";

describe("computeRecap (F2-T9 perhitungan rekap)", () => {
  it("rata-rata terbobot per tipe dan keseluruhan", () => {
    const result = computeRecap([
      { type: "TUGAS", score: 80, weight: 2 },
      { type: "TUGAS", score: 90, weight: 1 },
      { type: "KUIS", score: 70, weight: 1 }
    ]);

    // TUGAS: (80*2 + 90*1) / 3 = 83.33 -> 83
    expect(result.perType.TUGAS?.average).toBe(83);
    expect(result.perType.KUIS?.average).toBe(70);
    // Keseluruhan: (80*2 + 90*1 + 70*1) / 4 = 80
    expect(result.overall.average).toBe(80);
    expect(result.overall.count).toBe(3);
  });

  it("kosong → overall 0 tanpa error", () => {
    const result = computeRecap([]);
    expect(result.overall.average).toBe(0);
    expect(result.overall.count).toBe(0);
  });
});

describe("buildCsv", () => {
  it("menghasilkan CSV dengan escape koma/kutip", () => {
    const csv = buildCsv(
      [["Budi", "Santoso, S.Pd.", 'catatan "penting"']],
      ["Nama", "Guru", "Catatan"]
    );
    expect(csv).toContain('"Santoso, S.Pd."');
    expect(csv).toContain('"catatan ""penting"""');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("buildSimplePdf", () => {
  it("menghasilkan PDF valid (header %PDF dan trailer %%EOF)", () => {
    const pdf = buildSimplePdf(["Rekap", "Siswa A | 85"]);
    expect(pdf.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
    expect(pdf.toString("ascii")).toContain("%%EOF");
    expect(pdf.toString("ascii")).toContain("/Type /Page");
  });
});
