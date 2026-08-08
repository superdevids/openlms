/**
 * Unit test — lib/use-socket: getSocket singleton, useSocket event handling,
 * useUnreadNotifications refetch. socket.io-client di-mock penuh.
 * Harness manual (react-dom/client + React.act) — @testing-library/dom tidak
 * terpasang sehingga @testing-library/react tidak dapat dimuat.
 */
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: mockOn,
    off: mockOff,
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn()
  }))
}));

vi.mock("../api-client", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, API_BASE: "/api/v1" };
});

import {
  getSocket,
  NOTIFICATION_NEW_EVENT,
  useSocket,
  useUnreadNotifications
} from "../use-socket";

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

describe("lib/use-socket", () => {
  beforeEach(() => {
    mockOn.mockClear();
    mockOff.mockClear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getSocket mengembalikan objek socket singleton", () => {
    const a = getSocket();
    const b = getSocket();
    expect(a).toBe(b);
  });

  it("useSocket men-subscribe connect/disconnect/connect_error dan cleanup off", () => {
    const { unmount } = renderHook(() => useSocket());
    expect(mockOn).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("disconnect", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("connect_error", expect.any(Function));

    unmount();
    expect(mockOff).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith("disconnect", expect.any(Function));
  });

  it("useUnreadNotifications mendaftarkan listener notification:new", () => {
    renderHook(() => useUnreadNotifications());
    expect(mockOn).toHaveBeenCalledWith(NOTIFICATION_NEW_EVENT, expect.any(Function));
  });

  it("useUnreadNotifications me-refetch saat event notification:new", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 7 })
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useUnreadNotifications());
    const handler = mockOn.mock.calls.find((c) => c[0] === NOTIFICATION_NEW_EVENT)?.[1] as
      (() => void) | undefined;
    expect(handler).toBeDefined();

    React.act(() => handler?.());
    await React.act(async () => {
      await sleep(50);
    });
    expect(fetchMock).toHaveBeenCalled();
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/notifications/unread-count");
  });

  it("useUnreadNotifications tidak gagal saat fetch non-ok (best-effort)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUnreadNotifications());
    await React.act(async () => {
      await sleep(50);
    });
    // data null (bukan error) — hook tetap jalan
    expect(result.current.unread).toBeNull();
  });
});
