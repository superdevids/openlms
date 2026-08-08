"use client";

import { useCallback, useEffect, useState } from "react";

import {
  readFeatureFlagsForDemo,
  writeFeatureFlagForDemo,
  normalizeFlags,
  type FeatureFlag,
  type FeatureFlagApiShape
} from "@/lib/feature-flags";
import { api, DEMO_MODE } from "@/lib/api-client";

/**
 * Hook feature flags.
 * - SUPERADMIN: baca GET /app/feature-flags (SA only, 04 §2.1).
 * - Role lain: default lokal (menu disembunyikan utk modul OFF; API tetap
 *   menolak FEATURE_DISABLED sebagai lapis keamanan).
 * - Demo mode: baca/tulis localStorage agar konsol flag bisa dipreview.
 */

interface UseFeatureFlagsResult {
  flags: FeatureFlag[];
  loading: boolean;
  error?: unknown;
  setFlag: (key: string, enabled: boolean) => void;
  refresh: () => void;
}

export function useFeatureFlags(allowRemote = true): UseFeatureFlagsResult {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => readFeatureFlagsForDemo());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      if (DEMO_MODE) {
        setFlags(readFeatureFlagsForDemo());
        setLoading(false);
        return;
      }
      if (!allowRemote) {
        setLoading(false);
        return;
      }
      try {
        const raw = await api.get<{ items: FeatureFlagApiShape[] } | FeatureFlagApiShape[]>(
          "/app/feature-flags"
        );
        const items = Array.isArray(raw) ? raw : raw.items;
        if (cancelled) return;
        setFlags(normalizeFlags(items ?? []));
      } catch (err) {
        if (cancelled) return;
        // SA boleh gagal saat backend belum siap → fallback default, jangan error blokir
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tick, allowRemote]);

  const setFlag = useCallback((key: string, enabled: boolean): void => {
    if (DEMO_MODE) {
      writeFeatureFlagForDemo(key, enabled);
      setFlags(readFeatureFlagsForDemo());
      return;
    }
    void api
      .patch(`/app/feature-flags/${key}`, { enabled })
      .then(() => setTick((t) => t + 1))
      .catch(() => setError(new Error("Gagal menyimpan pengaturan fitur")));
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { flags, loading, error, setFlag, refresh };
}
