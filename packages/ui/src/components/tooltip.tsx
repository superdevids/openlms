"use client";

import { type JSX, type ReactNode } from "react";

import { cn } from "../lib/utils";

/**
 * Tooltip ringan (CSS group-hover/focus) — label pendek untuk ikon/aksi.
 * A11y: label dibaca screen reader via aria-label pada elemen pemicu;
 * tooltip sendiri dekoratif (role="tooltip" + pointer-events-none).
 */

const SIDE_CLASSES: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2"
};

export function Tooltip({
  label,
  children,
  side = "top",
  className
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}): JSX.Element {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-lg transition-opacity group-hover:block group-hover:opacity-100 group-focus-within:block group-focus-within:opacity-100",
          SIDE_CLASSES[side]
        )}
      >
        {label}
      </span>
    </span>
  );
}
