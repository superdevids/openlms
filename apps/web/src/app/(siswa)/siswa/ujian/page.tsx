"use client";

import { type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, Button, IconExam } from "@opensis/ui";

import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { DEMO_EXAMS } from "@/lib/demo";
import { PageHeader, StatusBadge, type StatusTone, EmptyStateV3 } from "@/components/ui";

interface Exam {
  id: string;
  title: string;
  subject: string;
  className: string;
  startsAt: string;
  endsAt: string;
  durationMinutes?: number;
  status: string;
}

const EXAM_TONE: Record<string, StatusTone> = {
  ONGOING: "info",
  SCHEDULED: "warning",
  ENDED: "neutral"
};

const EXAM_LABEL: Record<string, string> = {
  ONGOING: "Berlangsung",
  SCHEDULED: "Terjadwal",
  ENDED: "Selesai"
};

export default function SiswaUjianPage(): JSX.Element {
  const list = useApi<Exam[]>(() => api.get("/exam/list-for-student"), [], {
    fallbackData: DEMO_EXAMS
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ujian"
        description="Jadwal dan sesi ujian — masukkan token dari pengawas saat sesi dibuka."
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar ujian"
      >
        {list.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconExam className="h-5 w-5" />}
            title="Tidak ada ujian"
            desc="Ujian yang dijadwalkan akan tampil di sini."
          />
        ) : (
          <ul className="space-y-3">
            {(list.data ?? []).map((e) => {
              const canStart = e.status === "ONGOING" || e.status === "SCHEDULED";
              return (
                <li key={e.id}>
                  <Card className="rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:border-brand-primary/40">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <StatusBadge
                          status={e.status}
                          mapping={EXAM_TONE}
                          label={EXAM_LABEL[e.status] ?? e.status}
                          className="mb-2"
                        />
                        <p className="text-base font-semibold text-foreground">{e.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {e.subject} · {e.className} · {formatDateTime(e.startsAt)} –{" "}
                          {formatDateTime(e.endsAt)}
                        </p>
                      </div>
                      {canStart ? (
                        <Link href={`/siswa/ujian/${e.id}`}>
                          <Button size="sm">
                            {e.status === "ONGOING" ? "Masuk Sesi" : "Lihat Jadwal"}
                          </Button>
                        </Link>
                      ) : null}
                    </div>
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
