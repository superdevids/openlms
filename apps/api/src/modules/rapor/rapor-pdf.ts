/**
 * Pembuat PDF e-Rapor v2 (G-49) — hand-rolled tanpa dependensi eksternal.
 * PDF A4 portrait (595×842) berisi identitas sekolah/siswa, tabel mapel
 * (rincian tipe + nilai akhir + predikat), dan seksi P5. Pola objek PDF +
 * xref manual sama dengan lms/grades/export-file.ts (F2-T9), diperluas
 * menjadi multi-page dan sanitasi teks WinAnsi agar aman di font Helvetica.
 */

export interface RaporPdfMapel {
  subjectCode: string;
  subjectName: string;
  perType: Array<{ type: string; count: number; average: number | null }>;
  nilaiAkhir: number | null;
  predikat: string | null;
}

export interface RaporPdfP5 {
  project_name: string;
  theme: string | null;
  score: number | null;
  deskripsi: string;
}

export interface RaporPdfPayload {
  schoolName: string;
  student: { id: string; name: string; username: string | null };
  kelas: { id: string; name: string; gradeLevel: number } | null;
  semester: string;
  academicYear: string;
  mapels: RaporPdfMapel[];
  p5: RaporPdfP5[];
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const FOOTER_Y = 40;

/** Karakter aman font WinAnsi (cp1252): tab + printable ASCII + Latin-1. */
export function isWinAnsiChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code === 9 || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
}

/** Sanitasi teks WinAnsi: karakter di luar set → "?" (emoji/CJK/kontrol). */
export function sanitizePdfText(s: string): string {
  return s
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .split("")
    .map((ch) => (isWinAnsiChar(ch) ? ch : "?"))
    .join("");
}

/**
 * Encode string menjadi byte cp1252/Latin-1 (WinAnsi): karakter aman
 * (tab, 0x20–0x7E, 0xA0–0xFF) → byte aslinya; sisanya → "?" (0x3F).
 * TIDAK memakai Buffer "ascii" yang mem-mask bit tinggi (& 0x7F) sehingga
 * "José" (é=0xE9) berubah jadi "Josi" (i=0x69).
 */
export function encodeWinAnsiBytes(s: string): Buffer {
  const bytes: number[] = [];
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    bytes.push(
      code === 9 || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) ? code : 0x3f
    );
  }
  return Buffer.from(bytes);
}

/** Escape karakter khusus sintaks literal string PDF. */
export function escapePdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Potong teks agar pas lebar kolom (sanitasi + indikator "..."). */
export function truncatePdfText(s: string, max: number): string {
  const t = sanitizePdfText(s);
  if (t.length <= max) return t;
  const head = t.slice(0, Math.max(0, max - 3));
  return `${head}...`;
}

/**
 * Bangun PDF rapor siswa (A4 portrait, Helvetica).
 * Layout: header identitas → tabel mapel → seksi P5 → footer "Draft Sistem".
 */
export function buildRaporPdf(payload: RaporPdfPayload): Buffer {
  const pages: string[][] = [[]];
  let pageIndex = 0;
  let y = 800;

  const newPage = (): void => {
    pageIndex += 1;
    pages.push([]);
    y = 800;
  };
  const ensure = (height: number): void => {
    if (y - height < FOOTER_Y + 20) newPage();
  };
  /** Baris: gambar semua sel pada posisi y sama, lalu turun satu baris. */
  const row = (cells: Array<{ x: number; text: string; size?: number; max?: number }>): void => {
    ensure(16);
    for (const c of cells) {
      const size = c.size ?? 10;
      pages[pageIndex]!.push(
        `BT /F1 ${size} Tf ${c.x} ${y} Td (${escapePdfText(truncatePdfText(c.text, c.max ?? 70))}) Tj ET`
      );
    }
    y -= 16;
  };
  const gap = (h: number): void => {
    y -= h;
  };

  // Header identitas
  row([{ x: MARGIN, text: payload.schoolName, size: 16, max: 90 }]);
  row([{ x: MARGIN, text: "LAPORAN HASIL BELAJAR SISWA", size: 13, max: 90 }]);
  gap(4);
  row([{ x: MARGIN, text: `Nama: ${payload.student.name}`, max: 88 }]);
  row([
    { x: MARGIN, text: `Kelas: ${payload.kelas?.name ?? "-"}`, max: 25 },
    { x: 240, text: `Tahun Ajaran: ${payload.academicYear}`, max: 25 },
    { x: 430, text: `Semester: ${payload.semester}`, max: 20 }
  ]);
  gap(4);
  row([{ x: MARGIN, text: "-".repeat(88), max: 120 }]);

  // Header tabel mapel
  row([
    { x: MARGIN, text: "No", max: 5 },
    { x: 72, text: "Mata Pelajaran", max: 26 },
    { x: 270, text: "Rincian Tipe Nilai", max: 32 },
    { x: 480, text: "Nilai Akhir", max: 12 },
    { x: 545, text: "Predikat", max: 10 }
  ]);
  gap(2);

  if (payload.mapels.length === 0) {
    row([{ x: MARGIN, text: "Belum ada nilai rapor untuk semester ini.", max: 88 }]);
  } else {
    payload.mapels.forEach((m, i) => {
      const rincian = m.perType
        .filter((t) => t.average !== null)
        .map((t) => `${t.type}:${t.average}`)
        .join("  ");
      row([
        { x: MARGIN, text: String(i + 1), max: 5 },
        { x: 72, text: `${m.subjectName} (${m.subjectCode})`, max: 26 },
        { x: 270, text: rincian, max: 32 },
        { x: 480, text: m.nilaiAkhir === null ? "-" : String(m.nilaiAkhir), max: 12 },
        { x: 545, text: m.predikat ?? "-", max: 10 }
      ]);
    });
  }

  // Seksi P5
  gap(10);
  row([{ x: MARGIN, text: "PROYEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)", size: 12, max: 88 }]);
  if (payload.p5.length === 0) {
    row([{ x: MARGIN, text: "Belum ada proyek P5.", max: 88 }]);
  } else {
    payload.p5.forEach((p) => {
      row([
        {
          x: MARGIN,
          text: `- ${p.project_name}  (Tema: ${p.theme ?? "-"} | Nilai: ${p.score ?? "-"})`,
          max: 86
        }
      ]);
      row([{ x: MARGIN + 12, text: p.deskripsi, max: 80 }]);
    });
  }

  // Footer "Draft Sistem" di halaman terakhir (di bawah ambang ensure).
  pages[pageIndex]!.push(`BT /F1 9 Tf 250 ${FOOTER_Y} Td (Draft Sistem) Tj ET`);

  return assemblePdf(pages);
}

/** Rakit objek PDF + xref (multi-page) menjadi Buffer %PDF- yang valid. */
function assemblePdf(pages: string[][]): Buffer {
  const pageCount = pages.length;
  const fontNum = 3 + pageCount * 2;
  const kids = Array.from({ length: pageCount }, (_, i) => `${3 + i * 2} 0 R`).join(" ");

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`
  };
  for (let i = 0; i < pageCount; i += 1) {
    const pageObj = 3 + i * 2;
    const contentObj = 4 + i * 2;
    const content = pages[i]!.join("\n");
    objects[pageObj] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontNum} 0 R >> >> /Contents ${contentObj} 0 R >>`;
    objects[contentObj] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  }
  objects[fontNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  const sorted = Object.keys(objects)
    .map(Number)
    .sort((a, b) => a - b);
  // Offsets dihitung dari byte final WinAnsi (bukan "ascii") agar sinkron
  // dengan encoding akhir — xref tetap valid walau konten memuat Latin-1.
  for (const num of sorted) {
    offsets[num] = encodeWinAnsiBytes(out).length;
    out += `${num} 0 obj\n${objects[num]!}\nendobj\n`;
  }

  const xrefStart = encodeWinAnsiBytes(out).length;
  out += `xref\n0 ${fontNum + 1}\n0000000000 65535 f \n`;
  for (let num = 1; num <= fontNum; num += 1) {
    out += `${String(offsets[num] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${fontNum + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return encodeWinAnsiBytes(out);
}
