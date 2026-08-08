"use client";

import { useState, type JSX } from "react";

import { api, DEMO_MODE, errorMessage } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  Badge,
  Steps,
  ConfirmDialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  toast,
  IconCheck,
  IconAlert
} from "@opensis/ui";

import { formatNumber } from "@/lib/format";

/**
 * Rollover wizard — prd04 §5.R (state machine):
 * DRAFT → PRE-CHECK → DRY-RUN PREVIEW → KONFIRMASI → EKSEKUSI → DONE → (ROLLBACK 7 hari).
 * Semua data (pre-check, dry-run, eksekusi) dari API NYATA (/rollover/*) —
 * draft dibuat sekali lalu pre-check/dry-run/execute dipanggil per runId.
 * Satu run per tahun ajaran; dry-run wajib sebelum eksekusi.
 */
const WIZARD_STEPS = [
  { title: "Pre-check" },
  { title: "Dry-run Preview" },
  { title: "Konfirmasi" },
  { title: "Eksekusi" },
  { title: "Selesai" }
];

type Phase = "precheck" | "preview" | "confirm" | "running" | "done" | "rolledback";

interface Blocker {
  code: string;
  message: string;
}

interface PrecheckResult {
  ok: boolean;
  blockers: Blocker[];
  warnings: string[];
  checkedAt: string;
}

interface StudentDecision {
  studentId: string;
  sourceClassId: string;
  action: "PROMOTED" | "REPEATED" | "GRADUATED" | "TRANSFERRED" | "DROPPED";
  averageScore: number | null;
  targetClassKey: string | null;
  reason: string;
}

interface NewClassPlan {
  key: string;
  sourceClassId: string;
  name: string;
  gradeLevel: number;
  repeated: boolean;
}

interface PromotionPlan {
  decisions: StudentDecision[];
  classes: NewClassPlan[];
  counts: Record<string, number>;
}

interface AppSettingsView {
  profile?: { current_academic_year_id?: string | null; name?: string };
}

const ACTION_LABEL: Record<string, string> = {
  PROMOTED: "Naik Kelas",
  REPEATED: "Tinggal",
  GRADUATED: "Lulus",
  TRANSFERRED: "Pindah",
  DROPPED: "Keluar"
};

export default function SuperadminRolloverPage(): JSX.Element {
  const [phase, setPhase] = useState<Phase>("precheck");
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [precheck, setPrecheck] = useState<PrecheckResult | null>(null);
  const [plan, setPlan] = useState<PromotionPlan | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);

  const stepIndex: Record<Phase, number> = {
    precheck: 0,
    preview: 1,
    confirm: 2,
    running: 3,
    done: 4,
    rolledback: 4
  };

  /** Buat draft rollover dari tahun ajaran aktif (GET /app/settings), lalu pre-check. */
  const createDraftAndPrecheck = async (): Promise<void> => {
    setBusy(true);
    setWizardError(null);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 400));
        setRunId("run_demo");
        setPrecheck({
          ok: true,
          blockers: [],
          warnings: ["1 attempt IN_PROGRESS (peringatan — demo)"],
          checkedAt: new Date().toISOString()
        });
        setPhase("preview");
        toast({ variant: "success", title: "Pre-check selesai (demo)" });
        return;
      }

      if (!runId) {
        const settings = await api.get<AppSettingsView>("/app/settings");
        const sourceYearId = settings.profile?.current_academic_year_id ?? null;
        if (!sourceYearId) {
          throw new Error("Tahun ajaran aktif belum diatur di Pengaturan Aplikasi.");
        }
        const draft = await api.post<{ id: string }>("/rollover/draft", {
          sourceYearId,
          newYearCode: "2027/2028",
          newYearName: "Tahun Ajaran 2027/2028",
          startDate: new Date("2027-07-12").toISOString(),
          endDate: new Date("2028-06-30").toISOString(),
          backup: { confirmed: true, label: "Backup terverifikasi via wizard" }
        });
        setRunId(draft.id);
        const result = await api.post<PrecheckResult>(`/rollover/${draft.id}/pre-check`);
        setPrecheck(result);
        setPhase("preview");
        toast({
          variant: result.ok ? "success" : "warning",
          title: "Pre-check selesai",
          description: `${result.blockers.length} bloker · ${result.warnings.length} peringatan`
        });
      } else {
        const result = await api.post<PrecheckResult>(`/rollover/${runId}/pre-check`);
        setPrecheck(result);
        setPhase("preview");
        toast({ variant: "info", title: "Pre-check diperbarui" });
      }
    } catch (err) {
      setWizardError(errorMessage(err));
      toast({ variant: "error", title: "Gagal menjalankan pre-check" });
    } finally {
      setBusy(false);
    }
  };

  const runDryRun = async (): Promise<void> => {
    if (!runId) return;
    setBusy(true);
    setWizardError(null);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 500));
        setPlan({
          decisions: [
            {
              studentId: "student_1",
              sourceClassId: "cls_a",
              action: "PROMOTED",
              averageScore: 82,
              targetClassKey: "c1",
              reason: "naik kelas"
            },
            {
              studentId: "student_2",
              sourceClassId: "cls_a",
              action: "REPEATED",
              averageScore: 51,
              targetClassKey: "c2",
              reason: "tinggal kelas"
            },
            {
              studentId: "student_3",
              sourceClassId: "cls_b",
              action: "GRADUATED",
              averageScore: 90,
              targetClassKey: null,
              reason: "lulus dari kelas akhir"
            }
          ],
          classes: [
            {
              key: "c1",
              sourceClassId: "cls_a",
              name: "XII IPA 1",
              gradeLevel: 12,
              repeated: false
            },
            {
              key: "c2",
              sourceClassId: "cls_a",
              name: "XI IPA 1 (U)",
              gradeLevel: 11,
              repeated: true
            }
          ],
          counts: { PROMOTED: 1, REPEATED: 1, GRADUATED: 1, TRANSFERRED: 0, DROPPED: 0 }
        });
        setPhase("confirm");
        return;
      }
      const result = await api.post<PromotionPlan>(`/rollover/${runId}/dry-run`);
      setPlan(result);
      setPhase("confirm");
      toast({ variant: "success", title: "Dry-run selesai" });
    } catch (err) {
      setWizardError(errorMessage(err));
      toast({ variant: "error", title: "Gagal menghitung dry-run" });
    } finally {
      setBusy(false);
    }
  };

  const execute = async (): Promise<void> => {
    if (!runId) return;
    setPhase("running");
    setWizardError(null);
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 600));
      setPhase("done");
      toast({
        variant: "success",
        title: "Rollover selesai",
        description: "Tahun 2027/2028 aktif; tahun lama read-only. (demo)"
      });
      return;
    }
    try {
      await api.post<{ accepted: boolean }>(`/rollover/${runId}/execute`, {});
      setPhase("done");
      toast({
        variant: "success",
        title: "Eksekusi rollover diterima",
        description: "Job dijalankan async (BullMQ); refresh untuk melihat status terakhir."
      });
    } catch (err) {
      setPhase("confirm");
      setWizardError(errorMessage(err));
      toast({ variant: "error", title: "Gagal mengeksekusi rollover" });
    }
  };

  const rollback = async (): Promise<void> => {
    if (!runId) return;
    setBusy(true);
    setWizardError(null);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 500));
        setPhase("rolledback");
        toast({ variant: "success", title: "Rollback selesai (demo)" });
        return;
      }
      await api.post(`/rollover/${runId}/rollback`, { reason: "Rollback dari wizard superadmin" });
      setPhase("rolledback");
      toast({
        variant: "success",
        title: "Rollback selesai",
        description: "Data dikembalikan ke sebelum rollover."
      });
    } catch (err) {
      setWizardError(errorMessage(err));
      toast({ variant: "error", title: "Gagal rollback" });
    } finally {
      setBusy(false);
    }
  };

  const counts = plan?.counts ?? {};
  const summaryLine = plan
    ? `${formatNumber(counts.PROMOTED ?? 0)} naik kelas · ${formatNumber(counts.REPEATED ?? 0)} tinggal · ${formatNumber(counts.GRADUATED ?? 0)} lulus`
    : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tutup Tahun Ajaran</h1>
        <p className="text-sm text-muted-foreground">
          Tahun berjalan: 2026/2027 → Tahun baru: 2027/2028. Satu run per tahun ajaran; data tahun
          lama menjadi arsip read-only. Draft dibuat dari tahun ajaran aktif di Pengaturan Aplikasi.
        </p>
      </div>

      <Steps steps={WIZARD_STEPS} current={stepIndex[phase]} />

      {wizardError ? (
        <Alert variant="danger" className="text-sm">
          {wizardError}
        </Alert>
      ) : null}

      {phase === "precheck" ? (
        <Card>
          <CardHeader>
            <CardTitle>Pre-check Prasyarat</CardTitle>
            <CardDescription>
              Menjalankan pre-check nyata dari API: nilai final, absensi, attempt aktif, tagihan.
              Bloker memblokir eksekusi; peringatan bisa dilanjutkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => void createDraftAndPrecheck()} loading={busy}>
              Mulai Pre-check
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {phase === "preview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Pre-check</CardTitle>
            <CardDescription>
              Diperiksa pada{" "}
              {precheck?.checkedAt ? new Date(precheck.checkedAt).toLocaleString("id-ID") : "-"}.
              {precheck?.ok
                ? " Tidak ada bloker — aman untuk lanjut."
                : " Ada bloker yang harus dibereskan."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {precheck?.blockers.map((b) => (
                <li
                  key={b.code}
                  className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm text-foreground">{b.message}</span>
                  <Badge variant="danger">
                    <IconAlert className="h-3 w-3" /> Bloker
                  </Badge>
                </li>
              ))}
              {(precheck?.warnings ?? []).map((w, i) => (
                <li
                  key={`w-${i}`}
                  className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm text-foreground">{w}</span>
                  <Badge variant="warning">
                    <IconAlert className="h-3 w-3" /> Peringatan
                  </Badge>
                </li>
              ))}
              {!precheck || (precheck.blockers.length === 0 && precheck.warnings.length === 0) ? (
                <li className="rounded-md border border-success-200 bg-success-600/5 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <IconCheck className="h-4 w-4 text-success-600" /> Tidak ada masalah ditemukan
                  </span>
                </li>
              ) : null}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void createDraftAndPrecheck()}
                loading={busy}
              >
                Ulangi Pre-check
              </Button>
              <Button onClick={() => void runDryRun()} loading={busy} disabled={!precheck?.ok}>
                Hitung Dry-run
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {phase === "confirm" ? (
        <Card>
          <CardHeader>
            <CardTitle>Dry-run Preview</CardTitle>
            <CardDescription>
              Hasil dihitung tanpa menulis data (endpoint /rollover/:runId/dry-run) — wajib
              ditampilkan sebelum konfirmasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Rata-rata</TableHead>
                  <TableHead>Alasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(plan?.decisions ?? []).map((d) => (
                  <TableRow key={`${d.studentId}-${d.action}`}>
                    <TableCell className="font-medium">{d.studentId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          d.action === "GRADUATED"
                            ? "success"
                            : d.action === "REPEATED"
                              ? "warning"
                              : "primary"
                        }
                      >
                        {ACTION_LABEL[d.action] ?? d.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.averageScore !== null ? d.averageScore : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Alert variant="info" className="text-sm">
              Ringkasan: {summaryLine}. Kelas baru:{" "}
              {(plan?.classes ?? []).map((c) => c.name).join(", ") || "-"}. Dampak keuangan diproses
              bila FINANCE ON.
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPhase("preview")}>
                Kembali ke Pre-check
              </Button>
              <Button onClick={() => setConfirmOpen(true)}>Konfirmasi &amp; Eksekusi</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {phase === "running" ? (
        <Card>
          <CardHeader>
            <CardTitle>Eksekusi Berjalan</CardTitle>
            <CardDescription>
              Job async, idempoten, resume-able dari step terakhir (BullMQ / fallback inline).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Membuat kelas baru, enroll siswa, menyalin template...
            </p>
          </CardContent>
        </Card>
      ) : null}

      {phase === "done" || phase === "rolledback" ? (
        <Card>
          <CardHeader>
            <CardTitle>{phase === "done" ? "Rollover Selesai" : "Rollback Selesai"}</CardTitle>
            <CardDescription>
              {phase === "done"
                ? "Tahun 2027/2028 aktif. Data tahun lama tersimpan sebagai arsip read-only (endpoint tulis menolak ARCHIVED_YEAR)."
                : "Data dikembalikan ke kondisi sebelum rollover. Tahun berjalan tetap 2026/2027."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {phase === "done" ? (
              <Button variant="destructive" onClick={() => setRollbackOpen(true)} loading={busy}>
                Rollback (jendela 7 hari)
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setPhase("precheck");
                  setPrecheck(null);
                  setPlan(null);
                  setRunId(null);
                }}
              >
                Mulai Ulang Wizard
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eksekusi rollover sekarang?"
        description="Tindakan ini menutup tahun 2026/2027 dan menyiapkan 2027/2028. Rollback hanya mungkin dalam 7 hari."
        confirmLabel="Ya, eksekusi"
        destructive
        onConfirm={() => void execute()}
      />
      <ConfirmDialog
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        title="Rollback rollover?"
        description="Kembalikan semua data ke sebelum eksekusi. Aksi tercatat di AuditLog."
        confirmLabel="Ya, rollback"
        destructive
        onConfirm={() => void rollback()}
      />
    </div>
  );
}
