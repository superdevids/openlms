"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button, Input, Label, Textarea, Badge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import { DEMO_TASKS } from "@/lib/demo";

interface Task {
  id: string;
  title: string;
  subject: string;
  dueAt: string;
  status: string;
}

export default function GuruTugasPage(): React.JSX.Element {
  const list = useApi<Task[]>(() => api.get("/assignments"), [], { fallbackData: DEMO_TASKS });
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const create = async (e: React.FormEvent): Promise<void> => {
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
        <h1 className="text-2xl font-bold text-neutral-900">Tugas</h1>
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
                      <span className="block truncate font-medium text-neutral-900">{t.title}</span>
                      <span className="block text-sm text-neutral-600">
                        {t.subject} · Tenggat {formatRelative(t.dueAt)}
                      </span>
                    </span>
                    <Badge variant={t.status === "TERLAMBAT" ? "danger" : "primary"}>
                      {t.status}
                    </Badge>
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
