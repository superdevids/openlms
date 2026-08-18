"use client";

import { useState, type JSX } from "react";

import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Alert,
  Skeleton,
  toast,
  IconCalendar,
  IconCheck,
  IconClock
} from "@opensis/ui";
import {
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  EmptyStateV3,
  RequiredLabel
} from "@/components/ui";

interface RubricItem {
  id: string;
  criterion: string;
  max_score: number;
  score: number | null;
}

interface CompetencyTest {
  id: string;
  title: string;
  competency_standard: string;
  scheduled_at: string | null;
  status: string;
  final_score: number | null;
  student: { id: string; full_name: string } | null;
  rubric_items: RubricItem[];
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "Jadwal belum ditetapkan";
  try {
    return new Date(value).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

export default function PengujiDashboardPage(): JSX.Element {
  const list = useApi<CompetencyTest[]>(
    (signal) => api.get<CompetencyTest[]>("/smk/competency-tests/by-examiner", { signal }),
    [],
    { enabled: !DEMO_MODE }
  );

  // Score draft per test per rubrik item.
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const setScore = (testId: string, itemId: string, value: string): void => {
    setScores((s) => ({ ...s, [testId]: { ...(s[testId] ?? {}), [itemId]: value } }));
  };

  const submitGrade = async (test: CompetencyTest): Promise<void> => {
    const items = Object.entries(scores[test.id] ?? {})
      .map(([rubricItemId, value]) => ({ rubricItemId, score: Number(value) }))
      .filter((item) => !Number.isNaN(item.score));
    if (items.length === 0) {
      toast({ variant: "warning", title: "Isi skor rubrik terlebih dahulu" });
      return;
    }
    setSaving((s) => ({ ...s, [test.id]: true }));
    try {
      await api.post(`/smk/competency-tests/${test.id}/grade`, { items });
      toast({ variant: "success", title: "Penilaian UKK tersimpan" });
      setScores((s) => ({ ...s, [test.id]: {} }));
      list.refetch();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan penilaian",
        description: err instanceof ApiError ? errorMessage(err) : undefined
      });
    } finally {
      setSaving((s) => ({ ...s, [test.id]: false }));
    }
  };

  const tests = DEMO_MODE && list.status !== "success" ? [] : (list.data ?? []);
  const active = tests.filter((t) => t.status === "SCHEDULED");
  const graded = tests.filter((t) => t.status !== "SCHEDULED");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Beranda Penguji"
        description="Sesi uji kompetensi (UKK) yang ditugaskan kepada Anda."
      />

      <StatGrid className="grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Sesi Hari Ini"
          value={String(active.length)}
          icon={<IconClock className="h-5 w-5" />}
          hint="menunggu penilaian"
        />
        <StatCard
          label="Total Sesi"
          value={String(tests.length)}
          tone="info"
          icon={<IconCalendar className="h-5 w-5" />}
          hint="seluruh penugasan"
        />
        <StatCard
          label="Sesi Selesai"
          value={String(graded.length)}
          tone="success"
          icon={<IconCheck className="h-5 w-5" />}
          hint="sudah dinilai"
        />
      </StatGrid>

      {list.status === "loading" ? (
        <Skeleton className="h-48 w-full" />
      ) : list.status === "error" ? (
        <Alert variant="danger" className="text-sm">
          {list.error?.message ?? "Gagal memuat jadwal UKK."}
        </Alert>
      ) : tests.length === 0 ? (
        <EmptyStateV3
          icon={<IconCalendar className="h-5 w-5" />}
          title="Belum ada UKK ditugaskan"
          desc="Jadwal UKK yang ditugaskan ke Anda akan tampil di sini."
        />
      ) : (
        <>
          <section aria-label="Jadwal UKK aktif">
            <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
              Menunggu Penilaian
            </h2>
            <div className="space-y-4">
              {active.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada UKK yang menunggu penilaian.
                </p>
              ) : (
                active.map((test) => (
                  <Card
                    key={test.id}
                    className="rounded-lg border-l-2 border-brand-primary bg-app-surface shadow-app-card"
                  >
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle>{test.title}</CardTitle>
                          <CardDescription>
                            {test.student?.full_name ?? "Siswa"} · {fmtDate(test.scheduled_at)}
                          </CardDescription>
                        </div>
                        <StatusBadge status="DIPROSES" label={test.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {test.rubric_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {item.criterion}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Skor maksimal {item.max_score}
                                {item.score !== null ? ` · sudah dinilai ${item.score}` : ""}
                              </p>
                            </div>
                            <div className="w-24 shrink-0">
                              <RequiredLabel htmlFor={`score-${item.id}`} className="sr-only">
                                Skor {item.criterion}
                              </RequiredLabel>
                              <Input
                                id={`score-${item.id}`}
                                type="number"
                                min={0}
                                max={item.max_score}
                                value={scores[test.id]?.[item.id] ?? ""}
                                onChange={(e) => setScore(test.id, item.id, e.target.value)}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          loading={saving[test.id]}
                          disabled={saving[test.id]}
                          onClick={() => void submitGrade(test)}
                        >
                          Simpan Penilaian
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          {graded.length > 0 ? (
            <section aria-label="UKK sudah dinilai">
              <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
                Riwayat Penilaian
              </h2>
              <div className="space-y-2">
                {graded.map((test) => (
                  <div
                    key={test.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{test.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {test.student?.full_name ?? "Siswa"}
                      </p>
                    </div>
                    <StatusBadge
                      status={test.status === "PASSED" ? "LULUS" : "DONE"}
                      label={
                        test.final_score !== null
                          ? `Skor ${test.final_score}`
                          : test.status === "PASSED"
                            ? "LULUS"
                            : "SELESAI"
                      }
                      mapping={{ LULUS: "success", DONE: "success", SELESAI: "success" }}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
