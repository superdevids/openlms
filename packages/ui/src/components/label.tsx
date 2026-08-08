"use client";

import { type ComponentProps, type JSX } from "react";

import { cn } from "../lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">): JSX.Element {
  return (
    <label
      className={cn("block text-sm font-medium leading-none text-foreground", className)}
      {...props}
    />
  );
}
