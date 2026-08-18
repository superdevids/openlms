"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Button, Textarea, Dialog, toast } from "@opensis/ui";

import { formatRelative } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";

import { DEMO_TASKS } from "@/lib/demo";
import { errorMessage, ApiError, isFeatureDisabledError } from "@/lib/api-client";
import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  StatusBadge,
  type StatusTone,
  RequiredLabel
} from "@/components/ui";

interface Task {
  id: string;
  title: string;
  subject: string;
  dueAt: string;
  status: string;
}

const TASK_TONE: Record<string, StatusTone> = {
  BUKA: "warning",
  TERSUBMIT: "success",
  TERLAMBAT: "danger"
};

export default function SiswaTugasPage(): JSX.Element {
  const list = useApi<Task[]>(() => api.get("/assignments"), [], { fallbackData: DEMO_TASKS });
  const [openId, setOpenId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const open = list.data?.find((t) => t.id === openId) ?? null;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!open) return;
    setSubmitting(true);
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
      toast({
        variant: "error",
        title: "Gagal mengirim tugas",
        description:
          err instanceof ApiError && isFeatureDisabledError(err)
            ? "Fitur tugas sedang dinonaktifkan."
            : errorMessage(err)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<Task>[] = [
    {
      key: "title",
      label: "Judul",
      render: (t) => <span className="font-medium text-foreground">{t.title}</span>
    },
    {
      key: "subject",
      label: "Mapel",
      hideBelow: "md",
      render: (t) => <span className="text-muted-foreground">{t.subject}</span>
    },
    {
      key: "dueAt",
      label: "Tenggat",
      render: (t) => <span className="text-muted-foreground">{formatRelative(t.dueAt)}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (t) => <StatusBadge status={t.status} mapping={TASK_TONE} />
    },
    {
      key: "action",
      label: "Aksi",
      className: "text-right",
      render: (t) =>
        t.status === "BUKA" ? (
          <Button size="sm" onClick={() => setOpenId(t.id)}>
            Kerjakan
          </Button>
        ) : null
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tugas Saya"
        description="Tugas yang diberikan guru — kerjakan sebelum tenggat, jawaban dikirim sekali dan tidak dapat diubah."
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar tugas"
      >
        <DataTable<Task>
          columns={columns}
          rows={list.data ?? []}
          keyField="id"
          emptyTitle="Tidak ada tugas"
          emptyDesc="Tugas akan muncul setelah guru membuatnya."
        />
      </DataView>

      <Dialog
        open={open !== null}
        onOpenChange={(v) => {
          setOpenId(null);
          void v;
        }}
        title={open?.title ?? "Kerjakan Tugas"}
        description="Tulis jawaban Anda. Setelah dikirim, Anda tidak bisa mengubahnya (kecuali guru membuka kembali)."
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <RequiredLabel htmlFor="task-content">Jawaban</RequiredLabel>
            <Textarea
              id="task-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ketik jawaban atau catatan di sini..."
              required
            />
          </div>
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
