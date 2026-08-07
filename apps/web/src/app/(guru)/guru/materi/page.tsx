"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button, Input, Label, Select, Textarea, Alert } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/format";
import { toast } from "@/components/ui/toast";

interface Material {
  id: string;
  title: string;
  kind: "FILE" | "VIDEO" | "LINK";
  updatedAt: string;
}

export default function GuruMateriPage(): React.JSX.Element {
  const list = useApi<Material[]>(() => api.get("/materials"), [], {
    fallbackData: [
      { id: "mat_1", title: "Bab 4 Vektor", kind: "FILE", updatedAt: new Date().toISOString() },
      {
        id: "mat_2",
        title: "Video Persamaan Garis",
        kind: "VIDEO",
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: "mat_3",
        title: "Modul PDF Trigonometri",
        kind: "LINK",
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ]
  });
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [kind, setKind] = React.useState<"FILE" | "VIDEO" | "LINK">("FILE");
  const [content, setContent] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({ variant: "success", title: "Materi ditambahkan (demo)" });
      } else {
        await api.post("/materials", { title, kind, content });
        toast({ variant: "success", title: "Materi ditambahkan" });
      }
      setOpen(false);
      setTitle("");
      setContent("");
      list.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal menambahkan materi" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Materi</h1>
        <Button onClick={() => setOpen(true)}>Tambah Materi</Button>
      </div>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar materi"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada materi"
            description="Unggah materi pertama untuk siswa."
            action={<Button onClick={() => setOpen(true)}>Tambah Materi</Button>}
          />
        ) : (
          <ul className="space-y-2">
            {(list.data ?? []).map((m) => (
              <li key={m.id}>
                <Card>
                  <CardContent className="flex min-h-14 items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-neutral-900">{m.title}</span>
                      <span className="block text-sm text-neutral-600">
                        {m.kind === "FILE" ? "Dokumen" : m.kind === "VIDEO" ? "Video" : "Tautan"} ·{" "}
                        {formatRelative(m.updatedAt)}
                      </span>
                    </span>
                    <Badge variant="primary">{m.kind}</Badge>
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
        title="Tambah Materi"
        description="Judul otomatis dari nama file (dapat diedit). File besar >10MB disarankan dikompres."
      >
        <form onSubmit={(e) => void create(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mat-title">Judul Materi</Label>
            <Input
              id="mat-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Bab 4 Vektor"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mat-kind">Jenis</Label>
            <Select
              id="mat-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "FILE" | "VIDEO" | "LINK")}
              options={[
                { value: "FILE", label: "Dokumen/File" },
                { value: "VIDEO", label: "Video" },
                { value: "LINK", label: "Tautan Eksternal" }
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mat-content">Konten / Tautan</Label>
            <Textarea
              id="mat-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tempel tautan atau deskripsi materi..."
            />
          </div>
          <Alert variant="info" className="text-sm">
            File &gt;10MB akan menampilkan peringatan; gunakan tautan eksternal bila memungkinkan
            (mode hemat data).
          </Alert>
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
