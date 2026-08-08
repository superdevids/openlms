"use client";

import * as React from "react";
import { cn } from "@openlms/ui";
import { FONT_SCALES, FONT_SCALE_ORDER, type FontScale } from "@/lib/font";
import { useFontSize } from "./font-size-provider";

/**
 * FontSizeToggle — kontrol skala ukuran teks (A / A+ / A++) untuk semua role.
 * Dipasang di header AppShell di samping ThemeToggle.
 */
export function FontSizeToggle(): React.JSX.Element {
  const { fontScale, setFontScale } = useFontSize();

  return (
    <div
      role="group"
      aria-label="Ukuran teks"
      className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5"
    >
      {FONT_SCALE_ORDER.map((scale: FontScale) => {
        const active = scale === fontScale;
        return (
          <button
            key={scale}
            type="button"
            onClick={() => setFontScale(scale)}
            aria-pressed={active}
            title={FONT_SCALES[scale].label}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-sm font-semibold transition-colors",
              active ? "bg-primary-100 text-primary-800" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {scale === "normal" ? "A" : scale === "large" ? "A+" : "A++"}
          </button>
        );
      })}
    </div>
  );
}
