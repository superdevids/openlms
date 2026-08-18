"use client";

import { useState, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  toast,
  IconGrade
} from "@opensis/ui";

import { formatTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";

import { DEMO_SUBMISSIONS } from "@/lib/demo";
import { PageHeader, StatusBadge, EmptyStateV3, RequiredLabel } from "@/components/ui";

interface PenilaianItem {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentInstructions: string | null;
  maxScore: number | null;
  subjectName: string | null;
  studentName: string;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  content: string | null;
  status: string;
}

interface AssignmentRow {
  id: string;
  title: string;
  instructions: string | null;
  max_score: number | null;
  class_subject?: {
    subject?: { name?: string };
  };
  _count?: { submissions: number };
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  content: string | null;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
  student: { id: string; full_name: string; username: string | null };
}

/** Grading esai side-by-side (07-ux §5.8): soal+kunci kiri, jawaban siswa kanan.
 *  Data nyata: GET /assignments → GET /assignments/:id/submissions per tugas;
 *  nilai via PATCH /submissions/:id/grade (kontrak docs/04 §2.2). */
export default function GuruPenilaianPage(): JSX.Element {
  const list = useApi<PenilaianItem[]>(
    async () => {
      const assignments = await api.get<AssignmentRow[]>("/assignments");
      const rows = await Promise.all(
        assignments.map(async (a) => {
          try {
            const subs = await api.get<SubmissionRow[]>(`/assignments/${a.id}/submissions`);
            return subs.map((s): PenilaianItem => ({
              id: s.id,
              assignmentId: a.id,
              assignmentTitle: a.title,
              assignmentInstructions: a.instructions ?? null,
              maxScore: a.max_score ?? null,
              subjectName: a.class_subject?.subject?.name ?? null,
              studentName: s.student?.full_name ?? s.student?.username ?? "(tanpa nama)",
              submittedAt: s.submitted_at ?? null,
              score: s.score,
              feedback: s.feedback,
              content: s.content,
              status: s.status
            }));
          } catch {
            return [];
          }
        })
      );
      return rows.flat();
    },
    [],
    {
      fallbackData: DEMO_SUBMISSIONS.map((d) => ({
        id: d.id,
        assignmentId: "demo",
        assignmentTitle: d.question,
        assignmentInstructions: d.key,
        maxScore: 100,
        subjectName: null,
        studentName: d.student,
        submittedAt: d.submittedAt,
        score: d.score,
        feedback: d.feedback ?? null,
        content: d.answer,
        status: "SUBMITTED"
      }))
    }
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const submissions = (list.data ?? []).filter(
    (s) => s.status !== "DRAFT" && s.score === null && s.status !== "GRADED"
  );
  const current = submissions[index] ?? null;
  const total = submissions.length;

  const save = async (markLater: boolean): Promise<void> => {
    if (!current) return;
    if (markLater) {
      // API tidak menyediakan flag "periksa nanti" — lewati ke submission berikutnya (lokal).
      if (index + 1 < total) setIndex(index + 1);
      setScore("");
      setFeedback("");
      toast({ variant: "info", title: "Dilewati (belum dinilai)" });
      return;
    }
    setSaving(true);
    try {
      const payload = { score: Number(score), feedback };
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({
          variant: "success",
          title: `Nilai ${score} tersimpan (demo)`
        });
      } else {
        await api.patch(`/submissions/${current.id}/grade`, payload, {
          idempotencyKey: newIdempotencyKey("grade")
        });
        toast({ variant: "success", title: `Nilai ${score} tersimpan` });
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
      <PageHeader
        title="Penilaian Esai"
        description="Periksa jawaban esai siswa satu per satu. Soal & kunci di kiri, jawaban siswa di kanan."
        meta={
          total > 0 ? (
            <StatusBadge
              status="MENUNGGU"
              mapping={{ MENUNGGU: "warning" }}
              label={`${total} menunggu`}
            />
          ) : undefined
        }
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Antrean penilaian"
      >
        {total === 0 ? (
          <EmptyStateV3
            icon={<IconGrade className="h-5 w-5" />}
            title="Tidak ada submission yang menunggu"
            desc="Semua submission sudah dinilai."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Submission {index + 1} dari {total} (sisa {total - index - 1})
            </p>
            {current ? (
              <Card className="mt-2 rounded-lg border-border bg-app-surface shadow-app-card">
                <CardContent className="space-y-4 p-5">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-border bg-app-surface-2/60 p-4">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        SOAL KUNCI — {current.assignmentTitle}
                        {current.subjectName ? ` · ${current.subjectName}` : ""}
                      </p>
                      <p className="text-base font-medium text-foreground">
                        {current.assignmentInstructions || "Tanpa instruksi"}
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        <span className="font-semibold">Skor maks:</span> {current.maxScore ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-app-surface-2/60 p-4">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        JAWABAN SISWA — {current.studentName}
                        {current.submittedAt ? ` (${formatTime(current.submittedAt)})` : ""}
                      </p>
                      <p className="whitespace-pre-wrap text-base text-foreground">
                        {current.content || "(tidak ada isi jawaban)"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <RequiredLabel htmlFor="grade-score">
                        Skor (0–{current.maxScore ?? 100})
                      </RequiredLabel>
                      <Input
                        id="grade-score"
                        type="number"
                        min={0}
                        max={current.maxScore ?? 100}
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
                      Lewati
                    </Button>
                    <Button
                      onClick={() => void save(false)}
                      disabled={
                        saving ||
                        score === "" ||
                        Number(score) < 0 ||
                        Number(score) > (current.maxScore ?? 100)
                      }
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
