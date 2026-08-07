"use client";

import * as React from "react";
import type { LoadStatus } from "@/lib/use-api";
import { SkeletonList } from "./skeleton";
import { ErrorState, FeatureDisabledState } from "./error-state";
import { EmptyState } from "./empty-state";
import { cn } from "@/lib/utils";

/**
 * Wrapper pola state (07-ux §6.5): loading → skeleton; error → alert + retry;
 * disabled (FEATURE_DISABLED) → peringatan; fallback (demo) → banner + konten;
 * empty → EmptyState; sukses → children.
 */
export function DataView({
  status,
  error,
  onRetry,
  fallbackLabel,
  loading,
  empty: _empty,
  children,
  className
}: {
  status: LoadStatus;
  error?: unknown;
  onRetry?: () => void;
  fallbackLabel?: string;
  loading?: React.ReactNode;
  empty?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  if (status === "loading")
    return <div className={cn("space-y-3", className)}>{loading ?? <SkeletonList />}</div>;
  if (status === "error") return <ErrorState error={error} onRetry={onRetry} />;
  if (status === "disabled") return <FeatureDisabledState />;
  if (status === "fallback") {
    return (
      <div className={cn("space-y-3", className)}>
        <DemoBannerInline label={fallbackLabel} />
        {children}
      </div>
    );
  }
  return <div className={className}>{children}</div>;
}

import { DEMO_MODE } from "@/lib/api-client";

function DemoBannerInline({ label }: { label?: string }): React.JSX.Element | null {
  if (!DEMO_MODE) return null;
  return (
    <p className="rounded-md border border-info-600 bg-info-100 px-3 py-2 text-sm text-info-700">
      {label ?? "Mode demo"} — data contoh. Backend belum terhubung.
    </p>
  );
}

export { EmptyState };
