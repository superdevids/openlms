"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@openlms/ui";

import { DEMO_CLASSES } from "@/lib/demo";

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  progress?: number;
}

export default function SiswaKelasPage(): React.JSX.Element {
  const list = useApi<ClassItem[]>(() => api.get("/classes"), [], { fallbackData: DEMO_CLASSES });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Kelas Saya</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar kelas"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada kelas"
            description="Kelas akan muncul setelah admin menambahkan Anda ke rombongan belajar."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(list.data ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/siswa/kelas/${c.id}`} className="block h-full">
                  <Card className="h-full transition-colors hover:border-primary-600">
                    <CardHeader>
                      <CardTitle>{c.name}</CardTitle>
                      <CardDescription>{c.subject}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-neutral-600">Guru: {c.teacher}</p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataView>
    </div>
  );
}
