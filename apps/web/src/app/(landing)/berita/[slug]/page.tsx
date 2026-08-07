import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, CardContent } from "@openlms/ui";
import { API_BASE_FALLBACK, API_TIMEOUT_MS, APP_NAME } from "@/lib/constants";

/** Detail berita — GET /public/landing/berita/:slug (publik). */

export const dynamic = "force-dynamic";

interface NewsDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
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

async function fetchBerita(slug: string): Promise<NewsDetail | "not-found" | "offline"> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(landingApiUrl(`/public/landing/berita/${encodeURIComponent(slug)}`), {
      cache: "no-store",
      signal: controller.signal
    });
    if (res.status === 404) return "not-found";
    if (!res.ok) throw new Error(`berita ${res.status}`);
    return (await res.json()) as NewsDetail;
  } catch {
    return "offline";
  } finally {
    clearTimeout(timeout);
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const berita = await fetchBerita(slug);
  if (typeof berita === "string") {
    return { title: `Berita — ${APP_NAME}` };
  }
  return {
    title: `${berita.title} — ${APP_NAME}`,
    description: berita.excerpt ?? berita.body.slice(0, 160)
  };
}

export default async function BeritaDetailPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const berita = await fetchBerita(slug);

  if (berita === "not-found") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/berita">
        <Button variant="outline" size="sm">
          ← Semua Berita
        </Button>
      </Link>

      {berita === "offline" ? (
        <Card className="mt-8">
          <CardContent className="p-6 text-sm text-neutral-500">
            Tidak dapat memuat berita saat ini. Periksa koneksi Anda dan coba lagi nanti.
          </CardContent>
        </Card>
      ) : (
        <article className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="neutral">{formatTanggal(berita.publishedAt)}</Badge>
            {berita.author ? (
              <span className="text-sm text-neutral-500">oleh {berita.author}</span>
            ) : null}
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-neutral-900">{berita.title}</h1>
          {berita.excerpt ? (
            <p className="mt-4 text-lg font-medium text-brand-secondary">{berita.excerpt}</p>
          ) : null}
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="whitespace-pre-line leading-relaxed text-neutral-800">{berita.body}</p>
          </div>
          <div className="mt-10 rounded-2xl bg-brand-primary p-6 text-white sm:p-8">
            <h2 className="text-xl font-bold">Tertarik bergabung?</h2>
            <p className="mt-2 text-white/90">
              Akses materi, tugas, ujian, dan informasi akademik melalui aplikasi sekolah.
            </p>
            <div className="mt-4">
              <Link href="/login">
                <Button className="bg-white text-brand-primary hover:bg-neutral-100">
                  Masuk ke Aplikasi
                </Button>
              </Link>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
