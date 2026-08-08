import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@opensis/ui";
import { API_BASE_FALLBACK, API_TIMEOUT_MS, APP_NAME } from "@/lib/constants";

/**
 * Daftar berita sekolah — GET /public/landing/berita (publik).
 * ISR 30s — konten berubah hanya via superadmin.
 */

export const revalidate = 30;

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImagePath: string | null;
  author: string | null;
  publishedAt: string | null;
}

function landingApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? API_BASE_FALLBACK).replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) return `${base}${path}`;
  return `${base}/api/v1${path}`;
}

function formatTanggal(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}

async function fetchBerita(): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(landingApiUrl("/public/landing/berita"), {
        next: { revalidate: 30 },
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`berita ${res.status}`);
      return (await res.json()) as NewsItem[];
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: `Berita — ${APP_NAME}`,
  description: "Kabar dan pengumuman terbaru dari sekolah."
};

export default async function BeritaPage(): Promise<JSX.Element> {
  const berita = await fetchBerita();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Badge variant="primary">Berita</Badge>
      <h1 className="mt-3 text-3xl font-bold text-foreground">Kabar Sekolah</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Informasi dan pengumuman terbaru dari sekolah.
      </p>

      {berita.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Belum ada berita yang diterbitkan. Silakan kembali lagi nanti.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {berita.map((item) => (
            <Link key={item.id} href={`/berita/${item.slug}`} className="block">
              <Card className="h-full transition-colors hover:border-brand-primary">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="neutral">{formatTanggal(item.publishedAt)}</Badge>
                    {item.author ? (
                      <span className="text-xs text-muted-foreground">{item.author}</span>
                    ) : null}
                  </div>
                  <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                  {item.excerpt ? (
                    <CardDescription className="line-clamp-3">{item.excerpt}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-semibold text-brand-primary">
                    Baca selengkapnya
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10">
        <Link href="/">
          <Button variant="outline" size="sm">
            ← Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
