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
  Tabs,
  TabPanel,
  Button,
  Input,
  Label,
  Select,
  Badge,
  Alert,
  Dialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  toast,
  IconUpload,
  IconDownload,
  IconUser
} from "@opensis/ui";

interface Applicant {
  id: string;
  registrationNo: string;
  fullName: string;
  status: "SUBMITTED" | "VERIFIED" | "SELECTED" | "WAITLIST" | "ENROLLED" | "REJECTED";
}

interface StudentRow {
  id: string;
  fullName: string;
  username: string | null;
  roles: string[];
  isActive: boolean;
}

interface ImportPreviewResult {
  importType: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  validRows: Record<string, unknown>[];
  errors: Array<{ rowNumber: number; field: string | null; message: string }>;
}

interface ImportRunResult {
  batchId: string;
  importType: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: string;
  errors: Array<{ rowNumber: number; field: string | null; message: string }>;
}

const DEMO_APPLICANTS: Applicant[] = [
  { id: "app_1", registrationNo: "PPDB-2026-0001", fullName: "Budi Santoso", status: "SUBMITTED" },
  { id: "app_2", registrationNo: "PPDB-2026-0002", fullName: "Siti Aminah", status: "VERIFIED" },
  { id: "app_3", registrationNo: "PPDB-2026-0003", fullName: "Dewi Lestari", status: "SELECTED" }
];

const DEMO_STUDENTS: StudentRow[] = [
  { id: "std_1", fullName: "Andi Setiawan", username: "andi.s", roles: ["SISWA"], isActive: true },
  { id: "std_2", fullName: "Sari Wulandari", username: "sari.w", roles: ["SISWA"], isActive: true }
];

const IMPORT_PREVIEW_EMPTY: ImportPreviewResult = {
  importType: "STUDENT",
  totalRows: 0,
  validCount: 0,
  errorCount: 0,
  validRows: [],
  errors: []
};

// Definisi kolom tabel — header dirender lewat KOLOM.map() agar konsisten.
const STUDENT_KOLOM: { key: string; label: string }[] = [
  { key: "nama", label: "Nama" },
  { key: "username", label: "Username" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" }
];

const ERROR_KOLOM: { key: string; label: string }[] = [
  { key: "baris", label: "Baris" },
  { key: "kolom", label: "Kolom" },
  { key: "masalah", label: "Masalah" }
];

const APPLICANT_KOLOM: { key: string; label: string }[] = [
  { key: "noPendaftaran", label: "No. Pendaftaran" },
  { key: "nama", label: "Nama" },
  { key: "status", label: "Status" },
  { key: "aksi", label: "Aksi" }
];

export default function AdminOperatorPage(): JSX.Element {
  const [tab, setTab] = useState("siswa");
  // Data Induk siswa: GET /admin/users → filter role SISWA (R-38).
  const students = useApi<StudentRow[]>(
    async () => {
      const res = await api.get<{ items: StudentRow[]; total: number }>("/admin/users");
      return (res.items ?? []).filter((u) => u.roles.includes("SISWA"));
    },
    [],
    { fallbackData: DEMO_STUDENTS }
  );
  // PPDB: GET /ppdb/selection — daftar calon SELECTED/WAITLIST (pengumuman).
  const applicants = useApi<Applicant[]>(
    async () => {
      const rows = await api.get<
        Array<{
          id: string;
          registration_no: string;
          full_name: string;
          status: string;
        }>
      >("/ppdb/selection");
      return rows.map((r) => ({
        id: r.id,
        registrationNo: r.registration_no,
        fullName: r.full_name,
        status: r.status as Applicant["status"]
      }));
    },
    [],
    { fallbackData: DEMO_APPLICANTS }
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState("GURU");
  const [saving, setSaving] = useState(false);
  const [importState, setImportState] = useState<"idle" | "preview" | "done">("idle");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [runResult, setRunResult] = useState<ImportRunResult | null>(null);

  const invite = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({ variant: "success", title: "Undangan dikirim (demo)" });
      } else {
        // InvitationDto: username/email opsional + fullName wajib + role.
        await api.post("/auth/invitations", {
          username: inviteUsername,
          fullName: inviteFullName || inviteUsername,
          role: inviteRole
        });
        toast({ variant: "success", title: "Undangan dikirim" });
      }
      setInviteOpen(false);
      setInviteUsername("");
      setInviteFullName("");
    } catch {
      toast({ variant: "error", title: "Gagal mengirim undangan" });
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async (): Promise<void> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      setPreview({
        importType: "STUDENT",
        totalRows: 248,
        validCount: 244,
        errorCount: 4,
        validRows: [],
        errors: [
          { rowNumber: 12, field: "NISN", message: "Duplikat (sudah ada)" },
          { rowNumber: 57, field: "Nama", message: "Kosong" }
        ]
      });
      setImportState("preview");
      return;
    }
    try {
      // ImportRowsDto: importType + rows. Belum ada upload file → rows kosong.
      const res = await api.post<ImportPreviewResult>("/app/import/preview", {
        importType: "STUDENT",
        rows: []
      });
      setPreview(res);
      setImportState("preview");
    } catch {
      setImportState("idle");
      toast({ variant: "error", title: "Gagal memvalidasi impor" });
    }
  };

  const runImport = async (): Promise<void> => {
    setImportState("preview");
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      setImportState("done");
      setRunResult({
        batchId: "batch_demo",
        importType: "STUDENT",
        totalRows: 248,
        successRows: 244,
        failedRows: 4,
        status: "COMPLETED",
        errors: []
      });
      toast({
        variant: "success",
        title: "Impor selesai (demo)",
        description: "244 berhasil, 4 dilewati"
      });
      return;
    }
    try {
      const rows = preview?.validRows ?? [];
      const res = await api.post<ImportRunResult>("/app/import/run", {
        importType: "STUDENT",
        rows
      });
      setRunResult(res);
      setImportState("done");
      toast({
        variant: "success",
        title: "Impor selesai",
        description: `${res.successRows} berhasil · ${res.failedRows} dilewati`
      });
    } catch {
      setImportState("idle");
      toast({ variant: "error", title: "Gagal memulai impor" });
    }
  };

  const verifyApplicant = async (id: string): Promise<void> => {
    try {
      if (!DEMO_MODE) await api.patch(`/ppdb/${id}/verify`, { approve: true });
      toast({ variant: "success", title: "Dokumen diverifikasi" });
      applicants.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal memverifikasi" });
    }
  };

  const previewData = preview ?? IMPORT_PREVIEW_EMPTY;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operator / Tata Usaha</h1>
          <p className="text-sm text-muted-foreground">
            Data induk, impor, undangan, verifikasi PPDB, pengaturan
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <IconUser className="h-4 w-4" /> Undang
        </Button>
      </div>

      <Tabs
        tabs={[
          { value: "siswa", label: "Data Induk" },
          { value: "impor", label: "Impor Data" },
          { value: "ppdb", label: "PPDB" },
          { value: "pengaturan", label: "Pengaturan" }
        ]}
        value={tab}
        onValueChange={setTab}
      />

      <TabPanel value="siswa" activeValue={tab}>
        <DataView
          status={students.status}
          error={students.error}
          onRetry={students.refetch}
          fallbackLabel="Data siswa"
        >
          {students.data?.length === 0 ? (
            <EmptyState
              title="Belum ada data"
              description="Impor atau tambahkan siswa untuk memulai."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {STUDENT_KOLOM.map((k) => (
                        <TableHead key={k.key}>{k.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(students.data ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.fullName}</TableCell>
                        <TableCell className="font-mono text-sm">{s.username ?? "-"}</TableCell>
                        <TableCell>{s.roles.join(", ")}</TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? "success" : "warning"}>
                            {s.isActive ? "AKTIF" : "NONAKTIF"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </DataView>
      </TabPanel>

      <TabPanel value="impor" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Wizard Impor Data (G9)</CardTitle>
            <CardDescription>
              Preview via POST /app/import/preview, commit via POST /app/import/run (parsial aman).
              Upload file Excel belum tersedia di UI ini — preview memakai baris kosong.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {importState === "idle" ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">
                  <IconDownload className="h-4 w-4" /> Unduh Template
                </Button>
                <Button onClick={() => void runPreview()}>
                  <IconUpload className="h-4 w-4" /> Pilih File Excel &amp; Validasi
                </Button>
              </div>
            ) : importState === "preview" ? (
              <div className="space-y-3">
                <Alert
                  variant={previewData.errorCount > 0 ? "warning" : "info"}
                  className="text-sm"
                >
                  Validasi: {previewData.totalRows} baris · {previewData.validCount} valid ·{" "}
                  {previewData.errorCount} error
                </Alert>
                {previewData.errors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {ERROR_KOLOM.map((k) => (
                          <TableHead key={k.key}>{k.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.errors.map((err, i) => (
                        <TableRow key={`${err.rowNumber}-${i}`}>
                          <TableCell>{err.rowNumber}</TableCell>
                          <TableCell>{err.field ?? "-"}</TableCell>
                          <TableCell>{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">Perbaiki file</Button>
                  <Button onClick={() => void runImport()} disabled={previewData.validCount === 0}>
                    Impor {previewData.validCount} valid
                  </Button>
                </div>
              </div>
            ) : (
              <div role="status">
                <Alert variant="success" className="text-sm">
                  Hasil: {runResult?.successRows ?? 0} berhasil · {runResult?.failedRows ?? 0}{" "}
                  dilewati (batch {runResult?.batchId ?? "-"})
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="ppdb" activeValue={tab}>
        <DataView
          status={applicants.status}
          error={applicants.error}
          onRetry={applicants.refetch}
          fallbackLabel="Daftar pendaftar PPDB"
        >
          {applicants.data?.length === 0 ? (
            <EmptyState
              title="Belum ada pendaftar"
              description="Pendaftar yang sudah diverifikasi/diseleksi akan tampil di sini (GET /ppdb/selection)."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {APPLICANT_KOLOM.map((k) => (
                        <TableHead key={k.key}>{k.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(applicants.data ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm">{a.registrationNo}</TableCell>
                        <TableCell className="font-medium">{a.fullName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              a.status === "SUBMITTED"
                                ? "warning"
                                : a.status === "VERIFIED"
                                  ? "info"
                                  : a.status === "SELECTED"
                                    ? "primary"
                                    : a.status === "WAITLIST"
                                      ? "warning"
                                      : "success"
                            }
                          >
                            {a.status === "SUBMITTED"
                              ? "Terdaftar"
                              : a.status === "VERIFIED"
                                ? "Dokumen OK"
                                : a.status === "SELECTED"
                                  ? "Diterima"
                                  : a.status === "WAITLIST"
                                    ? "Waitlist"
                                    : a.status === "ENROLLED"
                                      ? "Jadi Siswa"
                                      : "Ditolak"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {a.status === "SUBMITTED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void verifyApplicant(a.id)}
                            >
                              Verifikasi
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </DataView>
      </TabPanel>

      <TabPanel value="pengaturan" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Sekolah</CardTitle>
            <CardDescription>
              Identitas sekolah, tahun ajaran, ambang alpa, toggle fitur (data-saver, gamifikasi).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="set-npsn">NPSN</Label>
                <Input id="set-npsn" defaultValue="12345678" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-year">Tahun Ajaran Aktif</Label>
                <Input id="set-year" defaultValue="2026/2027" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-alpa">Ambang Alpa (per bulan)</Label>
              <Input id="set-alpa" type="number" defaultValue={3} />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => toast({ variant: "success", title: "Pengaturan disimpan (demo)" })}
              >
                Simpan Pengaturan
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <Dialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Undang Guru / Siswa / Staf"
        description="Undangan in-app tanpa email/SMS; status: terkirim → terpakai → kedaluwarsa (7 hari)."
      >
        <form onSubmit={(e) => void invite(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-username">Username (atau NISN)</Label>
            <Input
              id="inv-username"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              required
              placeholder="guru.2026"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-fullname">Nama Lengkap</Label>
            <Input
              id="inv-fullname"
              value={inviteFullName}
              onChange={(e) => setInviteFullName(e.target.value)}
              placeholder="Nama lengkap pengguna"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-role">Role</Label>
            <Select
              id="inv-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              options={[
                { value: "GURU", label: "Guru" },
                { value: "SISWA", label: "Siswa" },
                { value: "KEUANGAN", label: "Keuangan / TU" },
                { value: "WAKEPSEK", label: "Wakepsek" }
              ]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Kirim Undangan
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
