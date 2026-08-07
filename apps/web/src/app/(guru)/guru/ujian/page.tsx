"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, Input, Label, Alert } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import { DEMO_EXAMS } from "@/lib/demo";
import { IconClock } from "@/components/ui/icons";

interface Exam {
  id: string;
  title: string;
  subject: string;
  className: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

export default function GuruUjianPage(): React.JSX.Element {
  const list = useApi<Exam[]>(() => api.get("/exams"), [], { fallbackData: DEMO_EXAMS });
  const [tab, setTab] = React.useState("daftar");
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [className, setClassName] = React.useState("");
  const [durationMin, setDurationMin] = React.useState("90");
  const [saving, setSaving] = React.useState(false);

  // token sesi
  const [tokenExamId, setTokenExamId] = React.useState<string | null>(null);
  const [tokenResult, setTokenResult] = React.useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = React.useState(false);

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({ variant: "success", title: "Ujian dibuat (demo)" });
      } else {
        await api.post("/exams", { title, className, durationMinutes: Number(durationMin) });
        toast({ variant: "success", title: "Ujian dibuat" });
      }
      setOpen(false);
      setTitle("");
      setClassName("");
      list.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal membuat ujian" });
    } finally {
      setSaving(false);
    }
  };

  const generateToken = async (examId: string): Promise<void> => {
    setTokenExamId(examId);
    setTokenResult(null);
    setTokenLoading(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 300));
        setTokenResult("7X4K2M");
        return;
      }
      const session = await api.post<{ id: string }>(`/exams/${examId}/sessions`, {
        name: "Shift 1"
      });
      const res = await api.post<{ token: string }>(`/exam/sessions/${session.id}/token`, {});
      setTokenResult(res.token);
    } catch {
      toast({ variant: "error", title: "Gagal membuat token" });
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Ujian</h1>
        <Button onClick={() => setOpen(true)}>Buat Ujian</Button>
      </div>

      <Tabs
        tabs={[
          { value: "daftar", label: "Daftar Ujian" },
          { value: "token", label: "Token Sesi" }
        ]}
        value={tab}
        onValueChange={setTab}
      />

      <TabPanel value="daftar" activeValue={tab}>
        <DataView
          status={list.status}
          error={list.error}
          onRetry={list.refetch}
          fallbackLabel="Daftar ujian"
        >
          {list.data?.length === 0 ? (
            <EmptyState
              title="Belum ada ujian"
              description="Buat ujian, paket soal, dan sesi dari sini."
              action={<Button onClick={() => setOpen(true)}>Buat Ujian</Button>}
            />
          ) : (
            <ul className="space-y-2">
              {(list.data ?? []).map((e) => (
                <li key={e.id}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{e.title}</CardTitle>
                      <CardDescription>
                        {e.subject} · {e.className} · {formatDateTime(e.startsAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void generateToken(e.id)}
                        loading={tokenLoading && tokenExamId === e.id}
                      >
                        Generate Token Sesi
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </TabPanel>

      <TabPanel value="token" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Token Sesi Ujian</CardTitle>
            <CardDescription>
              6 karakter alfanumerik uppercase tanpa 0/O/1/I; sekali pakai per attempt
              (04-api-contract §2.4).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataView
              status={list.status}
              error={list.error}
              onRetry={list.refetch}
              fallbackLabel="Daftar ujian"
            >
              <ul className="space-y-2">
                {(list.data ?? []).map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2"
                  >
                    <span className="font-medium text-neutral-900">{e.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void generateToken(e.id)}
                      loading={tokenLoading && tokenExamId === e.id}
                    >
                      Buat Token
                    </Button>
                  </li>
                ))}
              </ul>
            </DataView>
            {tokenResult ? (
              <div
                className="rounded-lg border border-primary-600 bg-primary-100 p-4 text-center"
                role="status"
              >
                <p className="text-sm font-medium text-primary-800">
                  Token untuk ditampilkan ke siswa:
                </p>
                <p className="mt-1 font-mono text-4xl font-bold tracking-[0.3em] text-primary-800">
                  {tokenResult}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1 text-sm text-primary-800">
                  <IconClock className="h-4 w-4" /> Berlaku untuk sesi yang sedang dibuka
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabPanel>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Buat Ujian"
        description="Jadwalkan ujian, lalu buat paket soal dan sesi."
      >
        <form onSubmit={(e) => void create(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ex-title">Judul Ujian</Label>
            <Input
              id="ex-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="PTS Matematika"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-class">Kelas Target</Label>
            <Input
              id="ex-class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              placeholder="XI IPA 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-duration">Durasi (menit)</Label>
            <Input
              id="ex-duration"
              type="number"
              min={5}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </div>
          <Alert variant="info" className="text-sm">
            Proctoring log-only (peralihan tab dicatat, bukan diskualifikasi otomatis).
          </Alert>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Buat &amp; Jadwalkan
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
