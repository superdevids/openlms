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
  toast,
  IconClock,
  IconExam
} from "@opensis/ui";

import { useAuth } from "@/components/auth/auth-provider";

import { DEMO_EXAMS } from "@/lib/demo";
import { PageHeader, DataTable, StatusBadge } from "@/components/ui";

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
      <PageHeader
        title="Ujian"
        description="Jadwalkan ujian, kelola paket soal, dan terbitkan token sesi untuk siswa."
        actions={
          <Button onClick={() => setOpen(true)} size="sm">
            Buat Ujian
          </Button>
        }
      />

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
          <DataTable
            keyField="id"
            columns={[
              {
                key: "title",
                label: "Judul",
                render: (e) => (
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary"
                      aria-hidden="true"
                    >
                      <IconExam className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate">{e.title}</span>
                  </span>
                )
              },
              {
                key: "type",
                label: "Tipe",
                hideBelow: "md",
                render: (e) => (
                  <span className="text-muted-foreground">
                    {EXAM_TYPE_LABEL[e.type ?? ""] ?? e.type ?? "-"}
                  </span>
                )
              },
              {
                key: "subject",
                label: "Mapel",
                hideBelow: "lg",
                render: (e) => (
                  <span className="text-muted-foreground">
                    {subjectNameById[e.subject_id ?? ""] ?? "Mapel tidak diketahui"}
                  </span>
                )
              },
              {
                key: "duration",
                label: "Durasi",
                hideBelow: "lg",
                render: (e) => (
                  <span className="text-muted-foreground">
                    {e.duration_min ? `${e.duration_min} mnt` : "-"}
                  </span>
                )
              },
              {
                key: "status",
                label: "Status",
                render: (e) => (
                  <StatusBadge
                    status={e.status}
                    mapping={{ SCHEDULED: "warning", ONGOING: "info", ENDED: "success" }}
                  />
                )
              },
              {
                key: "action",
                label: "",
                className: "text-right",
                render: (e) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void generateToken(e.id)}
                    loading={tokenLoading && tokenExamId === e.id}
                  >
                    Generate Token Sesi
                  </Button>
                )
              }
            ]}
            rows={list.data ?? []}
            emptyTitle="Belum ada ujian"
            emptyDesc="Buat ujian, paket soal, dan sesi dari sini."
            emptyAction={
              <Button size="sm" onClick={() => setOpen(true)}>
                Buat Ujian
              </Button>
            }
          />
        </DataView>
      </TabPanel>

      <TabPanel value="token" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Token Sesi Ujian</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
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
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-app-surface-2/40 px-3 py-2"
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
                className="rounded-lg border border-status-info-border bg-status-info-bg p-4 text-center"
                role="status"
              >
                <p className="text-sm font-medium text-status-info-fg">
                  Token untuk ditampilkan ke siswa:
                </p>
                <p className="mt-1 font-mono text-4xl font-bold tracking-[0.3em] text-status-info-fg">
                  {tokenResult}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1 text-sm text-status-info-fg">
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
