"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, DEMO_MODE, errorMessage, isFeatureDisabledError } from "@/lib/api-client";

/**
 * Hook ringan untuk server state (pengganti TanStack Query — lihat ISSUES).
 * Pola state konsisten 07-ux §6.5: loading / error (blokir) / disabled / empty / success.
 * Saat DEMO_MODE dan fetch gagal, fallbackData (data contoh) dipakai → status "fallback".
 */

export type LoadStatus = "loading" | "success" | "error" | "disabled" | "fallback";

export interface UseApiResult<T> {
  status: LoadStatus;
  data?: T;
  error?: ApiError;
  refetch: () => void;
}

interface Options<T> {
  fallbackData?: T;
  enabled?: boolean;
}

export function useApi<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
  options: Options<T> = {}
): UseApiResult<T> {
  const { fallbackData, enabled = true } = options;
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("loading");
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setStatus("loading");
    setError(undefined);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (cancelled || !mountedRef.current) return;
        setData(result);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const apiErr =
          err instanceof ApiError ? err : new ApiError(0, "INTERNAL", errorMessage(err));
        if (isFeatureDisabledError(apiErr)) {
          setError(apiErr);
          setStatus("disabled");
          return;
        }
        if (DEMO_MODE && fallbackData !== undefined) {
          setData(fallbackData);
          setStatus("fallback");
          return;
        }
        setError(apiErr);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [...deps, tick, enabled, fallbackData]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { status, data, error, refetch };
}

/**
 * Nama generik untuk pola async-data (fetch + loading + error + refetch).
 * Alias dari useApi — konsumen baru disarankan memakai nama ini agar
 * pemakaiannya jelas: `useAsyncData(() => api.get<T>(...), [deps])`.
 */
export const useAsyncData = useApi;
