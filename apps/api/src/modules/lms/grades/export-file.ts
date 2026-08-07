/**
 * Pembuat file ekspor dasar (F2-T9): CSV + PDF minimal tanpa dependensi
 * eksternal. Integration boleh mengganti dengan library (pdfkit/exceljs)
 * tanpa mengubah kontrak fungsi.
 */

export function buildCsv(rows: string[][], header: string[]): string {
  const escape = (value: unknown): string => {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header, ...rows].map((row) => row.map(escape).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

function escapePdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * PDF A4 portrait dasar (Helvetica 10pt) — cukup untuk ekspor rekap awal.
 * Membangun objek PDF + tabel xref yang valid agar bisa dibuka pembaca PDF.
 */
export function buildSimplePdf(lines: string[]): Buffer {
  const contentLines = ["BT", "/F1 10 Tf", "40 800 Td", "18 TL"];
  for (const line of lines) {
    contentLines.push(`(${escapePdfText(line)}) Tj T*`);
  }
  contentLines.push("ET");

  const content = contentLines.join("\n");
  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    4: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    5: `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  };

  let out = "%PDF-1.4\n";
  const offsets: number[] = [0, 0, 0, 0, 0, 0];
  for (let i = 1; i <= 5; i += 1) {
    offsets[i] = Buffer.byteLength(out, "ascii");
    out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(out, "ascii");
  out += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i += 1) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(out, "ascii");
}
