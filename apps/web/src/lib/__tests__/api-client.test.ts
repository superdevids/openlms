/**
 * Unit test — lib/api-client: normalisasi error, feature-disabled, network,
 * 204, query building, idempotency header, branding helpers.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  brandingApiUrl,
  errorMessage,
  fetchRbacPermissions,
  isFeatureDisabledError,
  updateRbacRolePermission
} from "../api-client";

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): void {
  vi.stubGlobal("fetch", vi.fn(impl));
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  } as Response;
}

describe("lib/api-client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("error normalization", () => {
    it("network error → ApiError status 0 code INTERNAL", async () => {
      stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
      await expect(api.get("/x")).rejects.toMatchObject({
        status: 0,
        code: "INTERNAL"
      });
    });

    it("respons non-ok dengan body error → ApiError ter-normalisasi", async () => {
      stubFetch(() =>
        Promise.resolve(
          jsonResponse(403, {
            error: {
              code: "FEATURE_DISABLED",
              message: "Fitur dimatikan",
              details: [],
              requestId: "r1"
            }
          })
        )
      );
      const err = await api.get("/x").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("FEATURE_DISABLED");
      expect((err as ApiError).status).toBe(403);
      expect((err as ApiError).requestId).toBe("r1");
    });

    it("status tanpa body error → mapStatusToCode (401→UNAUTHORIZED, 409→CONFLICT)", async () => {
      stubFetch(() => Promise.resolve(jsonResponse(409, {})));
      const err = await api.post("/x", {}).catch((e: unknown) => e);
      expect((err as ApiError).code).toBe("CONFLICT");
    });

    it("status HTTP tanpa body error → code dari status (401→UNAUTHORIZED, 429→RATE_LIMITED)", async () => {
      stubFetch(() => Promise.resolve(jsonResponse(401, {})));
      const err401 = await api.get("/x").catch((e: unknown) => e);
      expect((err401 as ApiError).code).toBe("UNAUTHORIZED");

      stubFetch(() => Promise.resolve(jsonResponse(429, {})));
      const err429 = await api.get("/x").catch((e: unknown) => e);
      expect((err429 as ApiError).code).toBe("RATE_LIMITED");
    });

    it("isFeatureDisabledError true hanya untuk ApiError FEATURE_DISABLED", () => {
      expect(isFeatureDisabledError(new ApiError(403, "FEATURE_DISABLED", "x"))).toBe(true);
      expect(isFeatureDisabledError(new ApiError(403, "FORBIDDEN", "x"))).toBe(false);
      expect(isFeatureDisabledError(new Error("x"))).toBe(false);
    });

    it("errorMessage menangani ApiError / Error / unknown", () => {
      expect(errorMessage(new ApiError(0, "INTERNAL", "msg"))).toBe("msg");
      expect(errorMessage(new Error("boom"))).toBe("boom");
      expect(errorMessage("apa")).toBe("Terjadi kesalahan yang tidak diketahui.");
    });
  });

  describe("request building", () => {
    it("menyertakan Content-Type json & Accept untuk body objek", async () => {
      stubFetch((url, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(headers.get("Accept")).toBe("application/json");
        return Promise.resolve(jsonResponse(200, {}));
      });
      await api.post("/x", { a: 1 });
    });

    it("menambahkan Idempotency-Key header bila diberikan", async () => {
      stubFetch((url, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get("Idempotency-Key")).toBe("op_abc");
        return Promise.resolve(jsonResponse(200, {}));
      });
      await api.post("/x", {}, { idempotencyKey: "op_abc" });
    });

    it("query params: null/undefined/empty di-skip, boolean/angka di-stringify", async () => {
      let captured = "";
      stubFetch((url) => {
        captured = String(url);
        return Promise.resolve(jsonResponse(200, {}));
      });
      await api.get("/x", { query: { a: 1, b: true, c: "text", d: null, e: undefined, f: "" } });
      expect(captured).toContain("a=1");
      expect(captured).toContain("b=true");
      expect(captured).toContain("c=text");
      expect(captured).not.toContain("d=");
      expect(captured).not.toContain("e=");
      expect(captured).not.toContain("f=");
    });

    it("respons 204 → undefined (tanpa parse json)", async () => {
      stubFetch(() =>
        Promise.resolve({
          ok: true,
          status: 204,
          json: () => Promise.reject(new Error("no body"))
        } as Response)
      );
      await expect(api.del("/x")).resolves.toBeUndefined();
    });

    it("body FormData tidak diberi Content-Type json", async () => {
      stubFetch((url, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get("Content-Type")).toBeNull();
        return Promise.resolve(jsonResponse(200, {}));
      });
      const form = new FormData();
      form.append("file", new Blob(["x"]), "a.txt");
      await api.post("/x", form);
    });
  });

  describe("branding & rbac helpers", () => {
    it("brandingApiUrl menambahkan /api/v1/app/branding", () => {
      expect(brandingApiUrl()).toContain("/app/branding");
    });

    it("fetchRbacPermissions me-flatten PermissionGroup menjadi RbacPermission[]", async () => {
      stubFetch(() =>
        Promise.resolve(
          jsonResponse(200, [
            {
              category: "LMS",
              permissions: [
                { id: "p1", code: "lms:read", description: "Baca" },
                { id: "p2", code: "lms:write", description: "Tulis" }
              ]
            },
            {
              category: "Keuangan",
              permissions: [{ id: "p3", code: "fin:read", description: "Baca" }]
            }
          ])
        )
      );
      const rows = await fetchRbacPermissions();
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({
        id: "p1",
        code: "lms:read",
        category: "LMS",
        description: "Baca"
      });
      expect(rows[2]).toEqual({
        id: "p3",
        code: "fin:read",
        category: "Keuangan",
        description: "Baca"
      });
    });

    it("updateRbacRolePermission memanggil PUT dengan effect", async () => {
      stubFetch((url, init) => {
        expect(String(init?.method)).toBe("PUT");
        expect(String(url)).toContain("/rbac/roles/GURU/permissions/perm_1");
        return Promise.resolve(
          jsonResponse(200, { id: "x", permissionId: "perm_1", effect: "ALLOW" })
        );
      });
      const result = await updateRbacRolePermission("GURU", "perm_1", "ALLOW");
      expect(result.effect).toBe("ALLOW");
    });
  });
});
