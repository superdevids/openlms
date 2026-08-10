"use client";

import { useState, type JSX } from "react";

import Link from "next/link";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  Skeleton,
  IconCheck,
  IconAcademic,
  IconBriefcase,
  IconGrade,
  toast
} from "@opensis/ui";
import { PageHeader, StatCard, StatGrid, StatusBadge, EmptyStateV3 } from "@/components/ui";

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

export default function PembimbingDashboardPage(): JSX.Element {
  const list = useApi<Internship[]>(
    (signal) => api.get<Internship[]>("/smk/internships/by-mentor", { signal }),
    [],
    { enabled: !DEMO_MODE }
  );

  const [journalsBy, setJournalsBy] = useState<Record<string, Journal[]>>({});
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [loadingJournals, setLoadingJournals] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<string | null>(null);

  const toggleInternship = async (internshipId: string): Promise<void> => {
    setOpenIds((o) => ({ ...o, [internshipId]: !o[internshipId] }));
    if (journalsBy[internshipId]) return;
    setLoadingJournals((l) => ({ ...l, [internshipId]: true }));
    try {
      const journals = await api.get<Journal[]>(`/smk/internships/${internshipId}/journals`);
      setJournalsBy((j) => ({ ...j, [internshipId]: journals }));
    } catch {
      toast({ variant: "error", title: "Gagal memuat jurnal siswa" });
    } finally {
      setLoadingJournals((l) => ({ ...l, [internshipId]: false }));
    }
  };

  const verifyJournal = async (journalId: string): Promise<void> => {
    setVerifying(journalId);
    try {
      const updated = await api.patch<Journal>(`/smk/journals/${journalId}/verify`);
      // Perbarui status jurnal di state tanpa refetch penuh.
      setJournalsBy((by) => {
        const next: Record<string, Journal[]> = {};
        for (const [key, journals] of Object.entries(by)) {
          next[key] = journals.map((j) => (j.id === journalId ? { ...j, ...updated } : j));
        }
        return next;
      });
      toast({ variant: "success", title: "Jurnal diverifikasi" });
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal verifikasi",
        description: err instanceof ApiError ? errorMessage(err) : undefined
      });
    } finally {
      setVerifying(null);
    }
  };

  const internships = DEMO_MODE && list.status !== "success" ? [] : (list.data ?? []);
  const pendingJournalCount = internships.reduce(
    (sum, it) => sum + (journalsBy[it.id] ?? []).filter((j) => !j.verified_by_mentor).length,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Beranda Pembimbing"
        description="Verifikasi jurnal harian siswa dan pantau progres PKL."
      />

      <StatGrid className="grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Siswa PKL Dibimbing"
          value={String(internships.length)}
          icon={<IconBriefcase className="h-5 w-5" />}
          hint="siswa aktif diampu"
        />
        <StatCard
          label="Log Aktivitas Minggu Ini"
          value="-"
          tone="info"
          icon={<IconGrade className="h-5 w-5" />}
          hint="data via jurnal siswa"
        />
        <StatCard
          label="Jurnal Perlu Review"
          value={String(pendingJournalCount)}
          tone="warning"
          icon={<IconAcademic className="h-5 w-5" />}
          hint="belum diverifikasi"
        />
      </StatGrid>

      <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
        <CardHeader>
          <CardTitle>Siswa PKL Bimbingan</CardTitle>
          <CardDescription>Verifikasi jurnal harian siswa dan pantau progres PKL.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.status === "loading" ? (
            <Skeleton className="h-48 w-full" />
          ) : list.status === "error" ? (
            <Alert variant="danger" className="text-sm">
              {list.error?.message ?? "Gagal memuat daftar siswa PKL."}
            </Alert>
          ) : internships.length === 0 ? (
            <EmptyStateV3
              icon={<IconBriefcase className="h-5 w-5" />}
              title="Belum ada siswa bimbingan"
              desc="Siswa PKL yang ditugaskan ke Anda akan tampil di sini."
            />
          ) : (
            <ul className="space-y-3">
              {internships.map((it) => {
                const journals = journalsBy[it.id] ?? [];
                const pending = journals.filter((j) => !j.verified_by_mentor).length;
                return (
                  <li key={it.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleInternship(it.id)}
                        className="text-left"
                      >
                        <p className="font-semibold text-foreground">
                          {it.student?.full_name ?? "Siswa"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(it.start_date)} — {fmtDate(it.end_date)}
                        </p>
                      </button>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={it.status === "COMPLETED" ? "SELESAI" : "AKTIF"}
                          label={it.status === "COMPLETED" ? "SELESAI" : "AKTIF"}
                          mapping={{ SELESAI: "success", AKTIF: "success" }}
                        />
                        <StatusBadge
                          status={pending > 0 ? "PENDING" : "SUCCESS"}
                          label={
                            pending > 0 ? `${pending} jurnal belum diverifikasi` : "Semua jurnal OK"
                          }
                          mapping={{ PENDING: "warning", SUCCESS: "success" }}
                        />
                      </div>
                    </div>

                    {openIds[it.id] ? (
                      <div className="mt-3 border-t border-border pt-3">
                        {loadingJournals[it.id] ? (
                          <Skeleton className="h-24 w-full" />
                        ) : journals.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Belum ada jurnal.</p>
                        ) : (
                          <ul className="space-y-2">
                            {journals.map((j) => (
                              <li
                                key={j.id}
                                className="flex items-start justify-between gap-3 rounded-md bg-app-surface-2 p-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {fmtDate(j.entry_date)}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {j.activity}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {j.verified_by_mentor ? (
                                    <StatusBadge
                                      status="TERVERIFIKASI"
                                      label="Terverifikasi"
                                      icon={<IconCheck className="h-3 w-3" />}
                                    />
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      loading={verifying === j.id}
                                      onClick={() => void verifyJournal(j.id)}
                                    >
                                      Verifikasi
                                    </Button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Alert variant="info" className="text-sm">
        Portofolio lengkap siswa dapat dilihat di{" "}
        <Link href="/pembimbing/siswa" className="font-medium underline">
          halaman Siswa PKL
        </Link>
        .
      </Alert>
    </div>
  );
}
