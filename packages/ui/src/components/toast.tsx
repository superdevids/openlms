"use client";

import { useSyncExternalStore, type JSX } from "react";
import { IconX } from "./icons";

/**
 * Toast sederhana (pola Sonner — 07-ux §6.4). aria-live="polite".
 * Tidak memakai dependensi eksternal.
 */

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

type Listener = () => void;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastItem[] {
  return toasts;
}

export function toast(opts: { variant?: ToastVariant; title: string; description?: string }): void {
  const item: ToastItem = {
    id: nextId++,
    variant: opts.variant ?? "info",
    title: opts.title,
    description: opts.description
  };
  toasts = [...toasts, item];
  emit();
  const t = window.setTimeout(() => dismiss(item.id), 5000);
  // cleanup timeout tidak disimpan per-item untuk kesederhanaan; aman
  void t;
}

export function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Warna per variant (item 5) — hijau success, merah error, kuning warning, biru info.
 *  Memakai token status (--status-*-fg/bg/border) agar konsisten light & dark. */
const VARIANT_STYLE: Record<ToastVariant, { border: string; title: string; bg: string }> = {
  success: {
    border: "border-status-success-border",
    title: "text-status-success-fg",
    bg: "bg-status-success-bg"
  },
  error: {
    border: "border-status-danger-border",
    title: "text-status-danger-fg",
    bg: "bg-status-danger-bg"
  },
  warning: {
    border: "border-status-warning-border",
    title: "text-status-warning-fg",
    bg: "bg-status-warning-bg"
  },
  info: {
    border: "border-status-info-border",
    title: "text-status-info-fg",
    bg: "bg-status-info-bg"
  }
};

export function Toaster(): JSX.Element {
  const items = useToasts();
  if (items.length === 0) return <div aria-live="polite" />;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-4"
    >
      {items.map((item) => {
        const style = VARIANT_STYLE[item.variant];
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm rounded-lg border bg-card p-4 text-card-foreground shadow-lg ${style.border} ${style.bg}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${style.title}`}>{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Tutup pemberitahuan"
                onClick={() => dismiss(item.id)}
                className="touch-target rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
