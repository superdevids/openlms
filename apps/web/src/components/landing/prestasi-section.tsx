"use client";

import { useMemo, useState, type JSX } from "react";
import { Badge, type BadgeVariant, Card, CardContent, cn } from "@opensis/ui";
import { StaggerContainer, StaggerItem } from "@/components/landing/motion";

/**
 * Grid prestasi + filter level (klien).
 * Data diambil server (halaman /prestasi), filter berjalan di browser.
 * Warna Badge mengikuti level — kontras dibedakan agar tidak hanya satu warna.
 */

export interface PrestasiItem {
  title: string;
  level: string;
  year: string;
  field: string;
  coach: string;
  description: string;
}

const LEVEL_VARIANT: Record<string, BadgeVariant> = {
  SEKOLAH: "neutral",
  KABUPATEN: "info",
  PROVINSI: "primary",
  NASIONAL: "warning",
  INTERNASIONAL: "success"
};

const LEVEL_ORDER = ["INTERNASIONAL", "NASIONAL", "PROVINSI", "KABUPATEN", "SEKOLAH"];

function badgeFor(level: string): BadgeVariant {
  return LEVEL_VARIANT[level.toUpperCase()] ?? "primary";
}

function labelFor(key: string): string {
  if (key === "SEMUA") return "Semua";
  return key.charAt(0) + key.slice(1).toLowerCase();
}

export function PrestasiSection({ items }: { items: PrestasiItem[] }): JSX.Element {
  const [level, setLevel] = useState("SEMUA");

  const levels = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.level) set.add(item.level.toUpperCase());
    }
    return Array.from(set).sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
  }, [items]);

  const filtered = useMemo(
    () => (level === "SEMUA" ? items : items.filter((item) => item.level.toUpperCase() === level)),
    [items, level]
  );

  return (
    <div>
      {levels.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {["SEMUA", ...levels].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setLevel(key)}
              aria-pressed={level === key}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                level === key
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-border bg-card text-foreground hover:border-brand-primary hover:text-brand-primary"
              )}
            >
              {labelFor(key)}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Belum ada prestasi untuk level ini. Silakan pilih level lain.
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <StaggerItem key={item.title} className="h-full">
              <Card className="h-full transition-colors hover:border-brand-primary">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badgeFor(item.level)}>{item.level || "Umum"}</Badge>
                    {item.year ? <Badge variant="neutral">{item.year}</Badge> : null}
                  </div>
                  <p className="mt-3 font-semibold text-foreground">{item.title}</p>
                  {item.field ? (
                    <p className="mt-1 text-xs font-medium text-brand-secondary">{item.field}</p>
                  ) : null}
                  {item.description ? (
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  {item.coach ? (
                    <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                      Pembina: {item.coach}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}
