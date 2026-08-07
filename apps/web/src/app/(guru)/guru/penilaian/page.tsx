"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { toast } from "@/components/ui/toast";
import { DEMO_SUBMISSIONS } from "@/lib/demo";

interface Submission {
  id: string;
  student: string;
  submittedAt: string;
  score: number | null;
  feedback?: string;
  answer: string;
  question: string;
  key: string;
}

/** Grading esai side-by-side (07-ux §5.8): soal+kunci kiri, jawaban siswa kanan. */
export default function GuruPenilaianPage(): React.JSX.Element {
  const list = useApi<Submission[]>(() => api.get("/assignments"), [], {
    fallbackData: DEMO_SUBMISSIONS
  });
  const [index, setIndex] = React.useState(0);
  const [score, setScore] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submissions = (list.data ?? []).filter((s) => s.score === null);
  const current = submissions[index] ?? null;
  const total = submissions.length;

  const save = async (markLater: boolean): Promise<void> => {
    if (!current) return;
    setSaving(true);
    try {
      const payload = markLater ? { flagged: true } : { score: Number(score), feedback };
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({
          variant: "success",
          title: markLater ? "Ditandai periksa nanti" : `Nilai ${score} tersimpan (demo)`
        });
      } else {
        await api.patch(`/submissions/${current.id}/grade`, payload, {
          idempotencyKey: newIdempotencyKey("grade")
        });
        toast({
          variant: "success",
          title: markLater ? "Ditandai periksa nanti" : `Nilai ${score} tersimpan`
        });
      }
      if (index + 1 < total) setIndex(index + 1);
      setScore("");
      setFeedback("");
      list.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal menyimpan nilai" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Penilaian Esai</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Antrean penilaian"
      >
        {total === 0 ? (
          <EmptyState
            title="Tidak ada submission yang menunggu"
            description="Semua submission sudah dinilai."
          />
        ) : (
          <>
            <p className="text-sm text-neutral-600">
              Submission {index + 1} dari {total} (sisa {total - index - 1})
            </p>
            {current ? (
              <Card className="mt-2">
                <CardContent className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                        SOAL KUNCI
                      </p>
                      <p className="text-base font-medium text-neutral-900">{current.question}</p>
                      <p className="mt-2 text-sm text-neutral-700">
                        <span className="font-semibold">Kunci:</span> {current.key}
                      </p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                      <p className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                        JAWABAN SISWA — {current.student} ({formatTime(current.submittedAt)})
                      </p>
                      <p className="whitespace-pre-wrap text-base text-neutral-900">
                        {current.answer}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="grade-score">Skor (0–100)</Label>
                      <Input
                        id="grade-score"
                        type="number"
                        min={0}
                        max={100}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="85"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="grade-feedback">Feedback</Label>
                      <Textarea
                        id="grade-feedback"
                        rows={2}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Catatan untuk siswa..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => void save(true)} disabled={saving}>
                      Tandai periksa nanti
                    </Button>
                    <Button
                      onClick={() => void save(false)}
                      disabled={saving || score === "" || Number(score) < 0 || Number(score) > 100}
                      loading={saving}
                    >
                      Simpan &amp; Lanjut
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </DataView>
    </div>
  );
}
