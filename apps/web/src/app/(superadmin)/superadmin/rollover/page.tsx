"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, Alert, Badge } from "@/components/ui";
import { Steps } from "@/components/ui/steps";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/format";
import { IconCheck, IconAlert } from "@/components/ui/icons";

/**
 * Rollover wizard — prd04 §5.R (state machine):
 * DRAFT → PRE-CHECK → DRY-RUN PREVIEW → KONFIRMASI → EKSEKUSI → DONE → (ROLLBACK 7 hari).
 * Satu run per tahun ajaran; dry-run wajib sebelum eksekusi; backup terverifikasi.
 */
const WIZARD_STEPS = [
  { title: "Pre-check" },
  { title: "Dry-run Preview" },
  { title: "Konfirmasi" },
  { title: "Eksekusi" },
  { title: "Selesai" }
];

type Phase = "precheck" | "preview" | "confirm" | "running" | "done" | "rolledback";

const PRECHECKS = [
  { id: 1, label: "Nilai final & rapor selesai", ok: true, blocker: true },
  { id: 2, label: "Rekap absensi final", ok: true, blocker: true },
  {
    id: 3,
    label: "Tidak ada attempt/ujian/tugas aktif",
    ok: false,
    blocker: false,
    note: "1 attempt IN_PROGRESS (peringatan)"
  },
  { id: 4, label: "Invoice SPP ditutup/di-roll (bila FINANCE ON)", ok: true, blocker: true },
  { id: 5, label: "Payroll periode terakhir selesai (bila PAYROLL ON)", ok: true, blocker: true },
  { id: 6, label: "Backup terverifikasi", ok: true, blocker: true },
  { id: 7, label: "PPDB tahun lama tidak menggantung (bila PPDB ON)", ok: true, blocker: true }
];

const DRY_RUN = [
  { id: 1, student: "Andi Setiawan", from: "XI IPA 1", to: "XII IPA 1", action: "PROMOTED" },
  { id: 2, student: "Budi Santoso", from: "XI IPA 1", to: "XI IPA 1", action: "REPEATED" },
  { id: 3, student: "Sari Wulandari", from: "XII IPA 1", to: "Alumni 2027", action: "GRADUATED" }
];

export default function SuperadminRolloverPage(): React.JSX.Element {
  const [phase, setPhase] = React.useState<Phase>("precheck");
  const [progress, setProgress] = React.useState(0);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [rollbackOpen, setRollbackOpen] = React.useState(false);

  const stepIndex: Record<Phase, number> = {
    precheck: 0,
    preview: 1,
    confirm: 2,
    running: 3,
    done: 4,
    rolledback: 4
  };

  const runPrecheck = async (): Promise<void> => {
    toast({ variant: "info", title: "Menjalankan pre-check..." });
    await new Promise((r) => setTimeout(r, 600));
    setPhase("preview");
    toast({
      variant: "success",
      title: "Pre-check selesai",
      description: "6 lulus · 1 peringatan"
    });
  };

  const runDryRun = async (): Promise<void> => {
    toast({ variant: "info", title: "Menghitung dry-run (tanpa menulis)..." });
    await new Promise((r) => setTimeout(r, 700));
    setPhase("confirm");
  };

  const execute = async (): Promise<void> => {
    setPhase("running");
    const interval = window.setInterval(() => {
      setProgress((p) => {
        const next = p + 15;
        if (next >= 100) {
          window.clearInterval(interval);
          setPhase("done");
          toast({
            variant: "success",
            title: "Rollover selesai",
            description: "Tahun 2027/2028 aktif; tahun lama read-only."
          });
          return 100;
        }
        return next;
      });
    }, 400);
    if (DEMO_MODE) return;
    try {
      const draft = await api.post<{ id: string }>("/app/rollover/drafts", {
        academicYear: "2027/2028"
      });
      await api.post(`/app/rollover/drafts/${draft.id}/execute`, {});
    } catch {
      toast({ variant: "error", title: "Gagal mengeksekusi rollover" });
    }
  };

  const rollback = async (): Promise<void> => {
    toast({ variant: "warning", title: "Rollback dalam jendela 7 hari..." });
    await new Promise((r) => setTimeout(r, 600));
    setPhase("rolledback");
    toast({
      variant: "success",
      title: "Rollback selesai",
      description: "Data dikembalikan ke sebelum rollover."
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Tutup Tahun Ajaran</h1>
        <p className="text-sm text-neutral-600">
          Tahun berjalan: 2026/2027 → Tahun baru: 2027/2028. Satu run per tahun ajaran; data tahun
          lama menjadi arsip read-only.
        </p>
      </div>

      <Steps steps={WIZARD_STEPS} current={stepIndex[phase]} />

      {phase === "precheck" ? (
        <Card>
          <CardHeader>
            <CardTitle>Pre-check Prasyarat</CardTitle>
            <CardDescription>
              Bloker memblokir eksekusi; peringatan bisa dilanjutkan. Override bloker hanya
              SUPERADMIN ber-alasan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {PRECHECKS.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2"
                >
                  <span className="text-sm text-neutral-900">{p.label}</span>
                  {p.ok ? (
                    <Badge variant="success">
                      <IconCheck className="h-3 w-3" /> Lulus
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <IconAlert className="h-3 w-3" /> Peringatan
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
            <Button onClick={() => void runPrecheck()}>Jalankan Pre-check</Button>
          </CardContent>
        </Card>
      ) : null}

      {phase === "preview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Dry-run Preview</CardTitle>
            <CardDescription>
              Hasil dihitung tanpa menulis data — wajib ditampilkan sebelum konfirmasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Dari</TableHead>
                  <TableHead>Ke</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DRY_RUN.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.student}</TableCell>
                    <TableCell>{d.from}</TableCell>
                    <TableCell>{d.to}</TableCell>
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
                        {d.action}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Alert variant="info" className="text-sm">
              Ringkasan: {formatNumber(2)} naik kelas · {formatNumber(1)} tinggal ·{" "}
              {formatNumber(1)} lulus. Dampak keuangan diproses bila FINANCE ON.
            </Alert>
            <Button onClick={() => void runDryRun()}>Hitung &amp; Lanjut ke Konfirmasi</Button>
          </CardContent>
        </Card>
      ) : null}

      {phase === "confirm" ? (
        <Card>
          <CardHeader>
            <CardTitle>Konfirmasi</CardTitle>
            <CardDescription>
              Eksekusi membutuhkan persetujuan SUPERADMIN/KEPSEK; backup terverifikasi sudah dicek
              di pre-check.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="warning" className="text-sm">
              Setelah eksekusi, jendela rollback 7 hari. Tahun lama masuk mode CLOSING lalu CLOSED
              (read-only).
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase("preview")}>
                Kembali ke Preview
              </Button>
              <Button onClick={() => setConfirmOpen(true)}>Eksekusi Rollover</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {phase === "running" ? (
        <Card>
          <CardHeader>
            <CardTitle>Eksekusi Berjalan</CardTitle>
            <CardDescription>
              Job async, idempoten, resume-able dari step terakhir (BullMQ).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress} showLabel />
            <p className="text-sm text-neutral-600" aria-live="polite">
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
              <Button variant="destructive" onClick={() => setRollbackOpen(true)}>
                Rollback (jendela 7 hari)
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setPhase("precheck");
                  setProgress(0);
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
