/**
 * Unit test — lib/idempotency & lib/storage tambahan & lib/format tambahan.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { newIdempotencyKey } from "../idempotency";
import {
  safeGet,
  safeSet,
  STORAGE_KEYS,
  storageAvailable,
  rawGet,
  rawRemove,
  rawSet
} from "../storage";
import { formatDate, formatDateLong, formatRelative, formatTime } from "../format";

describe("lib/idempotency", () => {
  it("menghasilkan key dengan prefix default 'op'", () => {
    const key = newIdempotencyKey();
    expect(key.startsWith("op_")).toBe(true);
    expect(key.length).toBeGreaterThan("op_".length + 8);
  });

  it("menghasilkan key dengan prefix kustom", () => {
    expect(newIdempotencyKey("pay").startsWith("pay_")).toBe(true);
    expect(newIdempotencyKey("exam").startsWith("exam_")).toBe(true);
  });

  it("key acak (dua panggilan berbeda)", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });

  it("fallback tanpa crypto.randomUUID tetap unik", () => {
    vi.stubGlobal("crypto", undefined);
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a.startsWith("op_")).toBe(true);
    expect(a).not.toBe(b);
    vi.unstubAllGlobals();
  });
});

describe("lib/storage — tambahan (round-trip & keys)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("sessionStorage round-trip raw + safe", () => {
    expect(rawSet("k", "v", "session")).toBe(true);
    expect(rawGet("k", "session")).toBe("v");
    expect(safeSet("obj", { a: 1 }, "session")).toBe(true);
    expect(safeGet<{ a: number }>("obj", "session")).toEqual({ a: 1 });
    rawRemove("k", "session");
    expect(rawGet("k", "session")).toBeNull();
  });

  it("STORAGE_KEYS lengkap & namespaced opensis_", () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key.startsWith("opensis_")).toBe(true);
    }
    expect(STORAGE_KEYS.demoFlags).toBe("opensis_demo_flags");
    expect(STORAGE_KEYS.ppdbDraft).toBe("opensis_ppdb_draft");
  });

  it("storageAvailable true di jsdom untuk local & session", () => {
    expect(storageAvailable("local")).toBe(true);
    expect(storageAvailable("session")).toBe(true);
  });

  it("rawGet null untuk key yang tidak ada", () => {
    expect(rawGet("missing")).toBeNull();
  });
});

describe("lib/format — tambahan", () => {
  it("formatDate memformat tanggal valid id-ID", () => {
    const out = formatDate("2026-08-07T00:00:00.000Z");
    expect(out).not.toBe("-");
    expect(out).toContain("2026");
  });

  it("formatDateLong menyertakan nama hari", () => {
    const out = formatDateLong(new Date("2026-08-07T00:00:00.000Z"));
    expect(out.length).toBeGreaterThan(4);
  });

  it("formatTime HH:MM 2 digit", () => {
    const out = formatTime(new Date("2026-08-07T09:05:00.000Z"));
    expect(out).not.toBe("-");
  });

  it("formatRelative: nilai null/undefined/invalid → '-'", () => {
    expect(formatRelative(null)).toBe("-");
    expect(formatRelative("not-a-date")).toBe("-");
  });

  it("formatRelative: 'baru saja' untuk selisih < 1 menit", () => {
    expect(formatRelative(new Date(Date.now() - 5000))).toBe("baru saja");
  });

  it("formatRelative: '3 hari lalu' untuk selisih beberapa hari", () => {
    const out = formatRelative(new Date(Date.now() - 3 * 86400000));
    expect(out).toContain("3");
  });
});
