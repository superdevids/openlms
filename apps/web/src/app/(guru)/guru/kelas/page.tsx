"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label, Dialog, toast, EmptyState } from "@openlms/ui";

import { DEMO_CLASSES } from "@/lib/demo";

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  teacher?: string;
}

export default function GuruKelasPage(): React.JSX.Element {
  const list = useApi<ClassItem[]>(() => api.get("/classes"), [], { fallbackData: DEMO_CLASSES });
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/classes", { name, subject });
      toast({ variant: "success", title: "Kelas dibuat" });
      setOpen(false);
      setName("");
      setSubject("");
      list.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal membuat kelas" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Kelas Saya</h1>
        <Button onClick={() => setOpen(true)}>Buat Kelas</Button>
      </div>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar kelas"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada kelas"
            description="Kelas di-assign oleh admin atau buat kelas baru."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(list.data ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/guru/kelas/${c.id}`} className="block h-full">
                  <Card className="h-full transition-colors hover:border-primary-600">
                    <CardHeader>
                      <CardTitle>{c.name}</CardTitle>
                      <CardDescription>{c.subject}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm">
                        Kelola Kelas
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataView>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Buat Kelas"
        description="Buat kelas-mapel baru untuk mengelola materi, tugas, dan absensi."
      >
        <form onSubmit={(e) => void create(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cls-name">Nama Kelas</Label>
            <Input
              id="cls-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="XI IPA 1"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-subject">Mata Pelajaran</Label>
            <Input
              id="cls-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Matematika"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Simpan
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
