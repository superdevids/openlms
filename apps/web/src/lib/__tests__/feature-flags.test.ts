/**
 * Unit test — lib/feature-flags: isFeatureEnabled, applyDefaults,
 * normalizeFlags, demo overrides, roleCanAccessFlagConsole.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyDefaults,
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  normalizeFlags,
  readFeatureFlagsForDemo,
  roleCanAccessFlagConsole,
  writeFeatureFlagForDemo
} from "../feature-flags";

describe("lib/feature-flags", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("FEATURE_FLAG_DEFAULTS berisi flag kunci yang stabil", () => {
    const keys = FEATURE_FLAG_DEFAULTS.map((f) => f.key);
    expect(keys).toContain("LMS_BASE");
    expect(keys).toContain("PPDB");
    expect(keys).toContain("PAYROLL");
    expect(keys).toContain("ACADEMIC_ROLLOVER");
    // LMS_BASE sistem & terkunci
    const lms = FEATURE_FLAG_DEFAULTS.find((f) => f.key === "LMS_BASE");
    expect(lms?.isSystem).toBe(true);
    expect(lms?.locked).toBe(true);
  });

  it("isFeatureEnabled true hanya bila flag ada & enabled", () => {
    const flags = [
      { key: "A", enabled: true },
      { key: "B", enabled: false }
    ] as never;
    expect(isFeatureEnabled(flags, "A")).toBe(true);
    expect(isFeatureEnabled(flags, "B")).toBe(false);
    expect(isFeatureEnabled(flags, "MISSING")).toBe(false);
  });

  it("applyDefaults mengisi default untuk flag yang tidak ada di input", () => {
    const merged = applyDefaults([{ key: "LMS_BASE", enabled: true }] as never);
    expect(merged.find((f) => f.key === "PPDB")).toBeDefined();
    expect(merged.find((f) => f.key === "LMS_BASE")).toBeDefined();
  });

  it("applyDefaults mempertahankan urutan default (input appended)", () => {
    const merged = applyDefaults([]);
    expect(merged).toHaveLength(FEATURE_FLAG_DEFAULTS.length);
  });

  it("normalizeFlags: field opsional diisi default (flag dari API di-merge ke defaults)", () => {
    const flags = normalizeFlags([{ key: "PPDB" }]);
    const ppdb = flags.find((f) => f.key === "PPDB");
    expect(ppdb).toBeDefined();
    // API tidak mengirim kategori → normalizeFlags memakai default "Lainnya".
    expect(ppdb?.category).toBe("Lainnya");
    expect(ppdb?.description).toBe("");
    expect(ppdb?.enabled).toBe(false);
  });

  it("normalizeFlags: enabled mengambil nilai API lalu default_enabled", () => {
    const flags = normalizeFlags([
      { key: "LMS_BASE", enabled: true, default_enabled: false },
      { key: "PPDB", default_enabled: true },
      { key: "FINANCE_INVOICE", default_enabled: false }
    ]);
    expect(flags.find((f) => f.key === "LMS_BASE")?.enabled).toBe(true);
    expect(flags.find((f) => f.key === "PPDB")?.enabled).toBe(true);
    expect(flags.find((f) => f.key === "FINANCE_INVOICE")?.enabled).toBe(false);
  });

  it("normalizeFlags menggabungkan default yang tidak dikirim API", () => {
    const flags = normalizeFlags([{ key: "PPDB", enabled: true }]);
    expect(flags.find((f) => f.key === "PPDB")?.enabled).toBe(true);
    expect(flags.find((f) => f.key === "PAYROLL")).toBeDefined();
  });

  it("demo overrides: writeFeatureFlagForDemo lalu readFeatureFlagForDemo", () => {
    writeFeatureFlagForDemo("PAYROLL", true);
    const flags = readFeatureFlagsForDemo();
    const payroll = flags.find((f) => f.key === "PAYROLL");
    expect(payroll?.enabled).toBe(true);
  });

  it("writeFeatureFlagForDemo menyimpan ke localStorage (key opensis_demo_flags)", () => {
    writeFeatureFlagForDemo("BK", true);
    const raw = window.localStorage.getItem("opensis_demo_flags");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? "{}")).toEqual({ BK: true });
  });

  it("writeFeatureFlagForDemo menggabungkan override yang sudah ada", () => {
    writeFeatureFlagForDemo("A", true);
    writeFeatureFlagForDemo("B", false);
    const raw = JSON.parse(window.localStorage.getItem("opensis_demo_flags") ?? "{}");
    expect(raw).toEqual({ A: true, B: false });
  });

  it("readFeatureFlagsForDemo dengan storage rusak → defaults", () => {
    window.localStorage.setItem("opensis_demo_flags", "{invalid json");
    const flags = readFeatureFlagsForDemo();
    expect(flags).toHaveLength(FEATURE_FLAG_DEFAULTS.length);
  });

  it("roleCanAccessFlagConsole hanya SUPERADMIN", () => {
    expect(roleCanAccessFlagConsole("SUPERADMIN")).toBe(true);
    expect(roleCanAccessFlagConsole("OPERATOR")).toBe(false);
    expect(roleCanAccessFlagConsole(undefined)).toBe(false);
  });
});
