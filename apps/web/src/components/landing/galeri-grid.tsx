"use client";

import { useMemo, useState, type JSX } from "react";

import { Card, CardContent, cn } from "@opensis/ui";
import { StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { LandingImage } from "@/components/landing/landing-image";
import type { GalleryImage } from "@/lib/landing-pages";

/**
 * Grid galeri + filter kategori (klien) untuk halaman /galeri mandiri.
 * Gambar dari CMS (/storage/...) bisa 404 — LandingImage menukar ke
 * placeholder lokal agar tidak ada gambar rusak (broken image).
 */

function formatTanggal(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}

export function GaleriGrid({ images }: { images: GalleryImage[] }): JSX.Element {
  const [category, setCategory] = useState("SEMUA");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of images) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [images]);

  const filtered = useMemo(
    () => (category === "SEMUA" ? images : images.filter((item) => item.category === category)),
    [images, category]
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
            Belum ada foto yang diterbitkan. Silakan kembali lagi nanti.
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const tanggal = formatTanggal(item.date);
            return (
              <StaggerItem key={item.title || item.src} className="h-full">
                <Card className="h-full overflow-hidden">
                  <LandingImage
                    src={item.src}
                    alt={item.title}
                    fallbackText={item.title}
                    className="h-48 w-full rounded-t-xl object-cover px-4 text-sm font-medium"
                  />
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.category || tanggal ? (
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        {item.category ? (
                          <span className="text-xs text-brand-secondary">{item.category}</span>
                        ) : null}
                        {tanggal ? (
                          <span className="text-xs text-muted-foreground">{tanggal}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
