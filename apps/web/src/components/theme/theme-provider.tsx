"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from "react";

import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

/**
 * ThemeProvider — dark mode class-based (audit R-01).
 * - theme: pilihan user ("light" | "dark" | "system"), default "system".
 * - Persist ke localStorage via storage.ts (key opensis_theme).
 * - Terapkan documentElement.classList.toggle("dark", ...) + style.colorScheme.
 * - Saat "system": listen matchMedia("(prefers-color-scheme: dark)").
 * - No-FOUC script di layout.tsx sudah menerapkan class sebelum React; provider
 *   ini hanya menjaga sinkronisasi state agar tidak ada flash saat interaksi.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

function systemResolved(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = safeGet<Theme>(STORAGE_KEYS.theme);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : null;
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? "system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const stored = readStoredTheme();
    if (stored === "light" || stored === "dark") return stored;
    return systemResolved();
  });

  // Ikuti perubahan preferensi OS hanya saat theme = "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia(SYSTEM_QUERY);
    const onChange = (): void => setResolvedTheme(mq.matches ? "dark" : "light");
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Terapkan .dark + colorScheme setiap resolvedTheme berubah.
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next);
    setResolvedTheme(next === "system" ? systemResolved() : next);
    safeSet(STORAGE_KEYS.theme, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme harus dipakai di dalam <ThemeProvider>");
  return ctx;
}
