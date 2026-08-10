import type { JSX, ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle, cn } from "@opensis/ui";
import { PageHeader } from "./page-header";

/**
 * FormPage — halaman form aplikasi v3 (spec D.5).
 * PageHeader + section grouping (FormSection) + sticky footer aksi.
 * presentational: onSubmit/handling form tetap di halaman pemakai.
 */
export function FormPage({
  title,
  description,
  sections,
  footer,
  backHref,
  children,
  className
}: {
  title: string;
  description?: ReactNode;
  sections?: ReactNode;
  footer?: ReactNode;
  backHref?: string;
  children?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn("space-y-6", className)}>
      <PageHeader title={title} description={description} backHref={backHref} />
      {sections ?? children}
      {footer ? (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-app-surface/95 px-4 py-4 shadow-app-sticky backdrop-blur md:-mx-6 md:px-6">
          <div className="flex items-center justify-end gap-2">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * FormSection — blok grouping field form (spec D.5.a).
 * Card + header h2 + grid `sm:grid-cols-2`; field full-width pakai `sm:col-span-2`.
 */
export function FormSection({
  title,
  description,
  children,
  id,
  required
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
  required?: boolean;
}): JSX.Element {
  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border border-border bg-app-surface p-5 shadow-app-card"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {required ? <span className="text-xs text-muted-foreground">Wajib diisi</span> : null}
      </div>
      {description ? <p className="mb-4 text-xs text-muted-foreground">{description}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * ValidationAlert — ringkasan error validasi form (spec D.5.b).
 * role=alert + aria-live assertive; error digabung dengan " • ".
 */
export function ValidationAlert({ errors }: { errors?: string[] }): JSX.Element | null {
  if (!errors || errors.length === 0) return null;
  return (
    <Alert variant="danger" className="text-sm" aria-live="assertive">
      <AlertTitle>Periksa kembali</AlertTitle>
      <AlertDescription>{errors.join(" • ")}</AlertDescription>
    </Alert>
  );
}
