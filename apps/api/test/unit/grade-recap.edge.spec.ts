/**
 * Grade recap — edge cases perhitungan rata-rata terbobot (F2-T9).
 * Melengkapi grade-recap.spec.ts: KKM boundary, rounding, bobot nol/negatif,
 * banyak tipe, unicode nama dalam export CSV/PDF.
 */
import { computeRecap } from "../../src/modules/lms/grades/grade-recap";
import { buildCsv, buildSimplePdf } from "../../src/modules/lms/grades/export-file";

describe("computeRecap — boundary & rounding", () => {
  it("rata-rata PERSIS di KKM 60 -> 60", () => {
    const r = computeRecap([
      { type: "TUGAS", score: 60, weight: 1 },
      { type: "TUGAS", score: 60, weight: 1 }
    ]);
    expect(r.overall.average).toBe(60);
  });

  it("0.5 dibulatkan ke atas (Math.round) -> 61 untuk 60.5", () => {
    const r = computeRecap([{ type: "TUGAS", score: 60.5, weight: 2 }]);
    expect(r.overall.average).toBe(61);
  });

  it("0.49 dibulatkan ke bawah -> 60", () => {
    const r = computeRecap([{ type: "TUGAS", score: 60.49, weight: 2 }]);
    expect(r.overall.average).toBe(60);
  });

  it("bobot nol -> average 0 untuk tipe itu (hindari NaN)", () => {
    const r = computeRecap([{ type: "TUGAS", score: 90, weight: 0 }]);
    expect(r.perType.TUGAS?.average).toBe(0);
    expect(r.overall.average).toBe(0);
  });

  it("bobot negatif tidak merusak (average bisa aneh tapi tidak NaN)", () => {
    const r = computeRecap([{ type: "TUGAS", score: 90, weight: -1 }]);
    expect(Number.isNaN(r.overall.average)).toBe(false);
  });

  it("score di luar 0-100 (nilai rusak) tetap dihitung tanpa throw", () => {
    const r = computeRecap([{ type: "TUGAS", score: 150, weight: 1 }]);
    expect(r.overall.average).toBe(150);
  });

  it("rata-rata terbobot memprioritaskan bobot besar", () => {
    const r = computeRecap([
      { type: "TUGAS", score: 40, weight: 10 },
      { type: "TUGAS", score: 100, weight: 1 }
    ]);
    // (40*10 + 100*1)/11 = 45.45 -> 45
    expect(r.perType.TUGAS?.average).toBe(45);
  });

  it("banyak tipe -> perType lengkap + overall", () => {
    const types = ["TUGAS", "KUIS", "UJIAN", "PRAKTIK", "SIKAP", "SUMATIF"] as const;
    const items = types.map((t, i) => ({ type: t, score: 70 + i, weight: 1 }));
    const r = computeRecap(items);
    for (const t of types) {
      expect(r.perType[t]).toBeDefined();
    }
    expect(r.overall.count).toBe(types.length);
  });

  it("totalWeight akurat per tipe", () => {
    const r = computeRecap([
      { type: "TUGAS", score: 80, weight: 2 },
      { type: "TUGAS", score: 70, weight: 3 }
    ]);
    expect(r.perType.TUGAS?.totalWeight).toBe(5);
  });

  it("nilai NaN/Infinity tidak merusak keseluruhan (satu item)", () => {
    const r = computeRecap([
      { type: "TUGAS", score: Number.NaN, weight: 1 },
      { type: "TUGAS", score: 80, weight: 1 }
    ]);
    expect(Number.isNaN(r.overall.average)).toBe(false);
  });
});

describe("buildCsv — edge cases", () => {
  it("unicode + emoji + newline di dalam field", () => {
    const csv = buildCsv([["Budi Setiawan", "nilai 85 ✓ 日本語"]], ["Nama", "Nilai"]);
    expect(csv).toContain("Budi Setiawan");
    expect(csv).toContain("✓");
    expect(csv).toContain("日本語");
  });

  it("baris kosong tidak error", () => {
    expect(() => buildCsv([], ["A"])).not.toThrow();
  });

  it("kutip ganda di-escape", () => {
    const csv = buildCsv([['dia bilang "halo"']], ["Kata"]);
    expect(csv).toContain('"dia bilang ""halo"""');
  });

  it("CRLF di dalam nilai tidak memecah baris", () => {
    const csv = buildCsv([["line1\r\nline2"]], ["Teks"]);
    // RFC 4180: field yang di-quote BOLEH mengandung CRLF dan tetap SATU field.
    // split("\r\n") naif salah menghitung baris karena mengabaikan quote —
    // hitung baris logis: hanya CRLF DI LUAR tanda kutip yang memisahkan baris.
    const lines = countLogicalLines(csv);
    expect(lines).toBe(2); // header + data
    expect(csv).toContain('"line1\r\nline2"'); // nilai utuh dalam satu field
  });
});

function countLogicalLines(csv: string): number {
  let lines = 0;
  let inQuotes = false;
  for (let i = 0; i < csv.length; i += 1) {
    if (csv[i] === '"') inQuotes = !inQuotes;
    if (csv[i] === "\r" && csv[i + 1] === "\n" && !inQuotes) lines += 1;
  }
  return lines;
}

describe("buildSimplePdf — edge cases", () => {
  it("unicode aman dalam PDF (encoding latin1 tidak crash)", () => {
    const pdf = buildSimplePdf(["Siswa: Budi Setiawan ✓ 日本語"]);
    expect(pdf.toString("latin1")).toContain("Siswa");
  });

  it("tanpa baris tidak error", () => {
    expect(() => buildSimplePdf([])).not.toThrow();
  });

  it("setiap PDF punya trailer penutup", () => {
    const pdf = buildSimplePdf(["x"]);
    const ascii = pdf.toString("ascii");
    const eofIndex = ascii.lastIndexOf("%%EOF");
    expect(eofIndex).toBeGreaterThan(0);
  });
});
