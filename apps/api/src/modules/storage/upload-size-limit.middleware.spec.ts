import { PayloadTooLargeException } from "@nestjs/common";
import { UploadSizeLimitMiddleware } from "./upload-size-limit.middleware";

/**
 * UploadSizeLimitMiddleware spec — reject dini upload besar (R-26):
 * header Content-Length > limit per-bucket / batas global → 413 lewat next(err).
 */

interface FakeRequest {
  method: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | undefined>;
}

function makeReq(method: string, url: string, contentLength?: string): FakeRequest {
  return {
    method,
    originalUrl: url,
    url,
    headers: contentLength !== undefined ? { "content-length": contentLength } : {}
  };
}

describe("UploadSizeLimitMiddleware", () => {
  const mw = new UploadSizeLimitMiddleware();

  it("meloloskan request non-POST", () => {
    const next = jest.fn();
    mw.use(makeReq("GET", "/api/v1/storage/files/branding/logo.png") as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("meloloskan upload kecil (Content-Length ≤ limit bucket)", () => {
    const next = jest.fn();
    mw.use(makeReq("POST", "/api/v1/storage/files/branding", "1024") as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeUndefined();
  });

  it("melewati request tanpa Content-Length (chunked → multer yang menegakkan)", () => {
    const next = jest.fn();
    mw.use(makeReq("POST", "/api/v1/storage/files/branding") as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeUndefined();
  });

  it("413 lewat next(err) bila Content-Length melebihi batas per-bucket (branding 2MB default)", () => {
    const next = jest.fn();
    mw.use(
      makeReq("POST", "/api/v1/storage/files/branding", String(3 * 1024 * 1024)) as never,
      {} as never,
      next
    );
    expect(next).toHaveBeenCalledWith(expect.any(PayloadTooLargeException));
  });

  it("413 bila Content-Length melebihi batas keras global (STORAGE_GLOBAL_MAX_MB=1)", () => {
    process.env.STORAGE_GLOBAL_MAX_MB = "1";
    try {
      const next = jest.fn();
      // branding per-bucket 2MB, tapi global 1MB → 413
      mw.use(
        makeReq("POST", "/api/v1/storage/files/branding", String(2 * 1024 * 1024)) as never,
        {} as never,
        next
      );
      expect(next).toHaveBeenCalledWith(expect.any(PayloadTooLargeException));
    } finally {
      delete process.env.STORAGE_GLOBAL_MAX_MB;
    }
  });

  it("meloloskan upload publik PPDB yang masih di bawah limit", () => {
    const next = jest.fn();
    mw.use(
      makeReq("POST", "/api/v1/storage/files/public/ppdb-documents", "2048") as never,
      {} as never,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeUndefined();
  });
});
