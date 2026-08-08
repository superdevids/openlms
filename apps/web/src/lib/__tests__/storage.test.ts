import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEYS,
  safeGet,
  safeRemove,
  safeSet,
  storageAvailable,
  rawGet,
  rawRemove,
  rawSet
} from "../storage";

describe("lib/storage (R-39)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("storageAvailable true di jsdom (local)", () => {
    expect(storageAvailable("local")).toBe(true);
  });

  it("rawSet/rawGet/rawRemove round-trip", () => {
    expect(rawSet("k", "v")).toBe(true);
    expect(rawGet("k")).toBe("v");
    rawRemove("k");
    expect(rawGet("k")).toBeNull();
  });

  it("safeSet/safeGet JSON round-trip", () => {
    expect(safeSet("obj", { a: 1, b: "x" })).toBe(true);
    expect(safeGet<{ a: number; b: string }>("obj")).toEqual({ a: 1, b: "x" });
  });

  it("safeGet: JSON korup → null", () => {
    window.localStorage.setItem("bad", "{not-json");
    expect(safeGet("bad")).toBeNull();
  });

  it("safeRemove menghapus key", () => {
    safeSet("x", 1);
    safeRemove("x");
    expect(safeGet("x")).toBeNull();
  });

  it("STORAGE_KEYS tidak berubah (satu sumber kebenaran)", () => {
    expect(STORAGE_KEYS.examAttempt).toBe("opensis_exam_attempt");
    expect(STORAGE_KEYS.theme).toBe("opensis_theme");
  });
});
