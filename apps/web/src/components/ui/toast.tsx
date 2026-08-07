"use client";

import { useSyncExternalStore } from "react";

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

export function Toaster(): React.JSX.Element {
  const items = useToasts();
  if (items.length === 0) return <div aria-live="polite" />;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-4"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto w-full max-w-sm rounded-lg border bg-card p-4 text-card-foreground shadow-lg ${
            item.variant === "error" ? "border-destructive/50" : "border-border"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold ${item.variant === "error" ? "text-destructive" : "text-foreground"}`}
              >
                {item.title}
              </p>
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
      ))}
    </div>
  );
}

function IconX({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
