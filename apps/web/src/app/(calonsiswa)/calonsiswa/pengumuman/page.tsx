"use client";

import { type JSX } from "react";

import Link from "next/link";
import { useApi } from "@/lib/use-api";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, IconFile } from "@opensis/ui";
import { NewsItem } from "@/lib/constants";

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
      <h1 className="text-2xl font-bold text-foreground">Pengumuman</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pengumuman Sekolah</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              title="Belum ada pengumuman"
              description="Pengumuman akan tampil saat sekolah menerbitkan berita."
            />
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/berita/${n.slug}`}
                    className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted"
                  >
                    <IconFile className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{n.title}</span>
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
