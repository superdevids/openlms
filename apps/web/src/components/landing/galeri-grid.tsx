"use client";

import { useMemo, useState, type JSX } from "react";

import { cn } from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import { LandingImage } from "@/components/landing/landing-image";
import type { GalleryImage } from "@/lib/landing-pages";

/**
 * Grid galeri + filter kategori (klien) untuk halaman /galeri mandiri.
 * Gambar dari CMS (/storage/...) bisa 404 — LandingImage menukar ke
 * placeholder lokal agar tidak ada gambar rusak (broken image).
 * Tile memakai pola ImageTile (D.6): rounded-2xl, ring, hover zoom, caption.
 */

const SHADOW_SOFT = "shadow-[0_8px_30px_rgba(67,56,202,0.1)]";

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
        <div
          className="flex flex-wrap justify-center gap-2"
          role="group"
          aria-label="Filter kategori galeri"
        >
          {["SEMUA", ...categories].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                category === key
                  ? cn("border-brand-primary bg-brand-primary text-white", SHADOW_SOFT)
                  : "border-border bg-card text-foreground hover:border-brand-primary hover:text-brand-primary"
              )}
            >
              {key === "SEMUA" ? "Semua" : key}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div
          className={cn(
            "mt-8 rounded-[1.5rem] border border-dashed border-border bg-card px-6 py-12 text-center",
            SHADOW_SOFT
          )}
        >
          <img
            src="/landing/playful/play-gallery.svg"
            alt=""
            aria-hidden="true"
            className="mx-auto h-16 w-20 opacity-80"
          />
          <p className="mt-4 font-semibold text-foreground">Belum ada foto di kategori ini</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih kategori lain atau kembali lagi nanti.
          </p>
        </div>
      ) : (
        <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {filtered.map((item) => {
            const tanggal = formatTanggal(item.date);
            return (
              <FadeInUp key={item.title || item.src} className="mb-4 break-inside-avoid">
                <figure
                  className={cn(
                    "group relative overflow-hidden rounded-2xl ring-1 ring-border",
                    SHADOW_SOFT
                  )}
                >
                  <LandingImage
                    src={item.src}
                    alt={item.title}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-10">
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    {item.category || tanggal ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {item.category ? (
                          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                            {item.category}
                          </span>
                        ) : null}
                        {tanggal ? <span className="text-xs text-white/85">{tanggal}</span> : null}
                      </div>
                    ) : null}
                  </figcaption>
                </figure>
              </FadeInUp>
            );
          })}
        </div>
      )}
    </div>
  );
}
