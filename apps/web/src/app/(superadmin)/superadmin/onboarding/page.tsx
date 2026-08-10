"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  Checkbox,
  Alert,
  Steps,
  Progress,
  toast,
  IconCheck,
  IconDownload,
  IconUpload
} from "@opensis/ui";

import { PageHeader } from "@/components/ui";

/**
 * Onboarding aplikasi sekolah — wizard setup 5 langkah (07-ux §4.1, prd04 §9.1).
 * Tanpa alur daftar-sekolah publik (G19 N/A). Langkah bisa dilewati ("Selesai nanti").
 */
const STEPS = [
  { title: "Identitas & Tahun Ajaran" },
  { title: "Profil & Kebijakan" },
  { title: "Impor Data" },
  { title: "Undang Admin & Staf" },
  { title: "Ulasan & Aktifkan" }
];

export default function SuperadminOnboardingPage(): JSX.Element {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [schoolName, setSchoolName] = useState("SMA Negeri Contoh");
  const [npsn, setNpsn] = useState("");
  const [jenjang, setJenjang] = useState("SMA");
  const [year, setYear] = useState("2026/2027");
  const [alpa, setAlpa] = useState("3");
  const [dataSaver, setDataSaver] = useState(true);
  const [gamifikasi, setGamifikasi] = useState(false);
  const [skipInvite, setSkipInvite] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const submitStep = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!DEMO_MODE) {
        // UpdateAppSettingsDto: name/npsn/school_type di profil; ambang & toggle di settings.
        if (step === 0)
          await api.patch("/app/settings", {
            name: schoolName,
            npsn,
            school_type: jenjang,
            settings: { onboarding: { academicYearCode: year } }
          });
        if (step === 1)
          await api.patch("/app/settings", {
            settings: {
              attendance: { absence_threshold_per_month: Number(alpa) },
              dataSaver,
              gamification: gamifikasi
            }
          });
      }
      await new Promise((r) => setTimeout(r, 250));
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
      toast({ variant: "success", title: "Langkah tersimpan" });
    } catch {
      toast({ variant: "error", title: "Gagal menyimpan langkah" });
    } finally {
      setSaving(false);
    }
  };

  const finish = async (): Promise<void> => {
    setSaving(true);
    try {
      if (!DEMO_MODE) await api.post("/app/onboarding/step-5", {});
      await new Promise((r) => setTimeout(r, 300));
      setDone(true);
      toast({ variant: "success", title: "Aplikasi aktif!" });
    } catch {
      toast({ variant: "error", title: "Gagal mengaktifkan" });
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-lg rounded-lg border-border bg-app-surface shadow-app-card">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg"
            aria-hidden="true"
          >
            <IconCheck className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Setup Selesai — Aplikasi Aktif
          </h1>
          <p className="text-sm text-muted-foreground">
            Dashboard aplikasi terbuka. Anda dapat mengubah pengaturan kapan saja di Admin Sistem.
          </p>
          <Button onClick={() => (window.location.href = "/superadmin/dashboard")}>
            Buka Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Setup Sekolah"
        description="Wizard konfigurasi awal aplikasi — data tersimpan otomatis antar langkah."
      />
      <Steps steps={STEPS} current={step} />
      <Progress value={(step / STEPS.length) * 100} className="my-2" />

      <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
        <CardHeader>
          <CardTitle>
            Langkah {step + 1} dari {STEPS.length}: {STEPS[step].title}
          </CardTitle>
          <CardDescription>
            {step === 3
              ? "Bisa dilewati — pilih 'Selesai nanti'."
              : "Data tersimpan otomatis antar langkah."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void submitStep(e)} className="space-y-4">
            {step === 0 ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="on-name">Nama Sekolah</Label>
                  <Input
                    id="on-name"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="on-npsn">NPSN (8 digit)</Label>
                    <Input
                      id="on-npsn"
                      value={npsn}
                      onChange={(e) => setNpsn(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="12345678"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="on-jenjang">Jenjang</Label>
                    <Select
                      id="on-jenjang"
                      value={jenjang}
                      onChange={(e) => setJenjang(e.target.value)}
                      options={[
                        { value: "SMA", label: "SMA" },
                        { value: "SMK", label: "SMK" }
                      ]}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="on-year">Tahun Ajaran Aktif</Label>
                  <Input id="on-year" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
              </>
            ) : step === 1 ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="on-alpa">Ambang Alpa (per bulan)</Label>
                  <Input
                    id="on-alpa"
                    type="number"
                    value={alpa}
                    onChange={(e) => setAlpa(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Mode Hemat Data (default ON)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kompresi gambar, lazy-load, format ringan untuk kuota terbatas.
                    </p>
                  </div>
                  <Checkbox
                    checked={dataSaver}
                    onChange={(e) => setDataSaver(e.target.checked)}
                    aria-label="Mode hemat data"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Gamifikasi (default OFF)</p>
                    <p className="text-xs text-muted-foreground">
                      Badge & progress non-blokir; dapat diaktifkan admin.
                    </p>
                  </div>
                  <Checkbox
                    checked={gamifikasi}
                    onChange={(e) => setGamifikasi(e.target.checked)}
                    aria-label="Gamifikasi"
                  />
                </div>
              </>
            ) : step === 2 ? (
              <>
                <Alert variant="info" className="text-sm">
                  Template Excel siswa/guru/kelas → upload → validasi → preview error → impor
                  parsial aman.
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline">
                    <IconDownload className="h-4 w-4" /> Unduh Template
                  </Button>
                  <Button
                    type="button"
                    variant={importDone ? "success" : "default"}
                    onClick={() => {
                      setImportDone(true);
                      toast({
                        variant: "success",
                        title: "Impor selesai (demo)",
                        description: "244 berhasil · 4 error dilewati"
                      });
                    }}
                  >
                    <IconUpload className="h-4 w-4" />{" "}
                    {importDone ? "Validasi & Preview" : "Pilih File Excel"}
                  </Button>
                </div>
                {importDone ? (
                  <Alert variant="success" className="text-sm">
                    Validasi: 244 baris valid · 4 error (NISN duplikat / nama kosong). Impor parsial
                    aman.
                  </Alert>
                ) : null}
              </>
            ) : step === 3 ? (
              <>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="on-skip"
                    checked={skipInvite}
                    onChange={(e) => setSkipInvite(e.target.checked)}
                  />
                  <Label htmlFor="on-skip" className="cursor-pointer">
                    Lewati langkah ini ("Selesai nanti")
                  </Label>
                </div>
                {!skipInvite ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="on-inv-username">Username</Label>
                      <Input id="on-inv-username" placeholder="guru.2026" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="on-inv-role">Role</Label>
                      <Select
                        id="on-inv-role"
                        defaultValue="GURU"
                        options={[
                          { value: "GURU", label: "Guru" },
                          { value: "OPERATOR", label: "Operator / TU" },
                          { value: "KEUANGAN", label: "Keuangan" }
                        ]}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="space-y-2 rounded-md border border-border bg-background p-4 text-sm">
                  <p>
                    <strong>Sekolah:</strong> {schoolName || "-"} · NPSN {npsn || "-"} · {jenjang}
                  </p>
                  <p>
                    <strong>Tahun ajaran:</strong> {year || "-"}
                  </p>
                  <p>
                    <strong>Ambang alpa:</strong> {alpa} / bulan · <strong>Data-saver:</strong>{" "}
                    {dataSaver ? "ON" : "OFF"} · <strong>Gamifikasi:</strong>{" "}
                    {gamifikasi ? "ON" : "OFF"}
                  </p>
                  <p>
                    <strong>Impor:</strong> {importDone ? "Selesai (244 valid)" : "Dilewati"} ·{" "}
                    <strong>Undangan:</strong> {skipInvite ? "Dilewati" : "1 staf"}
                  </p>
                </div>
                <Alert variant="warning" className="text-sm">
                  Setelah diaktifkan, aplikasi masuk mode produksi untuk sekolah. Perubahan
                  selanjutnya lewat Admin Sistem.
                </Alert>
              </>
            )}

            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Kembali
              </Button>
              {step === STEPS.length - 1 ? (
                <Button type="button" onClick={() => void finish()} loading={saving}>
                  Aktifkan Aplikasi
                </Button>
              ) : (
                <Button type="submit" loading={saving}>
                  Lanjut
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
