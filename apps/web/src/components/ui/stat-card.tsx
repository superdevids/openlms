import Link from "next/link";
import type { JSX, ReactNode } from "react";

import { Card, cn } from "@opensis/ui";
import { safeInternalHref } from "@/lib/safe-url";

export type StatTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

export type StatDelta = string | { value: string; direction: "up" | "down" | "flat" };

export interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  /** Delta: string ("+12%" / "-3") — arah diturunkan otomatis; atau objek {value, direction}. */
  delta?: StatDelta;
  /** Konteks singkat di samping delta (mis. "2 menunggu verifikasi"). */
  deltaLabel?: string;
  hint?: string;
  tone?: StatTone;
  href?: string;
  /** Sparkline SVG murni (tanpa dependency) — data angka apa pun skalanya. */
  sparkline?: number[];
  className?: string;
}

const TONE_BG: Record<StatTone, string> = {
  brand: "bg-brand-primary/10 text-brand-primary",
  success: "bg-status-success-bg text-status-success-fg",
  warning: "bg-status-warning-bg text-status-warning-fg",
  danger: "bg-status-danger-bg text-status-danger-fg",
  info: "bg-status-info-bg text-status-info-fg",
  neutral: "bg-muted text-muted-foreground"
};

/** Sparkline SVG murni tanpa dependency (spec D.3). */
export function Sparkline({
  data,
  className
}: {
  data: number[];
  className?: string;
}): JSX.Element {
  if (!data || data.length < 2) {
    return <div className={className} aria-hidden="true" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 32;
  const step = w / (data.length - 1);
  const points = data.map(
    (v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(2)}`
  );
  const line = points.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={area} fill="var(--brand-primary)" opacity="0.08" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * StatCard — KPI dengan ikon tint + delta + konteks (spec D.3).
 * Delta naik → tint success, turun → tint danger, flat → neutral.
 */
export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaLabel,
  hint,
  tone = "brand",
  href,
  sparkline,
  className
}: StatCardProps): JSX.Element {
  const deltaValue = typeof delta === "string" ? delta : delta?.value;
  const direction: "up" | "down" | "flat" =
    typeof delta === "string"
      ? delta.startsWith("-")
        ? "down"
        : delta.startsWith("+")
          ? "up"
          : "flat"
      : (delta?.direction ?? "flat");
  const deltaClass =
    direction === "up"
      ? "bg-status-success-bg text-status-success-fg"
      : direction === "down"
        ? "bg-status-danger-bg text-status-danger-fg"
        : "bg-muted text-muted-foreground";

  const content = (
    <Card className="group h-full overflow-hidden rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-floating">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight md:text-3xl">
            {value}
          </p>
        </div>
        {icon ? (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              TONE_BG[tone]
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>
      {deltaValue || deltaLabel || hint ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {deltaValue ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                deltaClass
              )}
            >
              {deltaValue}
            </span>
          ) : null}
          {deltaLabel || hint ? (
            <span className="truncate text-xs text-muted-foreground">{deltaLabel ?? hint}</span>
          ) : null}
        </div>
      ) : null}
      {sparkline && sparkline.length > 1 ? (
        <Sparkline data={sparkline} className="mt-3 h-8 w-full" />
      ) : null}
    </Card>
  );

  const safeHref = href ? safeInternalHref(href) : "";
  return safeHref ? (
    <Link href={safeHref} className={cn("block h-full", className)}>
      {content}
    </Link>
  ) : (
    <div className={cn("h-full", className)}>{content}</div>
  );
}

/** StatGrid — grid KPI default aplikasi v3: `grid-cols-2 lg:grid-cols-4`. */
export function StatGrid({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>;
}
