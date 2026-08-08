"use client";

import { useState, type FormEvent, type JSX } from "react";

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
  Badge,
  Dialog,
  EmptyState,
  toast
} from "@opensis/ui";

import { formatRelative } from "@/lib/format";
import { TASK_STATUS_BADGE } from "@/lib/constants";

import { DEMO_TASKS } from "@/lib/demo";

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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Tugas</h1>
        <Button onClick={() => setOpen(true)}>Buat Tugas</Button>
      </div>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar tugas"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada tugas"
            description="Buat tugas pertama untuk kelas Anda."
            action={<Button onClick={() => setOpen(true)}>Buat Tugas</Button>}
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
                    <Badge variant={TASK_STATUS_BADGE[t.status] ?? "primary"}>{t.status}</Badge>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
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
