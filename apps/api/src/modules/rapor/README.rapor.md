# README.rapor.md — Modul Rapor (apps/api/src/modules/rapor)

## Fungsi Folder

e-Rapor Kurikulum Merdeka **v2** (G-49): konsolidasi nilai akhir siswa dari
tabel `Grade` secara on-the-fly + track proyek P5 manual (`RaporP5`) +
**ekspor PDF per siswa**. Scope v2 **tanpa** status/approval rapor oleh KEPSEK
(itu **v2.1 — roadmap, belum**); integrasi file dengan aplikasi e-Rapor resmi
Kemdikbud juga roadmap. Komputasi murni di `rapor-compute.ts` (tanpa I/O,
mudah diuji unit); akses data dibatasi scope RBAC di `rapor-scope.ts`
(SEKOLAH/KELAS/SENDIRI + `ParentStudentLink` APPROVED untuk WALI_MURID).
PDF di-generate **hand-rolled** di `rapor-pdf.ts` (tanpa dependency npm;
header identitas → tabel mapel → seksi P5 → footer **"Draft Sistem"**).

## Daftar Fitur

- Rapor per siswa: header (nama, kelas, semester, tahun ajaran) + per-mapel
  (rincian tipe TUGAS/KUIS/UJIAN/SUMATIF/PRAKTIK/SIKAP + nilai akhir + predikat)
  - daftar proyek P5.
- Rapor per kelas: ringkasan per siswa per mapel (`nilaiAkhir` + `predikat`).
- Daftar siswa per kelas (Enrollment ACTIVE) — dropdown guru/petugas.
- Track P5 manual: upsert/delete proyek `RaporP5` (unique
  `[student, semester, academicYear, projectName]`), tercatat di `AuditLog`.
- Pengaturan bobot tipe nilai (`raporWeights`) disimpan di
  `SchoolProfile.settings` — bobot default TUGAS 20 / KUIS 20 / UJIAN 30 /
  SUMATIF 30; PRAKTIK/SIKAP tanpa bobot default (bisa diaktifkan via
  pengaturan).
- Rumus: rata-rata tipe = `round(Σ(score × weight) / Σ(weight))` per tipe;
  nilai akhir = `round(Σ(rata_tipe × bobot_tipe) / Σ(bobot_tipe))` hanya untuk
  tipe dengan bobot > 0 dan ≥1 grade valid; skor non-finite di-skip; tanpa
  tipe valid → `nilaiAkhir null`. Predikat: ≥90 A, ≥80 B, ≥70 C, ≥60 D, sisanya E.
- **Ekspor PDF per siswa (v2)**: `POST /rapor/:studentId/export-pdf` membuat
  `DataExportLog` (RAPOR, PENDING) lalu enqueue job `report.generate`
  (`ReportProcessor` → `RaporExportService`); PDF hand-rolled `rapor-pdf.ts`
  (footer "Draft Sistem"); status & unduh via `GET /exports/:id` +
  `GET /exports/:id/download?file=…` (modul `export`). RBAC:
  `report:export:self` (SISWA/WALI_MURID untuk anak via
  `ParentStudentLink` APPROVED) / `report:export:class` / `report:export:school`.

## Endpoint (prefix global `/api/v1`)

| Method | Path                           | Permission                                                            | Deskripsi                                                            |
| ------ | ------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| GET    | `/rapor/:studentId`            | `report:read:self` / `report:read:class` / `report:read:school`       | Rapor lengkap satu siswa (query `semester`, `academicYear` opsional) |
| GET    | `/rapor/class/:classId`        | `report:read:class` / `report:read:school`                            | Rapor ringkas per kelas                                              |
| GET    | `/rapor/students`              | `report:read:class` / `report:read:school`                            | Daftar siswa (query `classId` opsional)                              |
| GET    | `/rapor/settings`              | `report:read:school`                                                  | Baca bobot rapor                                                     |
| PUT    | `/rapor/settings`              | `rapor:write:school`                                                  | Simpan `raporWeights` (dinormalkan)                                  |
| POST   | `/rapor/p5`                    | `rapor:p5:write:class` / `rapor:p5:write:school`                      | Upsert proyek P5 manual                                              |
| DELETE | `/rapor/p5/:id`                | `rapor:p5:write:class` / `rapor:p5:write:school`                      | Hapus proyek P5                                                      |
| POST   | `/rapor/:studentId/export-pdf` | `report:export:self` / `report:export:class` / `report:export:school` | Buat ekspor PDF rapor siswa (job async, footer "Draft Sistem")       |

Catatan: rute param `:studentId` dideklarasikan TERAKHIR agar literal
(`p5`/`class`/`students`/`settings`) tidak tertelan. Unduh hasil ekspor
memakai endpoint modul `export`: `GET /exports/:id` (metadata) +
`GET /exports/:id/download?file=<nama>` (file — pemilik log ATAU
`export:read:school`).

## Scope Akses (row-level, `rapor-scope.ts`)

- **SEKOLAH** (KEPSEK/WAKEPSEK/BK/OPERATOR/SUPERADMIN + KEUANGAN/AUDITOR/
  KAPRODI via `SCHOOL_SCOPED_ROLES`): boleh baca semua siswa.
- **KELAS** (GURU): hanya siswa di kelas ampu/homeroom (`ctx.classIds` /
  `ctx.homeroomClassId`).
- **SENDIRI** (SISWA): hanya `studentId === userId`.
- **WALI_MURID**: hanya anak via `ParentStudentLink` status **APPROVED**
  (pola SEC-001).
- Tulis P5: scope sekolah bebas; GURU wajib punya `rapor:p5:write:class` dan
  siswa berada di kelas ampu; selain itu → 403.

## Struktur File

| Path                    | Isi                                                                         |
| ----------------------- | --------------------------------------------------------------------------- |
| `rapor.controller.ts`   | REST endpoint (8) + dekorator RBAC                                          |
| `rapor.service.ts`      | Orchestrasi: resolve tahun ajaran, bobot, komputasi, request ekspor         |
| `rapor-compute.ts`      | Komputasi murni (rata-rata tipe, nilai akhir, predikat) + normalisasi bobot |
| `rapor-pdf.ts`          | Generator PDF hand-rolled (tanpa dependency; footer "Draft Sistem")         |
| `rapor-scope.ts`        | Helper scope baca rapor & tulis P5 (row-level)                              |
| `dto/rapor.dto.ts`      | DTO (RecordRaporP5Dto, UpdateRaporSettingsDto, query)                       |
| `rapor.module.ts`       | Registrasi modul                                                            |
| `rapor.service.spec.ts` | 16 test — scope RBAC, upsert P5, settings                                   |
| `rapor-compute.spec.ts` | 9 test — aritmetika, bobot kustom, predikat, edge case                      |
| `rapor-pdf.spec.ts`     | Test layout PDF (seksi P5, footer "Draft Sistem")                           |
