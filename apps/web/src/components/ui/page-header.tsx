import Link from "next/link";
import type { JSX, ReactNode } from "react";

import { cn, IconChevronLeft } from "@opensis/ui";

/**
 * PageHeader — satu h1 per halaman aplikasi v3 (spec D.2).
 * Menggantikan h1 manual: title + description + actions (CTA kanan) + meta chip.
 * backHref opsional → tombol "← Kembali" di kiri judul.
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  meta,
  className
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  meta?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className="touch-target -ml-1 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Kembali"
            >
              <IconChevronLeft className="h-5 w-5" />
            </Link>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {meta}
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
