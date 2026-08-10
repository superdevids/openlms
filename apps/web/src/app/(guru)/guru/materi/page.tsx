"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Button,
  Input,
  Label,
  Select,
  Textarea,
  Alert,
  Dialog,
  toast,
  IconFile
} from "@opensis/ui";

import { formatRelative } from "@/lib/format";
import { PageHeader, DataTable, StatusBadge } from "@/components/ui";

interface Material {
  id: string;
  title: string;
  kind: "FILE" | "VIDEO" | "LINK";
  updatedAt: string;
}

const KIND_LABEL: Record<Material["kind"], string> = {
  FILE: "Dokumen",
  VIDEO: "Video",
  LINK: "Tautan"
};

export default function GuruMateriPage(): JSX.Element {
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
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"FILE" | "VIDEO" | "LINK">("FILE");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async (e: FormEvent): Promise<void> => {
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
      <PageHeader
        title="Materi"
        description="Dokumen, video, dan tautan belajar yang dibagikan ke siswa."
        actions={
          <Button onClick={() => setOpen(true)} size="sm">
            Tambah Materi
          </Button>
        }
      />

      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar materi"
      >
        <DataTable
          keyField="id"
          columns={[
            {
              key: "title",
              label: "Judul",
              render: (m) => (
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary"
                    aria-hidden="true"
                  >
                    <IconFile className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate">{m.title}</span>
                </span>
              )
            },
            {
              key: "kind",
              label: "Jenis",
              render: (m) => (
                <StatusBadge
                  status={m.kind}
                  mapping={{ FILE: "info", VIDEO: "warning", LINK: "neutral" }}
                  label={KIND_LABEL[m.kind]}
                />
              )
            },
            {
              key: "updatedAt",
              label: "Diperbarui",
              hideBelow: "md",
              render: (m) => (
                <span className="text-muted-foreground">{formatRelative(m.updatedAt)}</span>
              )
            }
          ]}
          rows={list.data ?? []}
          emptyTitle="Belum ada materi"
          emptyDesc="Unggah materi pertama untuk siswa."
          emptyAction={
            <Button size="sm" onClick={() => setOpen(true)}>
              Tambah Materi
            </Button>
          }
        />
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
