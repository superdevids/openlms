"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">): React.JSX.Element {
  return (
    <label
      className={cn("block text-sm font-medium leading-none text-foreground", className)}
      {...props}
    />
  );
}
