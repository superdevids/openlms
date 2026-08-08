"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from "react";

import { fetchAppFontSettings } from "@/lib/api-client";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SCALE,
  FONT_FAMILIES,
  FONT_SCALES,
  fontFamilyStack,
  isFontFamily,
  isFontScale,
  type FontScale
} from "@/lib/font";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

/**
 * FontSizeProvider — skala ukuran teks per user (normal/large/big) + font global.
 * - fontScale: pilihan user, persist ke localStorage (key opensis_font_scale);
 *   diterapkan sebagai class .font-scale-* di <html> (root font-size → seluruh UI).
 * - Global SUPERADMIN (SchoolProfile.settings.font via GET /app/settings/font):
 *   menjadi default untuk user yang belum memilih sendiri, dan mengatur
 *   --app-font-sans bila font sekolah berbeda dari default.
 * - No-FOUC script di layout.tsx menerapkan class sebelum React (baca localStorage).
 */

interface FontSizeContextValue {
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

function readStoredScale(): FontScale | null {
  if (typeof window === "undefined") return null;
  const stored = safeGet<unknown>(STORAGE_KEYS.fontScale);
  return isFontScale(stored) ? stored : null;
}

function applyScale(scale: FontScale): void {
  const root = document.documentElement;
  root.classList.remove(...Object.values(FONT_SCALES).map((meta) => meta.htmlClass));
  root.classList.add(FONT_SCALES[scale].htmlClass);
}

function ensureFontLink(href: string): void {
  if (document.querySelector(`link[data-font-src="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.fontSrc = href;
  document.head.appendChild(link);
}

function applyGlobalFont(fontFamily: string): void {
  if (!isFontFamily(fontFamily) || fontFamily === DEFAULT_FONT_FAMILY) return;
  const option = FONT_FAMILIES.find((f) => f.value === fontFamily);
  if (!option) return;
  document.documentElement.style.setProperty("--app-font-sans", fontFamilyStack(option.value));
  ensureFontLink(option.googleUrl);
}

export function FontSizeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [fontScale, setFontScaleState] = useState<FontScale>(
    () => readStoredScale() ?? DEFAULT_FONT_SCALE
  );

  // Terapkan class skala setiap fontScale berubah (state awal juga).
  useEffect(() => {
    applyScale(fontScale);
  }, [fontScale]);

  // Global settings sekolah: seed default + font family (satu kali saat mount).
  useEffect(() => {
    let cancelled = false;
    void fetchAppFontSettings()
      .then((global) => {
        if (cancelled || !global) return;
        if (global.font_family) applyGlobalFont(global.font_family);
        if (isFontScale(global.base_font_scale) && !readStoredScale()) {
          setFontScaleState(global.base_font_scale);
        }
      })
      .catch(() => {
        // Gagal/offline/DEMO → default sudah benar, tidak perlu error ke user.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setFontScale = useCallback((next: FontScale): void => {
    setFontScaleState(next);
    safeSet(STORAGE_KEYS.fontScale, next);
  }, []);

  const value = useMemo<FontSizeContextValue>(
    () => ({ fontScale, setFontScale }),
    [fontScale, setFontScale]
  );

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSize(): FontSizeContextValue {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error("useFontSize harus dipakai di dalam <FontSizeProvider>");
  return ctx;
}
