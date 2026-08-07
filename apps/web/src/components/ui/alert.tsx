"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger";

const variantClasses: Record<AlertVariant, string> = {
  info: "border-info-600 bg-info-100 text-info-700",
  success: "border-success-600 bg-success-600/10 text-success-700",
  warning: "border-warning-700 bg-warning-100 text-warning-700",
  danger: "border-destructive/50 bg-destructive/10 text-destructive"
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

/** Pesan penting/error blokir — role="alert" (07-ux §7 Error announcement). */
export function Alert({
  className,
  variant = "info",
  role = "alert",
  ...props
}: AlertProps): React.JSX.Element {
  return (
    <div
      role={role}
      className={cn("rounded-md border px-4 py-3 text-base", variantClasses[variant], className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return <h3 className={cn("mb-1 text-sm font-semibold", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return <p className={cn("text-sm", className)} {...props} />;
}
