import { buildRaporPdf, escapePdfText, sanitizePdfText, type RaporPdfPayload } from "./rapor-pdf";

const payload: RaporPdfPayload = {
  schoolName: "SMA Negeri 1 Contoh",
  student: { id: "stu_1", name: "Budi Santoso", username: "budi" },
  kelas: { id: "c_1", name: "X IPA 1", gradeLevel: 10 },
  semester: "GANJIL",
  academicYear: "2026/2027",
  mapels: [
    {
      subjectCode: "MAT-10",
      subjectName: "Matematika",
      perType: [
        { type: "TUGAS", count: 4, average: 85 },
        { type: "UJIAN", count: 1, average: 92 }
      ],
      nilaiAkhir: 87,
      predikat: "B"
    }
  ],
  p5: [
    {
      project_name: "Kearifan Lokal",
      theme: "Kebudayaan",
      score: 90,
      deskripsi: "Proyek dokumentasi budaya daerah"
    }
  ]
};

describe("rapor-pdf — buildRaporPdf", () => {
  it("menghasilkan buffer PDF valid (%PDF- di awal, %%EOF di akhir)", () => {
    const buf = buildRaporPdf(payload);
    const text = buf.toString("latin1");
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toContain("%%EOF");
    expect(text).toContain("startxref");
  });

  it("memuat nama siswa yang di-escape PDF", () => {
    const text = buildRaporPdf(payload).toString("latin1");
    expect(text).toContain(escapePdfText("Budi Santoso"));
  });

  it("memuat identitas sekolah, kelas, tahun ajaran, dan semester", () => {
    const text = buildRaporPdf(payload).toString("latin1");
    expect(text).toContain(escapePdfText("SMA Negeri 1 Contoh"));
    expect(text).toContain(escapePdfText("X IPA 1"));
    expect(text).toContain(escapePdfText("2026/2027"));
    expect(text).toContain(escapePdfText("GANJIL"));
  });

  it("memuat nama mapel + nilai akhir + predikat", () => {
    const text = buildRaporPdf(payload).toString("latin1");
    expect(text).toContain(escapePdfText("Matematika"));
    expect(text).toContain("87");
    expect(text).toContain("B");
  });

  it("memuat seksi P5 dan footer Draft Sistem", () => {
    const text = buildRaporPdf(payload).toString("latin1");
    expect(text).toContain(escapePdfText("PROYEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)"));
    expect(text).toContain(escapePdfText("Kearifan Lokal"));
    expect(text).toContain(escapePdfText("Draft Sistem"));
  });

  it("membuat multi-page bila mapel banyak (paginasi)", () => {
    const big = buildRaporPdf({
      ...payload,
      mapels: Array.from({ length: 40 }, (_, i) => ({
        subjectCode: `S-${i}`,
        subjectName: `Mapel ${i}`,
        perType: [],
        nilaiAkhir: 80 + i,
        predikat: "B"
      }))
    });
    const text = big.toString("latin1");
    const pageCount = (text.match(/\/Type \/Page\b/g) ?? []).length;
    expect(pageCount).toBeGreaterThan(1);
  });
});

describe("rapor-pdf — byte encoding buffer final (Latin-1/cp1252)", () => {
  it("nama 'José' → byte 0x65 0xE9 ada di buffer final, bukan 'i' pengganti", () => {
    const buf = buildRaporPdf({
      ...payload,
      student: { id: "stu_2", name: "José", username: "jose" }
    });
    // "José" = 4A 6F 73 E9 — é dipertahankan sebagai byte Latin-1 (bukan 0x69 'i').
    expect(buf.indexOf(Buffer.from([0x4a, 0x6f, 0x73, 0xe9]))).toBeGreaterThanOrEqual(0);
    // "Josi" (korupsi encoding ascii 0xE9→0x69) TIDAK boleh muncul.
    expect(buf.indexOf(Buffer.from([0x4a, 0x6f, 0x73, 0x69]))).toBe(-1);
    // PDF tetap valid.
    const text = buf.toString("latin1");
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toContain("%%EOF");
  });

  it("nama 'Rémi' → byte 0x52 0xE9 0x6D 0x69 di buffer final", () => {
    const buf = buildRaporPdf({
      ...payload,
      student: { id: "stu_3", name: "Rémi", username: "remi" }
    });
    expect(buf.indexOf(Buffer.from([0x52, 0xe9, 0x6d, 0x69]))).toBeGreaterThanOrEqual(0);
  });

  it("karakter non-WinAnsi (emoji) → byte '?' (0x3F) di buffer final", () => {
    const buf = buildRaporPdf({
      ...payload,
      student: { id: "stu_4", name: "Rapor 😀", username: "r" }
    });
    // "Rapor ?" — emoji (2 unit UTF-16) diganti dua '?'.
    expect(
      buf.indexOf(Buffer.from([0x52, 0x61, 0x70, 0x6f, 0x72, 0x20, 0x3f, 0x3f]))
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("rapor-pdf — sanitasi WinAnsi", () => {
  it("karakter non-WinAnsi (emoji/CJK) diganti '?'", () => {
    // Emoji = 2 unit UTF-16 → 2 karakter "?" (keduanya non-WinAnsi).
    expect(sanitizePdfText("Rapor 😀 siswa")).toBe("Rapor ?? siswa");
    expect(sanitizePdfText("Nilai 漢字")).toBe("Nilai ??");
  });

  it("teks Latin-1 (é/ñ) dipertahankan", () => {
    expect(sanitizePdfText("Rémi")).toBe("Rémi");
  });

  it("newline/CR dinormalisasi menjadi spasi", () => {
    expect(sanitizePdfText("baris satu\nbaris dua")).toBe("baris satu baris dua");
  });

  it("escapePdfText melindungi tanda kurung dan backslash", () => {
    expect(escapePdfText("a(b)\\c")).toBe("a\\(b\\)\\\\c");
  });
});
