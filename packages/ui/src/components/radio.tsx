"use client";

import { type ComponentProps, type JSX } from "react";

import { cn } from "../lib/utils";

export function RadioGroup({
  className,
  options,
  name,
  ...props
}: ComponentProps<"input"> & {
  options?: Array<{ value: string; label: string }>;
}): JSX.Element {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="radiogroup">
      {(options ?? []).map((opt) => (
        <label
          key={opt.value}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            className="h-4 w-4 accent-primary"
            {...props}
          />
          <span className="text-base text-foreground">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
