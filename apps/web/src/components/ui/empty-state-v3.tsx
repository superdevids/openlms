import type { JSX, ReactNode } from "react";

import { cn } from "@opensis/ui";

/**
 * EmptyStateV3 — empty state aplikasi v3 (spec D.9).
 * Ikon tint brand + judul + deskripsi + CTA solutif (action WAJIB bila relevan).
 */
export function EmptyStateV3({
  icon,
  title,
  desc,
  action,
  className,
  compact
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-app-surface-2/60 px-6 py-10 text-center",
        compact && "py-6",
        className
      )}
    >
      {icon ? (
        <div
          className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {desc ? <p className="max-w-sm text-xs text-muted-foreground">{desc}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
