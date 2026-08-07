"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0..100
  max?: number;
  showLabel?: boolean;
}

export function Progress({
  value,
  max = 100,
  showLabel = false,
  className,
  ...props
}: ProgressProps): React.JSX.Element {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <span className="text-sm font-medium text-muted-foreground">{Math.round(pct)}%</span>
      ) : null}
    </div>
  );
}
