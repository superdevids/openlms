# README.api-src.md — Struktur Aplikasi API (apps/api)

## Fungsi Folder

`apps/api/src/` berisi aplikasi backend **NestJS 11** untuk opensis. Backend ini
menyediakan REST API (prefix global `/api/v1`), real-time via Socket.IO (namespace
`/ws`), otorisasi RBAC fail-closed, serta antrean job opsional (BullMQ/in-process).

## Struktur Folder

| Path                | Isi                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`       | Bootstrap NestJS (helmet, CORS dari `CORS_ORIGINS`, trust proxy, pino)                                         |
| `src/app.module.ts` | Module agregator: semua modul domain + middleware global (RequestId, RateLimit)                                |
| `src/common/`       | Infrastruktur lintas-modul: guard, decorator, filter, middleware, cache util (lihat `common/README.common.md`) |
| `src/modules/`      | Modul domain — satu folder per fitur (lihat tabel di bawah)                                                    |

## Modul (apps/api/src/modules)

| Modul         | Path             | Fungsi                                                                                               |
| ------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| Auth          | `auth/`          | Login email/username + password (Argon2id), JWT httpOnly, refresh rotation, undangan, reset password |
| Health        | `health/`        | Healthcheck `GET /api/v1/health` (publik)                                                            |
| FeatureFlags  | `feature-flags/` | Konsol feature flag (SUPERADMIN) + guard `@Feature`                                                  |
| AppSettings   | `app-settings/`  | Pengaturan aplikasi (profil sekolah, tahun ajaran aktif)                                             |
| Onboarding    | `onboarding/`    | Wizard onboarding 5 langkah + impor data massal                                                      |
| Lms           | `lms/`           | Kelas, mapel, guru pengampu, enrollment, jadwal, materi, tugas, submission, nilai                    |
| Quiz          | `quiz/`          | Bank soal, kuis, attempt (start/save/submit/auto-submit)                                             |
| Exam          | `exam/`          | Ujian online: paket, sesi, token, attempt, autosave, analisis butir                                  |
| Attendance    | `attendance/`    | Absensi manual, sesi QR/geofencing, izin/sakit, rekap, kedisiplinan                                  |
| Finance       | `finance/`       | Tagihan SPP, pembayaran, denda, refund, rekonsiliasi, arus kas                                       |
| Payroll       | `payroll/`       | Struktur gaji, payroll run, payslip, laporan (PPh 21/BPJS)                                           |
| Asset         | `asset/`         | Inventaris, depresiasi, peminjaman, maintenance, audit/opname                                        |
| Academic      | `academic/`      | Prodi, kurikulum CP/ATP, jadwal akademik                                                             |
| Rollover      | `rollover/`      | Wizard rollover tahun ajaran (draft → precheck → dry-run → execute → rollback)                       |
| Ppdb          | `ppdb/`          | Pendaftaran publik, verifikasi, seleksi, waitlist, enroll                                            |
| Communication | `communication/` | Pengumuman, surat resmi, approval, tanda tangan                                                      |
| ParentPortal  | `parent-portal/` | Portal wali murid (link anak, lihat nilai/absensi/izin)                                              |
| Alumni        | `alumni/`        | Direktori & tracking lulusan                                                                         |
| Smk           | `smk/`           | PKL, jurnal, UKK, direktori DUDI                                                                     |
| Notifications | `notifications/` | Pusat notifikasi (inbox, unread count, mark read)                                                    |
| Realtime      | `realtime/`      | Gateway Socket.IO namespace `/ws`                                                                    |
| Storage       | `storage/`       | Upload & serve file lokal (`STORAGE_LOCAL_DIR`)                                                      |
| Branding      | `branding/`      | Identitas visual aplikasi (`/app/branding`, ETag config_version)                                     |
| Landing       | `landing/`       | Konten landing page publik + berita                                                                  |
| RbacAdmin     | `rbac-admin/`    | Konsol RBAC SUPERADMIN (permission, role-permission, user override)                                  |
| Queue         | `queue/`         | Abstraksi antrean job (BullMQ bila `REDIS_URL`, else in-process)                                     |
| Jobs          | `jobs/`          | Registrasi processor job + helper enqueue (SPP, payroll, rollover, report, notifikasi)               |
| Maintenance   | `maintenance/`   | Status sistem global / maintenance mode (SUPERADMIN)                                                 |
| Database      | `database/`      | Konstanta kecil (bukan modul NestJS terpisah)                                                        |

## Konvensi

- **RBAC fail-closed:** `AuthGuard` (global) → `PermissionsGuard` (`@RequirePermission`) →
  `FeatureFlagGuard` (`@Feature`). Aktor selalu dibaca dari `request.requestContext`,
  bukan header klien.
- **Kontrak endpoint per modul:** lihat `README.<modul>.md` di tiap folder.
- **Dokumen acuan:** `docs/02-technical-architecture.md`, `docs/04-api-contract.md`.
