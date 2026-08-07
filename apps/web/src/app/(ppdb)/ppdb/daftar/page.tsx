"use client";

import * as React from "react";
import Link from "next/link";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, Input, Label, Select, Checkbox, Alert } from "@/components/ui";
import { Steps } from "@/components/ui/steps";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { IconCheck } from "@/components/ui/icons";

/**
 * PPDB — wizard 4 langkah publik (tanpa login) 07-ux §4.8:
 * 1 Data Calon → 2 Data Orang Tua → 3 Upload Dokumen → 4 Consent & Konfirmasi.
 * Autosave draft lokal; consent data anak wajib (G13); sukses → Nomor Pendaftaran.
 */
const STEPS = [
  { title: "Data Calon" },
  { title: "Data Orang Tua" },
  { title: "Upload Dokumen" },
  { title: "Consent & Konfirmasi" }
];

export default function PPDBDaftarPage(): React.JSX.Element {
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ registrationNo: string } | null>(null);

  const [form, setForm] = React.useState({
    fullName: "",
    nisn: "",
    birthDate: "",
    birthPlace: "",
    gender: "L",
    originSchool: "",
    phone: "",
    email: "",
    parentName: "",
    parentPhone: "",
    parentJob: "",
    consent: false
  });

  // Autosave draft lokal (G10) — cegah hilang saat koneksi putus
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem("openlms_ppdb_draft", JSON.stringify(form));
      } catch {
        // abaikan
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [form]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("openlms_ppdb_draft");
      if (raw) setForm((f) => ({ ...f, ...(JSON.parse(raw) as Partial<typeof form>) }));
    } catch {
      // abaikan
    }
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const next = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);
    if (step === 0 && !form.fullName.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (step === 3 && !form.consent) {
      setError("Centang persetujuan data anak (wajib) sebelum mengirim.");
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.consent) {
      setError("Centang persetujuan data anak (wajib) sebelum mengirim.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let reg: string;
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 500));
        reg = "PPDB-2026-0001";
      } else {
        const res = await api.post<{ registrationNo: string }>("/ppdb/register", {
          fullName: form.fullName,
          nisn: form.nisn,
          birthDate: form.birthDate,
          birthPlace: form.birthPlace,
          gender: form.gender,
          originSchool: form.originSchool,
          phone: form.phone,
          email: form.email,
          parentName: form.parentName,
          parentPhone: form.parentPhone,
          consent: { type: "DATA_CHILD", granted: form.consent, parentName: form.parentName }
        });
        reg = res.registrationNo;
      }
      localStorage.removeItem("openlms_ppdb_draft");
      setResult({ registrationNo: reg });
      toast({ variant: "success", title: "Pendaftaran terkirim" });
    } catch (err) {
      setError(
        err instanceof ApiError ? errorMessage(err) : "Gagal mengirim pendaftaran. Coba lagi."
      );
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <IconCheck className="h-12 w-12 text-success-600" />
              <h1 className="text-2xl font-bold text-neutral-900">Pendaftaran Terkirim</h1>
              <p className="text-sm text-neutral-600">Simpan nomor pendaftaran Anda:</p>
              <p className="rounded-lg bg-neutral-100 px-6 py-3 font-mono text-2xl font-bold text-neutral-900">
                {result.registrationNo}
              </p>
              <p className="text-sm text-neutral-600">
                Gunakan nomor ini untuk cek status. Verifikasi dokumen oleh TU.
              </p>
              <Link href="/ppdb/status">
                <Button variant="outline">Cek Status</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/ppdb" className="text-sm font-medium text-primary-600">
            &larr; Halaman PPDB
          </Link>
          <p className="text-lg font-bold text-primary-700">openlms</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900">Formulir Pendaftaran</h1>
        <Steps steps={STEPS} current={step} className="mt-4" />
        <Progress value={(step / STEPS.length) * 100} className="my-4" />

        <Card>
          <CardHeader>
            <CardTitle>
              Langkah {step + 1} dari 4: {STEPS[step].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={step === STEPS.length - 1 ? (e) => void submit(e) : next}
              className="space-y-4"
            >
              {step === 0 ? (
                <>
                  <Field label="Nama Lengkap" required>
                    <Input
                      value={form.fullName}
                      onChange={(e) => set("fullName", e.target.value)}
                      placeholder="Budi Santoso"
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="NISN (opsional)">
                      <Input
                        value={form.nisn}
                        onChange={(e) =>
                          set("nisn", e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        placeholder="0081234567"
                      />
                    </Field>
                    <Field label="Jenis Kelamin">
                      <Select
                        value={form.gender}
                        onChange={(e) => set("gender", e.target.value)}
                        options={[
                          { value: "L", label: "Laki-laki" },
                          { value: "P", label: "Perempuan" }
                        ]}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tempat Lahir">
                      <Input
                        value={form.birthPlace}
                        onChange={(e) => set("birthPlace", e.target.value)}
                        placeholder="Jakarta"
                      />
                    </Field>
                    <Field label="Tanggal Lahir">
                      <Input
                        type="date"
                        value={form.birthDate}
                        onChange={(e) => set("birthDate", e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Asal Sekolah">
                    <Input
                      value={form.originSchool}
                      onChange={(e) => set("originSchool", e.target.value)}
                      placeholder="SMPN 1 Jakarta"
                    />
                  </Field>
                </>
              ) : step === 1 ? (
                <>
                  <Field label="Nama Orang Tua / Wali" required>
                    <Input
                      value={form.parentName}
                      onChange={(e) => set("parentName", e.target.value)}
                      placeholder="Siti Aminah"
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="No. HP Orang Tua">
                      <Input
                        value={form.parentPhone}
                        onChange={(e) => set("parentPhone", e.target.value)}
                        placeholder="0812..."
                      />
                    </Field>
                    <Field label="Pekerjaan">
                      <Input
                        value={form.parentJob}
                        onChange={(e) => set("parentJob", e.target.value)}
                        placeholder="Ibu Rumah Tangga"
                      />
                    </Field>
                  </div>
                  <Field label="Email (opsional)">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="ortu@example.com"
                    />
                  </Field>
                </>
              ) : step === 2 ? (
                <>
                  <Alert variant="info" className="text-sm">
                    Format JPG/PNG/PDF maks 5MB per file. Draft tersimpan otomatis di perangkat
                    Anda.
                  </Alert>
                  <Field label="KK (wajib)">
                    <Input type="file" accept=".jpg,.jpeg,.png,.pdf" aria-describedby="kk-hint" />
                    <p id="kk-hint" className="text-xs text-neutral-500">
                      Pilih file KK hasil scan/foto.
                    </p>
                  </Field>
                  <Field label="Akta Lahir (wajib)">
                    <Input type="file" accept=".jpg,.jpeg,.png,.pdf" />
                  </Field>
                  <Field label="Rapor Semester 1 (opsional)">
                    <Input type="file" accept=".jpg,.jpeg,.png,.pdf" />
                  </Field>
                </>
              ) : (
                <>
                  <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
                    <p>
                      <strong>Calon:</strong> {form.fullName} (
                      {form.gender === "L" ? "Laki-laki" : "Perempuan"}) — {form.birthPlace},{" "}
                      {form.birthDate || "-"}
                    </p>
                    <p>
                      <strong>Asal sekolah:</strong> {form.originSchool || "-"} ·{" "}
                      <strong>NISN:</strong> {form.nisn || "-"}
                    </p>
                    <p>
                      <strong>Orang tua:</strong> {form.parentName || "-"} ·{" "}
                      {form.parentPhone || "-"}
                    </p>
                  </div>
                  <label className="flex items-start gap-3 rounded-md border border-neutral-200 px-3 py-3">
                    <Checkbox
                      checked={form.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-neutral-700">
                      Saya sebagai orang tua/wali menyetujui pengolahan data anak (data pribadi)
                      oleh sekolah sesuai ketentuan UU PDP untuk keperluan pendaftaran. Persetujuan
                      ini direkam dengan waktu.
                    </span>
                  </label>
                </>
              )}

              {error ? (
                <div role="alert" aria-live="assertive">
                  <Alert variant="danger" className="text-sm">
                    {error}
                  </Alert>
                </div>
              ) : null}

              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  Kembali
                </Button>
                {step === STEPS.length - 1 ? (
                  <Button type="submit" loading={saving}>
                    Kirim Pendaftaran
                  </Button>
                ) : (
                  <Button type="submit">Lanjut</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Draft tersimpan otomatis (autosave lokal).
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required ? <span className="text-danger-600">*</span> : null}
      </Label>
      <div id={id}>{children}</div>
    </div>
  );
}
