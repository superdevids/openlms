"use client";

import { useMemo, useState, type JSX } from "react";
import { Card, CardContent, IconCamera, cn } from "@opensis/ui";
import { StaggerContainer, StaggerItem } from "@/components/landing/motion";

/**
 * Grid galeri + filter kategori (klien).
 * Gambar dari CMS (/storage/...) bisa 404 — onError menukar ke placeholder
 * lokal (kotak gradien + ikon kamera + judul) agar tidak ada gambar rusak.
 */

export interface GaleriItem {
  title: string;
  src: string;
  category: string;
  dateLabel: string;
}

function GaleriImage({ item }: { item: GaleriItem }): JSX.Element {
  const [failed, setFailed] = useState(false);
  if (failed || !item.src) {
    return (
      <div className="flex h-48 items-center justify-center rounded-t-xl bg-gradient-to-br from-brand-primary/15 via-brand-accent/10 to-brand-secondary/20">
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <IconCamera className="h-8 w-8 text-brand-primary/60" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground">{item.title}</span>
        </div>
      </div>
    );
  }
  return (
    <img
      src={item.src}
      alt={item.title}
      onError={() => setFailed(true)}
      loading="lazy"
      className="h-48 w-full rounded-t-xl object-cover"
    />
  );
}

export function GaleriSection({ items }: { items: GaleriItem[] }): JSX.Element {
  const [category, setCategory] = useState("SEMUA");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(
    () => (category === "SEMUA" ? items : items.filter((item) => item.category === category)),
    [items, category]
  );

  return (
    <div>
      {categories.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {["SEMUA", ...categories].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                category === key
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-border bg-card text-foreground hover:border-brand-primary hover:text-brand-primary"
              )}
            >
              {key === "SEMUA" ? "Semua" : key}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Belum ada foto untuk kategori ini. Silakan pilih kategori lain.
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <StaggerItem key={item.title} className="h-full">
              <Card className="h-full">
                <GaleriImage item={item} />
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.category || item.dateLabel ? (
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {item.category ? (
                        <span className="text-xs text-brand-secondary">{item.category}</span>
                      ) : null}
                      {item.dateLabel ? (
                        <span className="text-xs text-muted-foreground">{item.dateLabel}</span>
                      ) : null}
                    </div>
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
