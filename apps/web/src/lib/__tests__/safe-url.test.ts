import { describe, expect, it } from "vitest";
import { safeUrl } from "../safe-url";

describe("safeUrl (sanitasi URL CMS)", () => {
  it("javascript: ditolak → ''", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("JaVaScRiPt:alert(1)")).toBe("");
  });

  it("data: dan protokol lain ditolak → ''", () => {
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
    expect(safeUrl("vbscript:msgbox(1)")).toBe("");
    expect(safeUrl("ftp://example.com")).toBe("");
  });

  it("http/https diterima", () => {
    expect(safeUrl("https://example.com/ppdb")).toBe("https://example.com/ppdb");
    expect(safeUrl("http://example.com").startsWith("http://example.com")).toBe(true);
  });

  it("path relatif diterima apa adanya", () => {
    expect(safeUrl("/ppdb")).toBe("/ppdb");
    expect(safeUrl("/berita/slug")).toBe("/berita/slug");
  });

  it("input kosong/null/undefined → ''", () => {
    expect(safeUrl(undefined)).toBe("");
    expect(safeUrl(null)).toBe("");
    expect(safeUrl("")).toBe("");
    expect(safeUrl("   ")).toBe("");
  });
});
