"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Dropdown menu sederhana tanpa dependency (07-ux §6.4 Menu).
 * - Buka/tutup via trigger; tutup saat ESC atau klik di luar.
 * - Item memakai role="menuitem" + aksi onSelect per baris.
 */

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  label,
  className
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  label?: string;
  className?: string;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDoc = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <span
        role="button"
        id={`${buttonId}-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${buttonId}-menu`}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </span>
      {open ? (
        <div
          id={`${buttonId}-menu`}
          role="menu"
          aria-labelledby={`${buttonId}-trigger`}
          className={cn(
            "absolute z-50 mt-1 min-w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownMenuItem({
  onSelect,
  children,
  className
}: {
  onSelect?: () => void;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {children}
    </button>
  );
}
