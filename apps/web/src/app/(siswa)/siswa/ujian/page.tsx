"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { DEMO_EXAMS } from "@/lib/demo";

interface Exam {
  id: string;
  title: string;
  subject: string;
  className: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

export default function SiswaUjianPage(): React.JSX.Element {
  const list = useApi<Exam[]>(() => api.get("/exams"), [], { fallbackData: DEMO_EXAMS });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Ujian</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar ujian"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Tidak ada ujian"
            description="Ujian yang dijadwalkan akan tampil di sini."
          />
        ) : (
          <ul className="space-y-3">
            {(list.data ?? []).map((e) => {
              const canStart = e.status === "ONGOING" || e.status === "SCHEDULED";
              return (
                <li key={e.id}>
                  <Card>
                    <CardHeader>
                      <Badge
                        variant={
                          e.status === "ONGOING"
                            ? "success"
                            : e.status === "ENDED"
                              ? "neutral"
                              : "primary"
                        }
                        className="w-fit"
                      >
                        {e.status === "ONGOING"
                          ? "Berlangsung"
                          : e.status === "ENDED"
                            ? "Selesai"
                            : "Terjadwal"}
                      </Badge>
                      <CardTitle>{e.title}</CardTitle>
                      <CardDescription>
                        {e.subject} · {e.className} · {formatDateTime(e.startsAt)} –{" "}
                        {formatDateTime(e.endsAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {canStart ? (
                        <Link href={`/siswa/ujian/${e.id}`}>
                          <Button>{e.status === "ONGOING" ? "Masuk Sesi" : "Lihat Jadwal"}</Button>
                        </Link>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </DataView>
    </div>
  );
}
