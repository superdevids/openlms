"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type JSX,
  type ReactElement,
  type ReactNode,
  type RefObject
} from "react";

import Link from "next/link";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  Checkbox,
  Alert,
  Steps,
  Progress,
  toast,
  IconCheck
} from "@opensis/ui";
import { APP_NAME } from "@/lib/constants";
import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";
import { PageContainer, FormSection, ValidationAlert } from "@/components/ui";

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

const EMPTY_FORM = {
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
};

/** Bucket PPDB publik (R-17) — upload tanpa login via /storage/files/public/:bucket. */
const PPDB_DOCUMENTS_BUCKET = "ppdb-documents";
const PPDB_CONSENTS_BUCKET = "ppdb-consents";
/** Batas 5MB per bucket PPDB (storage.constants R-18) — cek client sebelum upload. */
const PPDB_MAX_BYTES = 5 * 1024 * 1024;
const PPDB_ACCEPT = ".jpg,.jpeg,.png,.pdf";

type PpdFile = { name: string; size: number } | null;

export default function PPDBDaftarPage(): JSX.Element {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ registrationNo: string } | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  // File pendaftaran (R-17): KK/Akta wajib, Rapor opsional → ppdb-documents;
  // bukti persetujuan (consent) → ppdb-consents, wajib (ConsentProofDto.documentUrl).
  const [kk, setKk] = useState<PpdFile>(null);
  const [akta, setAkta] = useState<PpdFile>(null);
  const [rapor, setRapor] = useState<PpdFile>(null);
  const [consentProof, setConsentProof] = useState<PpdFile>(null);
  const kkInput = useRef<HTMLInputElement>(null);
  const aktaInput = useRef<HTMLInputElement>(null);
  const raporInput = useRef<HTMLInputElement>(null);
  const consentInput = useRef<HTMLInputElement>(null);

  // Autosave draft lokal (G10) — sessionStorage via storage.ts (R-23):
  // draft berisi PII, jangan disimpan permanen; hilang saat tab ditutup.
  useEffect(() => {
    const t = window.setTimeout(() => {
      safeSet(STORAGE_KEYS.ppdbDraft, form, "session");
    }, 600);
    return () => window.clearTimeout(t);
  }, [form]);

  useEffect(() => {
    const raw = safeGet<typeof form>(STORAGE_KEYS.ppdbDraft, "session");
    if (raw) setForm((f) => ({ ...f, ...raw }));
  }, []);

  const clearDraft = (): void => {
    safeRemove(STORAGE_KEYS.ppdbDraft, "session");
    setForm(EMPTY_FORM);
    setStep(0);
    setError(null);
    toast({ variant: "info", title: "Draft dihapus" });
  };

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]): void => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const next = (e: FormEvent): void => {
    e.preventDefault();
    setError(null);
    if (step === 0 && !form.fullName.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (step === 2 && !kk) {
      setError("Unggah file KK (wajib) sebelum lanjut.");
      return;
    }
    if (step === 2 && !akta) {
      setError("Unggah file Akta Lahir (wajib) sebelum lanjut.");
      return;
    }
    if (step === 3 && !form.consent) {
      setError("Centang persetujuan data anak (wajib) sebelum mengirim.");
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  /** Simpan metadata file terpilih + validasi ukuran (5MB) & tipe client-side. */
  const pickFile = (
    input: RefObject<HTMLInputElement | null>,
    setter: (f: PpdFile) => void
  ): void => {
    const file = input.current?.files?.[0];
    if (!file) {
      setter(null);
      return;
    }
    if (file.size > PPDB_MAX_BYTES) {
      setError("File maksimal 5MB per berkas.");
      setter(null);
      return;
    }
    setter({ name: file.name, size: file.size });
  };

  /** Upload ke bucket publik PPDB → kembalikan path objek (R-17). */
  const uploadPpdFile = async (bucket: string, file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<{ path: string }>(`/storage/files/public/${bucket}`, form);
    return res.path;
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.consent) {
      setError("Centang persetujuan data anak (wajib) sebelum mengirim.");
      return;
    }
    if (!kk) {
      setError("Unggah file KK (wajib) sebelum mengirim.");
      return;
    }
    if (!akta) {
      setError("Unggah file Akta Lahir (wajib) sebelum mengirim.");
      return;
    }
    if (!consentProof) {
      setError("Unggah bukti persetujuan (wajib) sebelum mengirim.");
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
        const kkFile = kkInput.current?.files?.[0];
        const aktaFile = aktaInput.current?.files?.[0];
        const raporFile = raporInput.current?.files?.[0];
        const consentFile = consentInput.current?.files?.[0];
        if (!kkFile || !aktaFile || !consentFile) {
          throw new ApiError(400, "VALIDATION_ERROR", "File wajib belum terpilih.");
        }

        // Upload dokumen pendaftaran → ppdb-documents; bukti consent → ppdb-consents.
        const documents: { type: string; url: string }[] = [
          { type: "KK", url: await uploadPpdFile(PPDB_DOCUMENTS_BUCKET, kkFile) },
          { type: "AKTA", url: await uploadPpdFile(PPDB_DOCUMENTS_BUCKET, aktaFile) }
        ];
        if (raporFile) {
          documents.push({
            type: "RAPOR",
            url: await uploadPpdFile(PPDB_DOCUMENTS_BUCKET, raporFile)
          });
        }
        const consentUrl = await uploadPpdFile(PPDB_CONSENTS_BUCKET, consentFile);

        const res = await api.post<{ registration_no: string }>("/ppdb/register", {
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
          documents,
          consent: { parentName: form.parentName, documentUrl: consentUrl }
        });
        reg = res.registration_no;
      }
      safeRemove(STORAGE_KEYS.ppdbDraft, "session");
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
      <main id="main" className="min-h-screen bg-background">
        <PageContainer className="max-w-lg">
          <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg"
                aria-hidden="true"
              >
                <IconCheck className="h-7 w-7" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Pendaftaran Terkirim
              </h1>
              <p className="text-sm text-muted-foreground">Simpan nomor pendaftaran Anda:</p>
              <p className="rounded-lg bg-muted px-6 py-3 font-mono text-2xl font-bold text-foreground">
                {result.registrationNo}
              </p>
              <p className="text-sm text-muted-foreground">
                Gunakan nomor ini untuk cek status. Verifikasi dokumen oleh TU.
              </p>
              <Link href="/ppdb/status">
                <Button variant="outline">Cek Status</Button>
              </Link>
            </CardContent>
          </Card>
        </PageContainer>
      </main>
    );
  }

  return (
    <main id="main" className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/ppdb" className="text-sm font-medium text-primary">
            &larr; Halaman PPDB
          </Link>
          <p className="text-lg font-bold text-primary">{APP_NAME}</p>
        </div>
      </header>

      <PageContainer className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Formulir Pendaftaran</h1>
        <Steps steps={STEPS} current={step} className="mt-4" />
        <Progress value={(step / STEPS.length) * 100} className="my-4" />

        <Card className="rounded-lg border-border bg-app-surface p-6 shadow-app-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle>
              Langkah {step + 1} dari 4: {STEPS[step].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <form
              onSubmit={step === STEPS.length - 1 ? (e) => void submit(e) : next}
              className="space-y-4"
            >
              {step === 0 ? (
                <FormSection title="Data Calon" id="step-0">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Field label="Nama Lengkap" required>
                      <Input
                        value={form.fullName}
                        onChange={(e) => set("fullName", e.target.value)}
                        placeholder="Budi Santoso"
                      />
                    </Field>
                  </div>
                  <Field label="NISN (opsional)">
                    <Input
                      value={form.nisn}
                      onChange={(e) => set("nisn", e.target.value.replace(/\D/g, "").slice(0, 10))}
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <Field label="Asal Sekolah">
                      <Input
                        value={form.originSchool}
                        onChange={(e) => set("originSchool", e.target.value)}
                        placeholder="SMPN 1 Jakarta"
                      />
                    </Field>
                  </div>
                </FormSection>
              ) : step === 1 ? (
                <FormSection title="Data Orang Tua" id="step-1">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Field label="Nama Orang Tua / Wali" required>
                      <Input
                        value={form.parentName}
                        onChange={(e) => set("parentName", e.target.value)}
                        placeholder="Siti Aminah"
                      />
                    </Field>
                  </div>
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <Field label="Email (opsional)">
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="ortu@example.com"
                      />
                    </Field>
                  </div>
                </FormSection>
              ) : step === 2 ? (
                <div className="space-y-4">
                  <Alert variant="info" className="text-sm">
                    Format JPG/PNG/PDF maks 5MB per file. Draft tersimpan otomatis di perangkat
                    Anda.
                  </Alert>
                  <Field label="KK (wajib)">
                    <Input
                      ref={kkInput}
                      type="file"
                      accept={PPDB_ACCEPT}
                      aria-describedby="kk-hint"
                      onChange={() => pickFile(kkInput, setKk)}
                    />
                    <p id="kk-hint" className="text-xs text-muted-foreground">
                      {kk ? `Terpilih: ${kk.name}` : "Pilih file KK hasil scan/foto."}
                    </p>
                  </Field>
                  <Field label="Akta Lahir (wajib)">
                    <Input
                      ref={aktaInput}
                      type="file"
                      accept={PPDB_ACCEPT}
                      aria-describedby="akta-hint"
                      onChange={() => pickFile(aktaInput, setAkta)}
                    />
                    <p id="akta-hint" className="text-xs text-muted-foreground">
                      {akta ? `Terpilih: ${akta.name}` : "Pilih file Akta hasil scan/foto."}
                    </p>
                  </Field>
                  <Field label="Rapor Semester 1 (opsional)">
                    <Input
                      ref={raporInput}
                      type="file"
                      accept={PPDB_ACCEPT}
                      aria-describedby="rapor-hint"
                      onChange={() => pickFile(raporInput, setRapor)}
                    />
                    <p id="rapor-hint" className="text-xs text-muted-foreground">
                      {rapor ? `Terpilih: ${rapor.name}` : "Pilih file rapor (jika ada)."}
                    </p>
                  </Field>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 rounded-md border border-border bg-background p-4 text-sm">
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
                  <Field label="Bukti persetujuan (wajib)">
                    <Input
                      ref={consentInput}
                      type="file"
                      accept={PPDB_ACCEPT}
                      aria-describedby="consent-hint"
                      onChange={() => pickFile(consentInput, setConsentProof)}
                    />
                    <p id="consent-hint" className="text-xs text-muted-foreground">
                      {consentProof
                        ? `Terpilih: ${consentProof.name}`
                        : "Upload scan formulir/KK yang ditandatangani sebagai bukti persetujuan."}
                    </p>
                  </Field>
                  <label className="flex items-start gap-3 rounded-md border border-border px-3 py-3">
                    <Checkbox
                      checked={form.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-foreground">
                      Saya sebagai orang tua/wali menyetujui pengolahan data anak (data pribadi)
                      oleh sekolah sesuai ketentuan UU PDP untuk keperluan pendaftaran. Persetujuan
                      ini direkam dengan waktu.
                    </span>
                  </label>
                </div>
              )}

              <ValidationAlert errors={error ? [error] : undefined} />

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
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Draft tersimpan otomatis di tab ini (hilang saat tab ditutup).
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={clearDraft}>
            Hapus draft
          </Button>
        </div>
      </PageContainer>
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
  children: ReactNode;
}): JSX.Element {
  const id = useId();
  // Label htmlFor harus menunjuk ke elemen form (Input/Select), bukan wrapper div.
  const control =
    isValidElement<{ id?: string }>(children) && children.type !== "div"
      ? cloneElement(children as ReactElement<{ id?: string }>, { id })
      : children;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required ? <span className="text-status-danger-fg">*</span> : null}
      </Label>
      {control}
    </div>
  );
}
