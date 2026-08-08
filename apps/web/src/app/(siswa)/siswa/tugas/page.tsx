"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  Badge,
  Button,
  Textarea,
  Label,
  Alert,
  Dialog,
  EmptyState,
  toast
} from "@opensis/ui";

import { formatRelative } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";

import { DEMO_TASKS } from "@/lib/demo";
import { errorMessage, ApiError, isFeatureDisabledError } from "@/lib/api-client";

interface Task {
  id: string;
  title: string;
  subject: string;
  dueAt: string;
  status: string;
}

export default function SiswaTugasPage(): JSX.Element {
  const list = useApi<Task[]>(() => api.get("/assignments"), [], { fallbackData: DEMO_TASKS });
  const [openId, setOpenId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const open = list.data?.find((t) => t.id === openId) ?? null;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!open) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(
        `/assignments/${open.id}/submissions`,
        { content },
        { idempotencyKey: newIdempotencyKey("sub") }
      );
      toast({ variant: "success", title: "Tugas terkirim" });
      setOpenId(null);
      list.refetch();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && isFeatureDisabledError(err)
          ? "Fitur tugas sedang dinonaktifkan."
          : errorMessage(err)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Tugas Saya</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar tugas"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Tidak ada tugas"
            description="Tugas akan muncul setelah guru membuatnya."
          />
        ) : (
          <ul className="space-y-2">
            {(list.data ?? []).map((t) => (
              <li key={t.id}>
                <Card>
                  <CardContent className="flex min-h-14 items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{t.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {t.subject} · Tenggat {formatRelative(t.dueAt)}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={
                          t.status === "TERLAMBAT"
                            ? "danger"
                            : t.status === "TERSUBMIT"
                              ? "success"
                              : "primary"
                        }
                      >
                        {t.status}
                      </Badge>
                      {t.status === "BUKA" ? (
                        <Button size="sm" onClick={() => setOpenId(t.id)}>
                          Kerjakan
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </DataView>

      <Dialog
        open={open !== null}
        onOpenChange={(v) => {
          setOpenId(null);
          setSubmitError(null);
          void v;
        }}
        title={open?.title ?? "Kerjakan Tugas"}
        description="Tulis jawaban Anda. Setelah dikirim, Anda tidak bisa mengubahnya (kecuali guru membuka kembali)."
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-content">Jawaban</Label>
            <Textarea
              id="task-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ketik jawaban atau catatan di sini..."
              required
            />
          </div>
          {submitError ? (
            <div role="alert">
              <Alert variant="danger" className="text-sm">
                {submitError}
              </Alert>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenId(null)}>
              Batal
            </Button>
            <Button type="submit" loading={submitting}>
              Kirim Tugas
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
