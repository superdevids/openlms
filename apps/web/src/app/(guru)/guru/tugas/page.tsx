"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  toast,
  IconClipboard
} from "@opensis/ui";

import { formatRelative } from "@/lib/format";

import { DEMO_TASKS } from "@/lib/demo";
import { PageHeader, DataTable, StatusBadge } from "@/components/ui";

interface Task {
  id: string;
  title: string;
  subject: string;
  dueAt: string;
  status: string;
}

export default function GuruTugasPage(): JSX.Element {
  const list = useApi<Task[]>(() => api.get("/assignments"), [], { fallbackData: DEMO_TASKS });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({ variant: "success", title: "Tugas dibuat (demo)" });
      } else {
        await api.post("/assignments", {
          title,
          instructions,
          dueAt: new Date(dueAt).toISOString(),
          maxScore: 100,
          allowLate: false
        });
        toast({ variant: "success", title: "Tugas dibuat" });
      }
      setOpen(false);
      setTitle("");
      setInstructions("");
      setDueAt("");
      list.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal membuat tugas" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tugas"
        description="Buat dan pantau tugas untuk kelas yang Anda ampu."
        actions={
          <Button onClick={() => setOpen(true)} size="sm">
            Buat Tugas
          </Button>
        }
      />

      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar tugas"
      >
        <DataTable
          keyField="id"
          columns={[
            {
              key: "title",
              label: "Judul",
              render: (t) => (
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary"
                    aria-hidden="true"
                  >
                    <IconClipboard className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate">{t.title}</span>
                </span>
              )
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
              render: (t) => (
                <span className="text-muted-foreground">{formatRelative(t.dueAt)}</span>
              )
            },
            {
              key: "status",
              label: "Status",
              render: (t) => (
                <StatusBadge
                  status={t.status}
                  mapping={{
                    BUKA: "success",
                    TERSUBMIT: "info",
                    DINILAI: "success",
                    TERLAMBAT: "danger"
                  }}
                />
              )
            }
          ]}
          rows={list.data ?? []}
          emptyTitle="Belum ada tugas"
          emptyDesc="Buat tugas pertama untuk kelas Anda."
          emptyAction={
            <Button size="sm" onClick={() => setOpen(true)}>
              Buat Tugas
            </Button>
          }
        />
      </DataView>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Buat Tugas"
        description="Setelah terbit, status tugas Buka/Tutup otomatis saat deadline."
      >
        <form onSubmit={(e) => void create(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="asg-title">Judul Tugas</Label>
            <Input
              id="asg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Tugas 1: Persamaan Kuadrat"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asg-instr">Instruksi</Label>
            <Textarea
              id="asg-instr"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Kerjakan soal di buku lalu upload foto."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asg-due">Tenggat Waktu</Label>
            <Input
              id="asg-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Terbitkan
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
