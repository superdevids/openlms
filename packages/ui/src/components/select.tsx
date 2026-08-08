"use client";

import { type ComponentProps, type JSX } from "react";

import { cn } from "../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  className,
  options,
  placeholder,
  ...props
}: ComponentProps<"select"> & {
  options?: SelectOption[];
  placeholder?: string;
}): JSX.Element {
  return (
    <select
      className={cn(
        "flex h-11 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-base text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {(options ?? []).map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
