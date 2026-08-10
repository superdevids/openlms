"use client";

import { type JSX } from "react";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { Card, CardContent, CardHeader, CardTitle, IconFile } from "@opensis/ui";
import { NewsItem } from "@/lib/constants";
import { PageHeader, EmptyStateV3, StatusBadge } from "@/components/ui";

/** Pengumuman (berita sekolah) untuk CALON_SISWA — GET /public/landing/berita. */
export default function CalonSiswaPengumumanPage(): JSX.Element {
  const berita = useApi<NewsItem[]>(
    (signal) =>
      fetch("/api/v1/public/landing/berita", { signal })
        .then((res) => (res.ok ? (res.json() as Promise<NewsItem[]>) : []))
        .catch(() => []),
    []
  );

  const items = berita.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengumuman"
        description="Informasi dan pengumuman resmi dari sekolah untuk calon siswa."
      />
      <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
        <CardHeader>
          <CardTitle>Pengumuman Sekolah</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyStateV3
              icon={<IconFile className="h-5 w-5" />}
              title="Belum ada pengumuman"
              desc="Pengumuman akan tampil saat sekolah menerbitkan berita."
            />
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/berita/${n.slug}`}
                    className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted"
                  >
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                      aria-hidden="true"
                    >
                      <IconFile className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="block text-sm font-semibold text-foreground">
                          {n.title}
                        </span>
                        <StatusBadge status="BARU" mapping={{ BARU: "info" }} />
                      </span>
                      {n.excerpt ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                          {n.excerpt}
                        </span>
                      ) : null}
                      {n.publishedAt ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {new Date(n.publishedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
