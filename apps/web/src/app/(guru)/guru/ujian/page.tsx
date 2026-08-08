"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  Alert,
  Dialog,
  Tabs,
  TabPanel,
  EmptyState,
  toast,
  IconClock
} from "@opensis/ui";

import { useAuth } from "@/components/auth/auth-provider";

import { DEMO_EXAMS } from "@/lib/demo";

interface Exam {
  id: string;
  title: string;
  type?: string;
  subject_id?: string;
  duration_min?: number;
  status: string;
  created_at?: string;
}

interface ClassSubjectItem {
  id: string;
  subject: { id: string; code: string; name: string };
}

const EXAM_TYPE_LABEL: Record<string, string> = {
  PTS: "PTS",
  PAS: "PAS",
  PAT: "PAT",
  UJIAN_SEKOLAH: "Ujian Sekolah",
  UKK: "UKK",
  LAINNYA: "Lainnya"
};

export default function GuruUjianPage(): JSX.Element {
  const { user } = useAuth();
  const classSubjects = useApi<ClassSubjectItem[]>(() => api.get("/class-subjects"), [], {
    fallbackData: []
  });
  const subjectNameById = (classSubjects.data ?? []).reduce<Record<string, string>>((acc, cs) => {
    acc[cs.subject.id] = cs.subject.name;
    return acc;
  }, {});
  const list = useApi<Exam[]>(
    async () => {
      const res = await api.get<{ items: Exam[]; total: number }>("/exam");
      return res.items ?? [];
    },
    [],
    { fallbackData: DEMO_EXAMS as unknown as Exam[] }
  );
  const [tab, setTab] = useState("daftar");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [durationMin, setDurationMin] = useState("90");
  const [saving, setSaving] = useState(false);

  // token sesi
  const [tokenExamId, setTokenExamId] = useState<string | null>(null);
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({ variant: "success", title: "Ujian dibuat (demo)" });
      } else {
        await api.post("/exam", {
          title,
          type: "PTS",
          subject_id: subjectId || classSubjects.data?.[0]?.subject.id,
          duration_min: Number(durationMin)
        });
        toast({ variant: "success", title: "Ujian dibuat" });
      }
      setOpen(false);
      setTitle("");
      setSubjectId("");
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
      const startsAt = new Date();
      const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const session = await api.post<{ id: string }>(`/exam/${examId}/sessions`, {
        name: "Shift 1",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_serentak: true
      });
      const res = await api.post<{ access_token: string }>(
        `/exam/sessions/${session.id}/token/generate`,
        { ttl_minutes: 60, generated_by: user?.id ?? "unknown" }
      );
      setTokenResult(res.access_token);
    } catch {
      toast({ variant: "error", title: "Gagal membuat token" });
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Ujian</h1>
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
                        {EXAM_TYPE_LABEL[e.type ?? ""] ?? e.type ?? "-"} ·{" "}
                        {subjectNameById[e.subject_id ?? ""] ?? "Mapel tidak diketahui"} ·{" "}
                        {e.duration_min ? `${e.duration_min} mnt` : "-"} · {e.status}
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
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{e.title}</span>
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
            <Label htmlFor="ex-subject">Mata Pelajaran</Label>
            <Select
              id="ex-subject"
              value={subjectId || classSubjects.data?.[0]?.subject.id || ""}
              onChange={(e) => setSubjectId(e.target.value)}
              options={(classSubjects.data ?? []).map((cs) => ({
                value: cs.subject.id,
                label: `${cs.subject.name} (${cs.subject.code})`
              }))}
              required
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
