import type { JSX, ReactNode } from "react";

import { cn } from "@opensis/ui";

/**
 * PageContainer — kontainer konten aplikasi v3 (spec app-design-system-v3 §C.2).
 * `mx-auto max-w-7xl px-4 md:px-6 py-6` — naik dari max-w-6xl agar workspace lebih lega.
 */
export function PageContainer({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-6 md:px-6", className)}>{children}</div>
  );
}
