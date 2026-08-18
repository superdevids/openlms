"use client";

import { useState, type JSX } from "react";

import { cn } from "@opensis/ui";
import { LANDING_SCHOOL_IMAGES } from "@/lib/constants";

/**
 * Gambar landing dengan fallback foto nyata — bila `src` kosong, gagal
 * dimuat (404), atau diblokir CSP (img-src 'self' data:), render foto
 * placeholder sekolah (item 16: gambar asli /landing/school/*.jpg) sebagai
 * pengganti; bila foto placeholder pun gagal, render placeholder teks.
 * Konvensi halaman landing memakai <img> biasa (bukan next/image) —
 * width/height wajib diisi caller untuk mencegah CLS.
 */

export function LandingImage({
  src,
  alt,
  className,
  fallbackSrc = LANDING_SCHOOL_IMAGES.hero,
  width,
  height,
  loading = "lazy",
  fallbackText
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Foto pengganti bila src kosong/gagal — default hero.jpg (item 16). */
  fallbackSrc?: string;
  /** Dimensi intrinsik untuk mencegah CLS (opsional; disarankan selalu diisi). */
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  fallbackText?: string;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // Semua cadangan gagal → placeholder teks (aksesibel, bukan ikon rusak).
  if ((!src || failed) && fallbackFailed) {
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

  if (!src || failed) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={className}
        onError={() => setFallbackFailed(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
