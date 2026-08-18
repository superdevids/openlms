import {
  computeRaporNilai,
  DEFAULT_RAPOR_WEIGHTS,
  normalizeRaporWeights,
  predikatOf
} from "./rapor-compute";

describe("computeRaporNilai (G-49 rumus nilai akhir rapor)", () => {
  it("normal 20/20/30/30: rata-rata tipe terbobot + nilai akhir", () => {
    const result = computeRaporNilai([
      { type: "TUGAS", score: 80, weight: 2 },
      { type: "TUGAS", score: 90, weight: 1 },
      { type: "KUIS", score: 70, weight: 1 },
      { type: "UJIAN", score: 85, weight: 1 },
      { type: "SUMATIF", score: 90, weight: 1 }
    ]);

    // TUGAS: (80*2 + 90*1)/3 = 83.33 -> 83
    expect(result.perType.find((t) => t.type === "TUGAS")?.average).toBe(83);
    expect(result.perType.find((t) => t.type === "KUIS")?.average).toBe(70);
    expect(result.perType.find((t) => t.type === "UJIAN")?.average).toBe(85);
    expect(result.perType.find((t) => t.type === "SUMATIF")?.average).toBe(90);
    // nilai akhir = (83*20 + 70*20 + 85*30 + 90*30)/100 = 83.1 -> 83
    expect(result.nilaiAkhir).toBe(83);
    expect(result.predikat).toBe("B");
  });

  it("bobot kustom: hanya tipe dengan bobot dipakai", () => {
    const weights = { ...DEFAULT_RAPOR_WEIGHTS, TUGAS: 50, KUIS: 50 };
    const result = computeRaporNilai(
      [
        { type: "TUGAS", score: 80, weight: 1 },
        { type: "KUIS", score: 60, weight: 1 }
      ],
      weights
    );
    // (80*50 + 60*50)/100 = 70
    expect(result.nilaiAkhir).toBe(70);
    expect(result.predikat).toBe("C");
  });

  it("tipe tanpa grade di-skip (bobotnya tidak ikut dibagi)", () => {
    const result = computeRaporNilai([
      { type: "TUGAS", score: 80, weight: 1 },
      { type: "KUIS", score: 90, weight: 1 }
    ]);
    // Hanya TUGAS + KUIS: (80*20 + 90*20)/40 = 85
    expect(result.nilaiAkhir).toBe(85);
    expect(result.perType.find((t) => t.type === "UJIAN")?.average).toBeNull();
    expect(result.perType.find((t) => t.type === "SUMATIF")?.average).toBeNull();
  });

  it("PRAKTIK/SIKAP tanpa bobot default dikecualikan dari nilai akhir", () => {
    const result = computeRaporNilai([
      { type: "TUGAS", score: 80, weight: 1 },
      { type: "PRAKTIK", score: 100, weight: 1 },
      { type: "SIKAP", score: 100, weight: 1 }
    ]);
    // PRAKTIK/SIKAP punya bobot 0 secara default -> hanya TUGAS yang dihitung
    expect(result.nilaiAkhir).toBe(80);
    expect(result.predikat).toBe("B");
  });

  it("skor non-finite (NaN/Infinity) di-skip, tidak merusak agregasi", () => {
    const result = computeRaporNilai([
      { type: "TUGAS", score: Number.NaN, weight: 1 },
      { type: "KUIS", score: 70, weight: 1 },
      { type: "UJIAN", score: Number.POSITIVE_INFINITY, weight: 1 },
      { type: "SUMATIF", score: 90, weight: 1 }
    ]);
    // (70*20 + 90*30)/50 = 82
    expect(result.nilaiAkhir).toBe(82);
    expect(result.predikat).toBe("B");
  });

  it("boundary predikat: 89/90 dan 79/80", () => {
    expect(predikatOf(90)).toBe("A");
    expect(predikatOf(89)).toBe("B");
    expect(predikatOf(80)).toBe("B");
    expect(predikatOf(79)).toBe("C");
    expect(predikatOf(70)).toBe("C");
    expect(predikatOf(69)).toBe("D");
    expect(predikatOf(60)).toBe("D");
    expect(predikatOf(59)).toBe("E");
    expect(predikatOf(null)).toBeNull();
  });

  it("semua tanpa nilai → nilaiAkhir null", () => {
    const result = computeRaporNilai([]);
    expect(result.nilaiAkhir).toBeNull();
    expect(result.predikat).toBeNull();
    expect(result.perType.every((t) => t.average === null)).toBe(true);
  });
});

describe("normalizeRaporWeights (G-49 settings raporWeights)", () => {
  it("mengembalikan default bila input kosong/bukan objek", () => {
    expect(normalizeRaporWeights(undefined)).toEqual(DEFAULT_RAPOR_WEIGHTS);
    expect(normalizeRaporWeights(null)).toEqual(DEFAULT_RAPOR_WEIGHTS);
    expect(normalizeRaporWeights("x")).toEqual(DEFAULT_RAPOR_WEIGHTS);
  });

  it("menimpa tipe yang valid dan menolak tipe asing/nilai korup", () => {
    const result = normalizeRaporWeights({
      TUGAS: 10,
      KUIS: "20",
      PRAKTIK: 15,
      SUMATIF: Number.NaN,
      UJIAN: -5,
      FAKE: 99
    });
    expect(result.TUGAS).toBe(10);
    expect(result.KUIS).toBe(20);
    expect(result.PRAKTIK).toBe(15);
    expect(result.SUMATIF).toBe(30); // NaN ditolak -> default
    expect(result.UJIAN).toBe(30); // negatif ditolak -> default
    expect(result.FAKE).toBeUndefined();
  });
});
