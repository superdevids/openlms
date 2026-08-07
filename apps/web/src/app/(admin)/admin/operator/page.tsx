"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, CardHeader, CardTitle, CardDescription, Tabs, TabPanel, Button, Input, Label, Select, Badge, Alert, Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, toast, IconUpload, IconDownload, IconUser } from "@openlms/ui";

interface Applicant {
  id: string;
  registrationNo: string;
  fullName: string;
  status: "SUBMITTED" | "VERIFIED" | "SELECTED" | "ENROLLED" | "REJECTED";
}

interface StudentRow {
  id: string;
  fullName: string;
  nisn: string;
  className: string;
}

const DEMO_APPLICANTS: Applicant[] = [
  { id: "app_1", registrationNo: "PPDB-2026-0001", fullName: "Budi Santoso", status: "SUBMITTED" },
  { id: "app_2", registrationNo: "PPDB-2026-0002", fullName: "Siti Aminah", status: "VERIFIED" },
  { id: "app_3", registrationNo: "PPDB-2026-0003", fullName: "Dewi Lestari", status: "SELECTED" }
];

const DEMO_STUDENTS: StudentRow[] = [
  { id: "std_1", fullName: "Andi Setiawan", nisn: "0081234567", className: "XI IPA 1" },
  { id: "std_2", fullName: "Sari Wulandari", nisn: "0087654321", className: "XI IPA 1" }
];

export default function AdminOperatorPage(): React.JSX.Element {
  const [tab, setTab] = React.useState("siswa");
  const students = useApi<StudentRow[]>(() => api.get("/classes"), [], {
    fallbackData: DEMO_STUDENTS
  });
  const applicants = useApi<Applicant[]>(() => api.get("/ppdb/applicants"), [], {
    fallbackData: DEMO_APPLICANTS
  });

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteUsername, setInviteUsername] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("GURU");
  const [inviteClass, setInviteClass] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [importState, setImportState] = React.useState<"idle" | "preview" | "done">("idle");

  const invite = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({ variant: "success", title: "Undangan dikirim (demo)" });
      } else {
        await api.post("/app/invitations", {
          username: inviteUsername,
          role: inviteRole,
          classIds: inviteClass ? [inviteClass] : []
        });
        toast({ variant: "success", title: "Undangan dikirim" });
      }
      setInviteOpen(false);
      setInviteUsername("");
    } catch {
      toast({ variant: "error", title: "Gagal mengirim undangan" });
    } finally {
      setSaving(false);
    }
  };

  const runImport = async (): Promise<void> => {
    setImportState("preview");
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      setImportState("done");
      toast({
        variant: "success",
        title: "Impor selesai (demo)",
        description: "244 berhasil, 4 dilewati"
      });
      return;
    }
    try {
      await api.post("/app/import", { type: "STUDENTS" });
      setImportState("done");
      toast({ variant: "success", title: "Impor selesai" });
    } catch {
      setImportState("idle");
      toast({ variant: "error", title: "Gagal memulai impor" });
    }
  };

  const verifyApplicant = async (id: string): Promise<void> => {
    try {
      if (!DEMO_MODE) await api.patch(`/ppdb/applicants/${id}/verify`, {});
      toast({ variant: "success", title: "Dokumen diverifikasi" });
      applicants.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal memverifikasi" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Operator / Tata Usaha</h1>
          <p className="text-sm text-neutral-600">
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
                      <TableHead>Nama</TableHead>
                      <TableHead>NISN</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(students.data ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.fullName}</TableCell>
                        <TableCell>{s.nisn}</TableCell>
                        <TableCell>{s.className}</TableCell>
                        <TableCell>
                          <Badge variant="success">AKTIF</Badge>
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
              Upload Excel → validasi → preview error per baris → impor parsial yang aman.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {importState === "idle" ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline">
                  <IconDownload className="h-4 w-4" /> Unduh Template
                </Button>
                <Button onClick={() => void runImport()}>
                  <IconUpload className="h-4 w-4" /> Pilih File Excel &amp; Validasi
                </Button>
              </div>
            ) : importState === "preview" ? (
              <div aria-busy="true" className="space-y-3">
                <Alert variant="info" className="text-sm">
                  Validasi: 248 baris · 4 error ditemukan
                </Alert>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Baris</TableHead>
                      <TableHead>Kolom</TableHead>
                      <TableHead>Masalah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>12</TableCell>
                      <TableCell>NISN</TableCell>
                      <TableCell>Duplikat (sudah ada)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>57</TableCell>
                      <TableCell>Nama</TableCell>
                      <TableCell>Kosong</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">Perbaiki file</Button>
                  <Button onClick={() => void runImport()}>Impor 244 valid</Button>
                </div>
              </div>
            ) : (
              <div role="status">
                <Alert variant="success" className="text-sm">
                  Hasil: 244 berhasil · 4 dilewati (lihat log)
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
              description="Formulir PPDB publik akan mengisi daftar ini."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Pendaftaran</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
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
                                    : "success"
                            }
                          >
                            {a.status === "SUBMITTED"
                              ? "Terdaftar"
                              : a.status === "VERIFIED"
                                ? "Dokumen OK"
                                : a.status === "SELECTED"
                                  ? "Diterima"
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
          <div className="space-y-1.5">
            <Label htmlFor="inv-class">Kelas (opsional)</Label>
            <Input
              id="inv-class"
              value={inviteClass}
              onChange={(e) => setInviteClass(e.target.value)}
              placeholder="cls_1"
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
