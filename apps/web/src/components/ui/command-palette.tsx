"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from "react";

import { useRouter } from "next/navigation";
import { Dialog, Input, cn, IconSearch } from "@opensis/ui";
import { EmptyStateV3 } from "./empty-state-v3";

export interface CommandItem {
  id: string;
  label: string;
  group?: string;
  href?: string;
  icon?: ReactNode;
  /** Kata kunci tambahan untuk filter (selain label/grup). */
  keywords?: string;
  onSelect?: () => void;
}

/**
 * CommandPalette — modal Cmd+K (spec D.7).
 * Data dari props `items` (menu navigasi + aksi). Keyboard: ↑↓ pilih, Enter
 * buka, Esc tutup. Shortcut global Ctrl/Cmd+K. Bisa dipakai controlled
 * (open/onOpenChange) atau mandiri (internal state + shortcut global).
 */
export function CommandPalette({
  items = [],
  open,
  onOpenChange,
  placeholder = "Cari menu…"
}: {
  items?: CommandItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
}): JSX.Element | null {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const controlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = controlled ? open : internalOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      if (controlled) onOpenChangeRef.current?.(v);
      else setInternalOpen(v);
    },
    [controlled]
  );

  // Shortcut global Ctrl/Cmd+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (controlled) onOpenChangeRef.current?.(true);
        else setInternalOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [controlled]);

  // Reset pencarian + indeks saat dibuka.
  useEffect(() => {
    if (isOpen) {
      setQ("");
      setActive(0);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) =>
      `${it.label} ${it.group ?? ""} ${it.keywords ?? ""}`.toLowerCase().includes(needle)
    );
  }, [q, items]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const it of filtered) {
      const g = it.group ?? "Menu";
      if (!map.has(g)) map.set(g, []);
      map.get(g)?.push(it);
    }
    return Array.from(map.entries()).map(([label, groupItems]) => ({ label, items: groupItems }));
  }, [filtered]);

  const run = (it: CommandItem): void => {
    if (it.onSelect) it.onSelect();
    else if (it.href) router.push(it.href);
    setOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open
      onOpenChange={(v) => !v && setOpen(false)}
      title="Pencarian cepat"
      description={placeholder}
    >
      <div
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (filtered.length === 0 ? 0 : (a + 1) % filtered.length));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) =>
              filtered.length === 0 ? 0 : (a - 1 + filtered.length) % filtered.length
            );
          } else if (e.key === "Enter") {
            e.preventDefault();
            const it = filtered[active];
            if (it) run(it);
          }
        }}
      >
        <div className="mb-3 flex items-center gap-2 border-b border-border px-1 pb-3">
          <IconSearch className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder={placeholder}
            className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            autoFocus
            aria-label="Cari"
          />
          <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {groups.length === 0 ? (
            <EmptyStateV3
              compact
              icon={<IconSearch className="h-5 w-5" />}
              title="Tidak ditemukan"
              desc={q ? `Tidak ada hasil untuk "${q}"` : "Ketik untuk mencari menu atau aksi"}
            />
          ) : (
            groups.map((g) => (
              <div key={g.label}>
                <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </p>
                <ul className="space-y-0.5">
                  {g.items.map((it) => {
                    const idx = filtered.indexOf(it);
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => run(it)}
                          onMouseEnter={() => setActive(idx)}
                          className={cn(
                            "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors",
                            idx === active
                              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {it.icon ? (
                            <span className="shrink-0" aria-hidden="true">
                              {it.icon}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 truncate">{it.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
