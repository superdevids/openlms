"use client";

import { useCallback, useEffect, useState, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Skeleton,
  IconFile,
  IconBriefcase
} from "@opensis/ui";
import { PageHeader, StatusBadge, EmptyStateV3 } from "@/components/ui";

interface Internship {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  student: { id: string; full_name: string } | null;
}

interface Journal {
  id: string;
  entry_date: string;
  activity: string;
  note: string | null;
  verified_by_mentor: boolean;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return value;
  }
}

export default function PembimbingSiswaPage(): JSX.Element {
  const list = useApi<Internship[]>(
    (signal) => api.get<Internship[]>("/smk/internships/by-mentor", { signal }),
    [],
    { enabled: !DEMO_MODE }
  );
  const [journalsBy, setJournalsBy] = useState<Record<string, Journal[]>>({});

  const loadJournals = useCallback(
    async (internshipId: string): Promise<void> => {
      if (journalsBy[internshipId]) return;
      try {
        const journals = await api.get<Journal[]>(`/smk/internships/${internshipId}/journals`);
        setJournalsBy((j) => ({ ...j, [internshipId]: journals }));
      } catch {
        setJournalsBy((j) => ({ ...j, [internshipId]: [] }));
      }
    },
    [journalsBy]
  );

  useEffect(() => {
    if (list.status !== "success") return;
    for (const it of list.data ?? []) {
      void loadJournals(it.id);
    }
  }, [list.status, list.data, loadJournals]);

  const internships = DEMO_MODE && list.status !== "success" ? [] : (list.data ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Siswa PKL & Portofolio"
        description="Portofolio jurnal harian siswa yang Anda bimbing di industri."
      />

      {list.status === "loading" ? (
        <Skeleton className="h-48 w-full" />
      ) : list.status === "error" ? (
        <Alert variant="danger" className="text-sm">
          {list.error?.message ?? "Gagal memuat data siswa."}
        </Alert>
      ) : internships.length === 0 ? (
        <EmptyStateV3
          icon={<IconBriefcase className="h-5 w-5" />}
          title="Belum ada siswa bimbingan"
          desc="Siswa PKL yang ditugaskan ke Anda akan tampil di sini."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {internships.map((it) => {
            const journals = journalsBy[it.id] ?? [];
            const verified = journals.filter((j) => j.verified_by_mentor).length;
            const total = journals.length;
            return (
              <Card key={it.id} className="rounded-lg border-border bg-app-surface shadow-app-card">
                <CardHeader>
                  <CardTitle>{it.student?.full_name ?? "Siswa"}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      status="AKTIF"
                      label={`${fmtDate(it.start_date)} — ${fmtDate(it.end_date)}`}
                      mapping={{ AKTIF: "neutral" }}
                    />
                    <StatusBadge
                      status={it.status === "COMPLETED" ? "SELESAI" : "AKTIF"}
                      mapping={{ SELESAI: "success", AKTIF: "success" }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Portofolio jurnal: {verified}/{total} terverifikasi
                  </p>
                  {total === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada jurnal.</p>
                  ) : (
                    <ul className="space-y-2">
                      {journals.slice(0, 10).map((j) => (
                        <li
                          key={j.id}
                          className="flex items-start gap-2 rounded-md border border-border p-2"
                        >
                          <IconFile className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>
                            <span className="block text-xs font-medium text-foreground">
                              {fmtDate(j.entry_date)}
                              {j.verified_by_mentor ? " · terverifikasi" : " · belum diverifikasi"}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                              {j.activity}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
