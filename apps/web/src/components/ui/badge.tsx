"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-transparent bg-muted text-foreground",
  success: "border-transparent bg-success-600 text-white",
  warning: "border-transparent bg-warning-700 text-white",
  danger: "border-transparent bg-destructive text-white",
  info: "border-transparent bg-info-600 text-white",
  primary: "border-transparent bg-primary-100 text-primary-800"
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({
  className,
  variant = "neutral",
  icon,
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
