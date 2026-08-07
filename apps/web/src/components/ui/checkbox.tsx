"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  ...props
}: React.ComponentProps<"input">): React.JSX.Element {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-5 w-5 rounded border-input bg-background text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className
      )}
      {...props}
    />
  );
}
