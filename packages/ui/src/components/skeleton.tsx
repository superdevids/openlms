"use client";

import { type HTMLAttributes, type JSX } from "react";

import { cn } from "../lib/utils";

/** Skeleton sesuai bentuk layout — hindari layout shift (07-ux §6.5 Loading). */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }): JSX.Element {
  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-card p-4"
      aria-busy="true"
      aria-label="Memuat konten"
    >
      <Skeleton className="h-5 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export function SkeletonList({
  count = 3,
  lines = 3
}: {
  count?: number;
  lines?: number;
}): JSX.Element {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat konten">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
