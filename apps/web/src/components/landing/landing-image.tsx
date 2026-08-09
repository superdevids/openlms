"use client";

import { useState, type JSX } from "react";

import { cn } from "@opensis/ui";

/**
 * Gambar landing dengan fallback aman — bila `src` kosong, gagal dimuat
 * (404), atau diblokir CSP (img-src 'self' data:), render placeholder
 * bertuliskan teks sebagai pengganti, bukan ikon gambar rusak.
 * Konvensi halaman landing memakai <img> biasa (bukan next/image).
 */
export function LandingImage({
  src,
  alt,
  className,
  fallbackText
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackText?: string;
}): JSX.Element {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-muted text-4xl font-bold text-brand-primary/40",
          className
        )}
      >
        {fallbackText ?? alt.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
  );
}
