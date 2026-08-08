import { BadRequestException } from "@nestjs/common";
import { resolve, sep } from "node:path";
import { resolveExportPath } from "./grade-export.service";

/**
 * Lapisan kedua anti path traversal pada ekspor nilai: filename yang
 * menghasilkan path di luar exportDir harus ditolak (grade-export.service).
 */
describe("resolveExportPath (containment check)", () => {
  const exportDir = resolve("storage", "exports");

  it("menerima filename normal di dalam exportDir", () => {
    const filePath = resolveExportPath(exportDir, "nilai_GANJIL_2026.csv");
    expect(filePath).toBe(resolve(exportDir, "nilai_GANJIL_2026.csv"));
    expect(filePath.startsWith(exportDir + sep)).toBe(true);
  });

  it("menolak traversal .. yang keluar direktori", () => {
    expect(() => resolveExportPath(exportDir, "..\\evil.csv")).toThrow(BadRequestException);
    expect(() => resolveExportPath(exportDir, "sub/../../evil.csv")).toThrow(BadRequestException);
    expect(() => resolveExportPath(exportDir, "../secret.txt")).toThrow(BadRequestException);
  });

  it("menolak path absolut yang keluar direktori", () => {
    expect(() => resolveExportPath(exportDir, "C:\\Windows\\evil.csv")).toThrow(
      BadRequestException
    );
  });
});
