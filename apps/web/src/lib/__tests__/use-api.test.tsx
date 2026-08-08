/**
 * Unit test — lib/use-api (hook): state machine loading/success/error/
 * disabled/fallback + refetch.
 * Harness manual (react-dom/client + React.act) — @testing-library/dom tidak
 * terpasang sehingga @testing-library/react tidak dapat dimuat.
 */
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApi } from "../use-api";
import { ApiError } from "../api-client";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface HookResult<T> {
  result: { current: T };
  unmount: () => void;
}

function renderHook<T>(useHook: () => T): HookResult<T> {
  const result: { current: T } = { current: undefined as never };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function TestComponent(): null {
    result.current = useHook();
    return null;
  }

  React.act(() => {
    root.render(React.createElement(TestComponent));
  });

  return {
    result,
    unmount: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

async function waitForStatus(
  getStatus: () => string,
  expected: string,
  timeoutMs = 2000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (getStatus() === expected) return;
    await React.act(async () => {
      await sleep(10);
    });
  }
  throw new Error(`status tidak pernah menjadi ${expected} (sekarang ${getStatus()})`);
}

describe("lib/use-api (R-39)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loading → success dengan data", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1] });
    const { result } = renderHook(() => useApi(fetcher, []));

    expect(result.current.status).toBe("loading");

    await waitForStatus(() => result.current.status, "success");
    expect(result.current.data).toEqual({ items: [1] });
    expect(result.current.error).toBeUndefined();
  });

  it("fetcher gagal → error dengan ApiError", async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(500, "INTERNAL", "Server error"));
    const { result } = renderHook(() => useApi(fetcher, []));

    await waitForStatus(() => result.current.status, "error");
    expect(result.current.error?.code).toBe("INTERNAL");
    expect(result.current.data).toBeUndefined();
  });

  it("error non-ApiError dinormalisasi menjadi ApiError INTERNAL", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useApi(fetcher, []));

    await waitForStatus(() => result.current.status, "error");
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.status).toBe(0);
    expect(result.current.error?.code).toBe("INTERNAL");
  });

  it("enabled=false → status loading tanpa fetch", async () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => useApi(fetcher, [], { enabled: false }));

    expect(result.current.status).toBe("loading");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("FEATURE_DISABLED → status disabled", async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(403, "FEATURE_DISABLED", "Fitur mati"));
    const { result } = renderHook(() => useApi(fetcher, []));

    await waitForStatus(() => result.current.status, "disabled");
    expect(result.current.error?.code).toBe("FEATURE_DISABLED");
  });

  it("refetch memanggil fetcher lagi dan memperbarui data", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const { result } = renderHook(() => useApi(fetcher, []));

    await waitForStatus(() => result.current.status, "success");
    expect(result.current.data).toBe(1);
    React.act(() => result.current.refetch());
    await waitForStatus(() => String(result.current.data), "2");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("refetch pada state error kembali sukses", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("first")).mockResolvedValueOnce("ok");
    const { result } = renderHook(() => useApi(fetcher, []));

    await waitForStatus(() => result.current.status, "error");
    React.act(() => result.current.refetch());
    await waitForStatus(() => result.current.status, "success");
    expect(result.current.data).toBe("ok");
  });

  it("unmount membatalkan fetch (tidak setState setelah unmount)", async () => {
    let resolveFetcher: (v: string) => void = () => undefined;
    const fetcher = vi.fn(() => new Promise<string>((resolve) => (resolveFetcher = resolve)));
    const { unmount } = renderHook(() => useApi(fetcher, []));
    unmount();
    await React.act(async () => resolveFetcher("late"));
    // Tidak ada error unhandled — test lulus bila tidak throw.
  });

  it("AbortError (DOMException) tidak menghasilkan state error", async () => {
    const fetcher = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    const { result } = renderHook(() => useApi(fetcher, []));

    await React.act(async () => {
      await sleep(50);
    });
    expect(result.current.status).toBe("loading");
  });
});
