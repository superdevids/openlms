"use client";

import { useState, type FormEvent, type JSX } from "react";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Dialog,
  toast,
  IconBook,
  IconChevronRight
} from "@opensis/ui";

import { DEMO_CLASSES } from "@/lib/demo";
import { PageHeader, EmptyStateV3, RequiredLabel } from "@/components/ui";

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  teacher?: string;
}

export default function GuruKelasPage(): JSX.Element {
  const list = useApi<ClassItem[]>(() => api.get("/classes"), [], { fallbackData: DEMO_CLASSES });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async (e: FormEvent): Promise<void> => {
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
      <PageHeader
        title="Kelas Saya"
        description="Kelas-mapel yang Anda ampu. Pilih kelas untuk mengelola materi, tugas, dan siswa."
        actions={
          <Button onClick={() => setOpen(true)} size="sm">
            Buat Kelas
          </Button>
        }
      />

      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar kelas"
      >
        {list.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconBook className="h-5 w-5" />}
            title="Belum ada kelas"
            desc="Kelas di-assign oleh admin atau buat kelas baru dari sini."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                Buat Kelas
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(list.data ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/guru/kelas/${c.id}`} className="group block h-full">
                  <Card className="flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-floating">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm font-semibold">{c.name}</CardTitle>
                        <CardDescription className="mt-0.5 truncate text-xs text-muted-foreground">
                          {c.subject}
                        </CardDescription>
                      </div>
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                        aria-hidden="true"
                      >
                        <IconBook className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                      <span>Kelola Kelas</span>
                      <IconChevronRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
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
            <RequiredLabel htmlFor="cls-name">Nama Kelas</RequiredLabel>
            <Input
              id="cls-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="XI IPA 1"
              required
            />
          </div>
          <div className="space-y-1.5">
            <RequiredLabel htmlFor="cls-subject">Mata Pelajaran</RequiredLabel>
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
