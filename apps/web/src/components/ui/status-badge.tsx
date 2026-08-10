import type { JSX, ReactNode } from "react";

import { cn } from "@opensis/ui";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

/**
 * Pemetaan otomatis status umum → tone tinted (spec D.6 + task APP v3).
 * Pencarian case-insensitive (input di-uppercase dulu). Custom mapping
 * via prop `mapping` menimpa/me-lengkapi peta default.
 */
export const DEFAULT_STATUS_TONE: Record<string, StatusTone> = {
  // success
  PAID: "success",
  LUNAS: "success",
  HADIR: "success",
  PUBLISHED: "success",
  ACTIVE: "success",
  AKTIF: "success",
  OPEN: "success",
  ON: "success",
  LULUS: "success",
  DONE: "success",
  SELESAI: "success",
  APPROVED: "success",
  BUKA: "success",
  TERSUBMIT: "success",
  DINILAI: "success",
  SUCCESS: "success",
  // warning
  PENDING: "warning",
  PARTIAL: "warning",
  CICILAN: "warning",
  IZIN: "warning",
  SAKIT: "warning",
  DRAFT: "warning",
  CLOSED: "warning",
  OFF: "warning",
  DIPROSES: "warning",
  MENUNGGU: "warning",
  SCHEDULED: "warning",
  TERJADWAL: "warning",
  PROSES: "warning",
  // danger
  OVERDUE: "danger",
  MENUNGGAK: "danger",
  ALPA: "danger",
  TERLAMBAT: "danger",
  DISABLED: "danger",
  TIDAK_LULUS: "danger",
  REJECTED: "danger",
  GAGAL: "danger",
  // info
  REFUNDED: "info",
  ONGOING: "info",
  SUBMITTED: "info",
  DIAJUKAN: "info",
  // neutral
  LOCKED: "neutral",
  locked: "neutral"
};

const TONE_CLS: Record<StatusTone, string> = {
  success: "bg-status-success-bg text-status-success-fg",
  warning: "bg-status-warning-bg text-status-warning-fg",
  danger: "bg-status-danger-bg text-status-danger-fg",
  info: "bg-status-info-bg text-status-info-fg",
  neutral: "bg-muted text-muted-foreground"
};

function prettify(status: string): string {
  const v = status.replace(/_/g, " ").toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * StatusBadge — badge status tinted (bukan solid) agar terbaca AA.
 * Selalu sertakan teks; warna bukan satu-satunya penanda (P3).
 */
export function StatusBadge({
  status,
  label,
  icon,
  mapping,
  className
}: {
  status: string;
  label?: string;
  icon?: ReactNode;
  mapping?: Record<string, StatusTone>;
  className?: string;
}): JSX.Element {
  const toneMap = { ...DEFAULT_STATUS_TONE, ...mapping };
  const tone = toneMap[status.toUpperCase()] ?? toneMap[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        TONE_CLS[tone],
        className
      )}
    >
      {icon ?? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70"
          aria-hidden="true"
        />
      )}
      <span>{label ?? prettify(status)}</span>
    </span>
  );
}
