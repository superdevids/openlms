"use client";

import * as React from "react";
import { IconMoon, IconSun } from "@openlms/ui";
import { useTheme, type Theme } from "./theme-provider";

/**
 * ThemeToggle — tombol ganti tema (audit R-01).
 * Siklus: light → dark → system → light. Ikon menunjukkan mode yang dituju:
 * di dark tampil matahari (klik → light), di light tampil bulan (klik → dark).
 */
const NEXT_THEME: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };

export function ThemeToggle(): React.JSX.Element {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const next = NEXT_THEME[theme];
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="touch-target rounded-md text-muted-foreground hover:bg-muted"
      aria-label="Ganti tema"
      title={`Tema: ${theme === "system" ? `sistem (${resolvedTheme})` : theme}`}
    >
      {isDark ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
    </button>
  );
}
