import type { JSX, ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle, Label } from "@opensis/ui";

/**
 * RequiredLabel — Label dengan tanda `*` merah untuk field wajib (item 15).
 * Drop-in untuk `<Label htmlFor="...">Teks</Label>` bila field required;
 * span merah konsisten dengan pola login-form (text-red-500).
 */
export function RequiredLabel({
  htmlFor,
  children,
  className
}: {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <Label htmlFor={htmlFor} className={className}>
      {children} <span className="text-red-500">*</span>
    </Label>
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
