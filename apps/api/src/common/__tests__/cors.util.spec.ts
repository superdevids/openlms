import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { DEFAULT_CORS_ORIGINS, allowedOrigins } from "../cors.util";

/**
 * Unit test cors.util (R-30) — satu sumber kebenaran origin REST + Socket.IO.
 * Env dimanipulasi per-test lalu dipulihkan (beforeEach/afterEach).
 */
describe("common/cors.util", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigins = process.env.CORS_ORIGINS;

  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalCorsOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = originalCorsOrigins;
  });

  it("dev + CORS_ORIGINS kosong → fallback localhost dev", () => {
    process.env.NODE_ENV = "development";
    expect(allowedOrigins()).toEqual(DEFAULT_CORS_ORIGINS);
  });

  it("production + CORS_ORIGINS kosong → fail-fast (throw)", () => {
    process.env.NODE_ENV = "production";
    expect(() => allowedOrigins()).toThrow(/CORS_ORIGINS wajib dikonfigurasi/);
  });

  it("CORS_ORIGINS koma-pisah → array origin whitelist (trim + filter kosong)", () => {
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGINS = "https://app.school.example, https://admin.school.example , ";
    expect(allowedOrigins()).toEqual([
      "https://app.school.example",
      "https://admin.school.example"
    ]);
  });

  it("CORS_ORIGINS berisi hanya spasi/koma → fallback dev (bukan array kosong)", () => {
    process.env.NODE_ENV = "development";
    process.env.CORS_ORIGINS = " , , ";
    expect(allowedOrigins()).toEqual(DEFAULT_CORS_ORIGINS);
  });
});
