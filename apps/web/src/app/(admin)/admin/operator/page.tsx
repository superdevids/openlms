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
  Alert,
  Dialog,
  toast,
  IconUpload,
  IconDownload,
  IconUser
} from "@opensis/ui";

import { PageHeader, DataTable, StatusBadge, type DataTableColumn } from "@/components/ui";

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

const APPLICANT_STATUS_LABEL: Record<Applicant["status"], string> = {
  SUBMITTED: "Terdaftar",
  VERIFIED: "Dokumen OK",
  SELECTED: "Diterima",
  WAITLIST: "Waitlist",
  ENROLLED: "Jadi Siswa",
  REJECTED: "Ditolak"
};

const APPLICANT_COLUMNS: DataTableColumn<Applicant>[] = [
  {
    key: "registrationNo",
    label: "No. Pendaftaran",
    render: (a) => <span className="font-mono text-sm">{a.registrationNo}</span>
  },
  {
    key: "fullName",
    label: "Nama",
    render: (a) => <span className="font-medium">{a.fullName}</span>
  },
  {
    key: "status",
    label: "Status",
    render: (a) => <StatusBadge status={a.status} label={APPLICANT_STATUS_LABEL[a.status]} />
  }
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
      <PageHeader
        title="Operator / Tata Usaha"
        description="Data induk, impor, undangan, verifikasi PPDB, pengaturan"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <IconUser className="h-4 w-4" /> Undang
          </Button>
        }
      />

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
          <DataTable
            columns={[
              {
                key: "fullName",
                label: "Nama",
                render: (s) => <span className="font-medium">{s.fullName}</span>
              },
              {
                key: "username",
                label: "Username",
                render: (s) => <span className="font-mono text-sm">{s.username ?? "-"}</span>
              },
              { key: "roles", label: "Role", render: (s) => s.roles.join(", ") },
              {
                key: "status",
                label: "Status",
                render: (s) => (
                  <StatusBadge
                    status={s.isActive ? "AKTIF" : "NONAKTIF"}
                    mapping={{ NONAKTIF: "warning" }}
                  />
                )
              }
            ]}
            rows={students.data ?? []}
            keyField="id"
            emptyTitle="Belum ada data"
            emptyDesc="Impor atau tambahkan siswa untuk memulai."
          />
        </DataView>
      </TabPanel>

      <TabPanel value="impor" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
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
                  <DataTable
                    columns={[
                      { key: "rowNumber", label: "Baris", render: (err) => err.rowNumber },
                      { key: "field", label: "Kolom", render: (err) => err.field ?? "-" },
                      { key: "message", label: "Masalah" }
                    ]}
                    rows={previewData.errors}
                    keyField={(err) => `${err.rowNumber}-${err.field}`}
                    maxHeight="none"
                  />
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
          <DataTable
            columns={[
              ...APPLICANT_COLUMNS,
              {
                key: "aksi",
                label: "Aksi",
                render: (a) =>
                  a.status === "SUBMITTED" ? (
                    <Button size="sm" variant="outline" onClick={() => void verifyApplicant(a.id)}>
                      Verifikasi
                    </Button>
                  ) : null
              }
            ]}
            rows={applicants.data ?? []}
            keyField="id"
            emptyTitle="Belum ada pendaftar"
            emptyDesc="Pendaftar yang sudah diverifikasi/diseleksi akan tampil di sini (GET /ppdb/selection)."
          />
        </DataView>
      </TabPanel>

      <TabPanel value="pengaturan" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
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
