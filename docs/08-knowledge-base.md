# Project Knowledge Base — opensis

> Dokumen ini adalah **basis pengetahuan internal** yang merangkum pemahaman mendalam atas codebase opensis (repository: `openlms`): peta arsitektur, peta data, alur bisnis kritis, RBAC, infrastruktur, frontend, dan status kesehatan proyek. Dibuat dari hasil deep-dive atas dokumen teknis (`docs/01`–`docs/07`), kontrak modul (`apps/api/src/modules/*/README.*.md`), skema database, dan laporan audit. Angka di dokumen ini terverifikasi terhadap kode pada **8 Agustus 2026**.

**Cara pakai:** baca [Peta Arsitektur](#1-peta-arsitektur) dulu untuk konteks, lalu lompat ke bagian yang relevan. Ini dokumen hidup — perbarui saat ada keputusan arsitektur atau perubahan struktural.

---

## Daftar Isi

1. [Peta Arsitektur](#1-peta-arsitektur)
2. [Peta Data](#2-peta-data)
3. [Enam Alur Bisnis Kritis](#3-enam-alur-bisnis-kritis)
4. [RBAC: 3 Dimensi + Guard Chain](#4-rbac-3-dimensi--guard-chain)
5. [Realtime, Queue, Storage, Cache](#5-realtime-queue-storage-cache)
6. [Frontend](#6-frontend)
7. [Status Kesehatan Proyek](#7-status-kesehatan-proyek)
8. [Referensi](#8-referensi)

---

## 1. Peta Arsitektur

### 1.1 Komponen

| Komponen            | Path                | Peran                                                                           | Aturan batas                                                            |
| ------------------- | ------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/api`          | NestJS 11           | Semua logika bisnis, otorisasi, real-time gateway, storage file lokal           | Tidak boleh import komponen UI; tanpa dependensi API fitur pihak ketiga |
| `apps/web`          | Next.js App Router  | Presentasi, routing per role, state UI, PWA/offline, upload via API (multipart) | Tidak boleh query Prisma langsung; hanya via HTTP ke API                |
| `packages/database` | Prisma + PostgreSQL | Skema tunggal (90 model), client singleton, migrasi, seed, RLS opsional         | Tidak boleh berisi logika bisnis                                        |
| `packages/ui`       | shadcn/ui           | Komponen shared yang di-styling                                                 | Stateless; data lewat props                                             |
| `packages/types`    | TypeScript          | Enum & DTO bersama (satu sumber kebenaran tipe)                                 | Tanpa runtime berat                                                     |

Aturan dependensi (ditegakkan ESLint `import/no-restricted-paths` + Turborepo): `web → api` (HTTP), `web → packages/{ui,types}`, `api → packages/{database,types}`, `packages/database → packages/types` (enum).

### 1.2 Keputusan Arsitektur Kunci (ringkasan ADR, [docs/02 §16](02-technical-architecture.md))

- **ADR-001 — Single-school**: satu skema PostgreSQL untuk SATU sekolah; **tanpa `school_id`** di entitas; tanpa multi-tenant; RLS opsional (defense-in-depth, tanpa session var tenant — hanya `app.user_id`).
- **ADR-002 — Auth in-house**: Email/Username + Password (Argon2id), JWT httpOnly cookie, refresh rotation; tanpa OAuth/SSO.
- **ADR-003/004**: Turborepo; NestJS + Prisma.
- **ADR-005 — JWT = identitas**: role di-resolve dari tabel `UserRole` per request (cache 60 detik); JWT hanya membawa `sub`; perubahan role instan.
- **ADR-006 — Live class DITUNDA**: tanpa Jitsi/Zoom/Meet; MVP memakai tautan manual (`live_class_url`); bila dibangun = WebRTC self-hosted.

### 1.3 Alur Request

```
HTTP request
  → Nginx (rate limit, security headers, gzip, proxy WebSocket)
  → JWT middleware (verify JWT in-house, resolve UserRole, build RequestContext)
  → Rate limiter (login/ujian/scan QR lebih ketat)
  → Global guard RBAC (@RequirePermission + scope, @Public)
  → Controller (validasi DTO, status HTTP)
    → Service (logika bisnis, transaksi, event emit, AuditLog untuk aksi sensitif)
      → Repository (query Prisma, wajib filter scope SENDIRI/KELAS/SEKOLAH)
        → PostgreSQL (RLS opsional — defense-in-depth, tanpa session var tenant)
  → Response + requestId + audit log (jika sensitif)
```

Lapisan API: **Controller → Service → Repository**. Controller hanya parse request/response + dekorator RBAC; Service berisi business logic + `$transaction` + emit Socket.IO + tulis `AuditLog`; Repository memuat semua query Prisma dengan filter scope wajib.

---

## 2. Peta Data

Skema Prisma: **90 model** + **62 enum** (`packages/database/prisma/schema.prisma`). Konvensi field: `id String @id @default(cuid())`, `created_at DateTime @default(now())`, `updated_at DateTime @updatedAt`.

### 2.1 Model per Domain

| Domain                      | Model (jumlah)                                                                                                                                     | Catatan                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Profil & Auth**           | `SchoolProfile`, `User`, `UserRole`, `RefreshToken` (4)                                                                                            | `UserRole` = satu-satunya otoritas role; `SchoolProfile.npsn` unik; lockout `failed_login_attempts`                          |
| **Akademik**                | `Class`, `Subject`, `ClassSubject`, `ScheduleEntry`, `Enrollment`, `Grade`, `CurriculumReference` (7)                                              | Wali kelas = `Class.homeroom_teacher_id` (scope override); `EnrollmentStatus` menyimpan riwayat rollover (PROMOTED/REPEATED) |
| **LMS**                     | `Material`, `Assignment`, `Submission` (3)                                                                                                         | Unique `(assignment_id, student_id)`; submission LATE/GRADED/RETURNED                                                        |
| **Kuis**                    | `Quiz`, `Question`, `QuizAttempt` (3)                                                                                                              | `Question` dipakai bersama kuis & ujian (bank soal); tipe PILIHAN_GANDA/ESAI/ISIAN_SINGKAT/MENJODOHKAN                       |
| **Ujian**                   | `Exam`, `ExamPackage`, `ExamSession`, `ExamAttempt`, `ExamAnswerLog` (5)                                                                           | Unique `(exam_session_id, student_id)`; `ExamAnswerLog` append-only; token sesi di-hash                                      |
| **Absensi**                 | `Attendance`, `AttendanceSession`, `AttendanceQrToken`, `AttendanceRecord`, `Permit` (5)                                                           | Unique `(student_id, class_subject_id, date)`; QR token sekali pakai dengan hash                                             |
| **Kesiswaan/BK**            | `CounselingNote`, `DisciplinePoint`, `DisciplineRecord`, `Extracurricular`, `ExtracurricularEnrollment`, `Achievement` (6)                         | `CounselingNote` field-level access: hanya BK/WAKEPSEK/KEPSEK                                                                |
| **Staff**                   | `Staff`, `StaffAttendance` (2)                                                                                                                     | Status ACTIVE/INACTIVE/RESIGNED                                                                                              |
| **Aset**                    | `Asset`, `AssetBooking`, `AssetMaintenance`, `AssetAudit` (4)                                                                                      | Booking cek bentrok jadwal; penyusutan via kalkulator terpisah                                                               |
| **Perpustakaan**            | `LibraryBook`, `LibraryLoan` (2)                                                                                                                   | Status BORROWED/RETURNED/OVERDUE/LOST                                                                                        |
| **Keuangan**                | `Invoice`, `Payment`, `LateFeeRule`, `DendaInvoice`, `Refund`, `ReconciliationBatch`, `ReconciliationItem`, `CashFlowRecord` (8)                   | Kalkulator sen (`calculator/money`); carry-over tahun ajaran; approval berjenjang                                            |
| **Payroll**                 | `JobPosition`, `PayrollComponent`, `SalaryStructure`, `PayrollPeriodConfig`, `PayrollRun`, `PayrollRunItem`, `Payslip` (7)                         | Run lifecycle berjenjang; payslip scope `self` (anti-IDOR)                                                                   |
| **PPDB**                    | `PpdbApplicant`, `ParentalConsent` (2)                                                                                                             | Registrasi publik; status DRAFT→…→ENROLLED                                                                                   |
| **Komunikasi**              | `Announcement`, `OfficialLetter`, `Notification` (3)                                                                                               | Notification punya target role/room untuk realtime                                                                           |
| **Wali**                    | `ParentGuardian`, `ParentStudentLink` (2)                                                                                                          | Portal read-only                                                                                                             |
| **SMK**                     | `Internship`, `InternshipJournal`, `InternshipPartner`, `IndustryMentor`, `CompetencyTest`, `CompetencyRubricItem`, `Prodi` (7)                    | PKL + UKK; rubrik kompetensi                                                                                                 |
| **Ekspor/Impor/Retensi**    | `DataExportLog`, `DataRetentionPolicy`, `ImportBatch`, `ImportError` (4)                                                                           | Template Excel; kebijakan retensi (archive/delete/anonymize)                                                                 |
| **Audit**                   | `AuditLog` (1)                                                                                                                                     | Perubahan data sensitif: actor, entity, before/after, timestamp                                                              |
| **RBAC**                    | `Permission`, `RolePermission`, `UserPermissionOverride` (3)                                                                                       | Permission `resource:action[:scope]`; override per user                                                                      |
| **Feature & Pengaturan**    | `FeatureFlag`, `AppFeatureSetting`, `SystemStatus`, `RoleDashboardConfig`, `UserOnboarding`, `BrandingConfig`, `LandingContent`, `NewsArticle` (8) | Feature flags dikontrol SUPERADMIN; dashboard per-role via `RoleDashboardConfig`; branding & landing dikelola SUPERADMIN     |
| **Tahun Ajaran & Rollover** | `AcademicYear`, `RolloverRun`, `RolloverItem`, `Alumni` (4)                                                                                        | Status run: DRAFT/PREVIEW/RUNNING/DONE/ROLLED_BACK/FAILED                                                                    |

> Jumlah model di atas dihitung dari definisi `model` di `schema.prisma` (90 total). Beberapa model memiliki relasi silang (mis. `Grade` menyentuh akademik, kuis, dan ujian; `Notification` dipakai hampir semua modul).

### 2.2 Enum Kunci (62 total — pilihan penting)

| Enum                | Nilai penting                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Role`              | 14 role: SISWA, GURU, BK, KAPRODI, KEUANGAN, OPERATOR, WAKEPSEK, KEPSEK, AUDITOR, SUPERADMIN, CALON_SISWA, WALI_MURID, PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL (perubahan 2026-08-08: `GURU_BK` → `BK`, tambah KAPRODI & AUDITOR) |
| `PermissionScope`   | SENDIRI / KELAS / SEKOLAH                                                                                                                                                                                                        |
| `EnrollmentStatus`  | ACTIVE, TRANSFERRED, GRADUATED, DROPPED, PROMOTED, REPEATED                                                                                                                                                                      |
| `AttemptStatus`     | IN_PROGRESS, SUBMITTED, AUTO_SUBMITTED, EXPIRED, FLAGGED                                                                                                                                                                         |
| `AttendanceStatus`  | HADIR, IZIN, SAKIT, ALPA, TERLAMBAT                                                                                                                                                                                              |
| `PaymentStatus`     | PENDING, PAID, PARTIAL, OVERDUE, CANCELLED, REFUNDED, CARRIED_OVER                                                                                                                                                               |
| `PpdbStatus`        | DRAFT, SUBMITTED, VERIFIED, REJECTED, SELECTED, WAITLIST, ENROLLED                                                                                                                                                               |
| `RolloverRunStatus` | DRAFT, PREVIEW, RUNNING, DONE, ROLLED_BACK, FAILED                                                                                                                                                                               |
| `RolloverAction`    | PROMOTED, REPEATED, GRADUATED, TRANSFERRED, DROPPED                                                                                                                                                                              |
| `AuditAction`       | CREATE, UPDATE, DELETE, VIEW, EXPORT, LOGIN, LOCKOUT                                                                                                                                                                             |
| `NotificationType`  | TASK_NEW, TASK_GRADED, EXAM_START, EXAM_AUTOSUBMIT, ATTENDANCE_ALPA, INVOICE_DUE, PAYMENT_CONFIRMED, PPDB_STATUS, ANNOUNCEMENT, LETTER_STATUS, LIBRARY_DUE, ASSET_APPROVED, DISCIPLINE, BK_REMINDER, EXPORT_READY                |

### 2.3 Constraint & Index Strategis ([docs/03 §6](03-database-erd.md))

Constraint unique yang membentuk integritas domain:

- `UserRole @@unique([user_id, role])` — satu user satu role per baris.
- `Submission @@unique([assignment_id, student_id])` — satu submission per tugas per siswa.
- `Enrollment @@unique([student_id, class_id, academic_year_id])` — mencegah dobel enroll.
- `Attendance @@unique([student_id, class_subject_id, date])` — satu absensi per siswa+mapel+hari (dasar idempotensi absensi manual).
- `AttendanceRecord @@unique([attendance_session_id, student_id])` — satu scan per sesi.
- `ExamAttempt @@unique([exam_session_id, student_id])` — satu akun satu sesi ujian.
- `Subject @@unique([code])`; `ClassSubject @@unique([class_id, subject_id, semester])`.

Index strategis untuk hot-path: submission `(assignment_id, student_id)`; invoice `(student_id, status, due_date)`; exam_answer_log `(attempt_id, question_id)`; user_role `(user_id, status)`; app_feature_setting `(feature_key)`; audit_log `(entity, entity_id, created_at)`; ppdb_applicant `(status, created_at)`.

---

## 3. Enam Alur Bisnis Kritis

### 3.1 Ujian Online (modul `exam`)

Alur inti (juga di [docs/02 §15.1](02-technical-architecture.md)):

1. **Persiapan**: Guru membuat ujian → paket soal (soal bisa diacak A/B/C) → sesi ujian → generate token (6 karakter, tanpa karakter ambigu 0/O/1/I/l/o; disimpan sebagai hash deterministik) → publish.
2. **Start attempt**: Siswa membuka jadwal → `POST /exam/sessions/:id/attempts` dengan token → validasi: jadwal buka, token sekali pakai, satu akun satu sesi → buat `ExamAttempt` (IN_PROGRESS) + acak soal → response `{ attemptId, questions[], remainingSeconds }`.
3. **Autosave (idempotent)**: klien menyimpan jawaban tiap 15 detik + saat `visibilitychange`/`beforeunload` (juga ke IndexedDB untuk offline) → `POST /exam/attempts/:id/answers` dengan `Idempotency-Key` → `ExamAnswerLog` **append-only** (timestamp, key per soal) → 200 `{ savedAt }`. Duplikat key tidak membuat log ganda.
4. **Waktu habis (server-authoritative)**: processor auto-submit menandai attempt melewati durasi → `AUTO_SUBMITTED` → emit `exam:force-submit` ke room sesi; event `exam:tick` memberi peringatan 60/30/10/0 detik.
5. **Penilaian**: auto-grade PG/isian (skor dihitung dari jawaban terbaru per soal; esai tidak ikut auto-grade) → esai di-nilai manual guru (`exam:grade-esai:class`) → skor masuk `Grade` (sumatif) → bahan e-Rapor → `AuditLog` untuk investigasi sengketa.

Sumber kebenaran tetap REST; Socket.IO hanya ack cepat (best-effort).

### 3.2 Keuangan (modul `finance`)

1. **Invoice**: buat tunggal/bulk (SPP dkk.) → list/filter → carry-over tahun ajaran → hapus. Job `spp` meng-generate SPP per periode (idempotent berbasis data), manual trigger + cron.
2. **Pembayaran**: catat pembayaran → alokasi cicilan lintas tagihan (`payments/allocate`) → verifikasi oleh KEUANGAN (`payments/:id/verify`). Status: PENDING → PARTIAL → PAID.
3. **Denda**: `LateFeeRule` → job harian `late-fee` membuat `DendaInvoice` → daftar/hapus denda.
4. **Refund**: buat → approve berjenjang **keuangan → kepsek**.
5. **Rekonsiliasi**: impor CSV → batch → resolve item (`reconciliation/items/:itemId/resolve`).
6. **Arus kas**: summary per periode + catat transaksi manual.

Prinsip: semua jumlah memakai **kalkulator sen** (`calculator/money.ts`) untuk menghindari floating point; alur pembayaran dan job SPP/denda idempotent (roadmap: idempotensi pembayaran penuh G-35, race `invoice_no` G-36).

### 3.3 Payroll (modul `payroll`)

1. **Master**: `JobPosition`, `PayrollComponent`, `SalaryStructure` (struktur gaji pegawai).
2. **Run bulanan**: create → `calculate` (hitung komponen) → `validate` → `approve-keuangan` → **rekap kepsek tanpa detail gaji** (`runs/:id/rekap`) → `approve-kepsek`.
3. **Payslip**: slip sendiri via scope `payslip:read:self` (anti-IDOR); detail lengkap hanya KEUANGAN/SUPERADMIN (`payroll:read:school`).
4. **Laporan**: summary per periode, komparasi bulanan, rekap potongan PPh 21 (skema TER) & BPJS sebagai nilai terkonfigurasi per periode.
5. Kalkulator terpisah: `payroll-calc`, `tax`, `bpjs` (unit-test khusus edge case).

### 3.4 Rollover Tahun Ajaran (modul `rollover`)

Wizard berjenjang: **draft → pre-check → dry-run → execute → rollback** (`RolloverRun` + `RolloverItem` + `AuditLog`).

1. **Draft**: buat rencana rollover dengan opsi (kelas/mapel/enrollment/nilai/finance) & override.
2. **Pre-check & dry-run**: simulasi tanpa menulis DB.
3. **Execute**: menyalin struktur akademik ke tahun ajaran baru; enrollment lama diberi status `PROMOTED`/`REPEATED`; lulusan masuk `Alumni`; opsi rollover keuangan/payroll dan pemetaan PPDB. Idempotensi via `idempotencyKey`; eksekusi dapat diantrekan ke job (`ROLLOVER_EXECUTE`).
4. **Rollback**: revert run dengan alasan (status `ROLLED_BACK`).

### 3.5 Absensi (modul `attendance`)

1. **Manual bulk**: guru mengisi absen satu kelas — idempotent per `(student_id, class_subject_id, date)` dalam satu transaksi batch.
2. **Sesi QR**: guru buat sesi → generate token QR **sekali pakai** (TTL 5–10 menit; token di-hash; geofencing radius opsional).
3. **Scan**: `POST /attendance/records/scan` dengan `Idempotency-Key` — replay → 200 idempotent; reuse token oleh siswa lain → 409 (anti-titip); token kedaluwarsa → 410 (validasi waktu server); sesi belum aktif → 409; duplikat key queue offline → 200 dengan record lama. Hasil: `AttendanceRecord` (HADIR).
4. **Izin/sakit online**: siswa ajukan permit → verifikasi oleh homeroom/BK (`permit:verify:class`) → status IZIN/SAKIT/ALPA.
5. **Rekap & kedisiplinan**: persentase kehadiran per siswa/mapel/periode; highlight siswa `atRisk` saat ALPA ≥ ambang (default 3/bulan).

### 3.6 PPDB (modul `ppdb`)

1. **Registrasi publik** (`@Public`, tanpa login): isi formulir + consent + upload dokumen (bucket `ppdb-documents`/`ppdb-consents`). Draft tersimpan di `sessionStorage` (bukan localStorage — PII tidak menumpuk).
2. **Tracking**: pendaftar cek status via nomor pendaftaran (`ppdb:read:self`).
3. **Seleksi**: OPERATOR memverifikasi berkas (`verify`) → pilih diterima (`select`) atau `waitlist`.
4. **Enroll**: `POST /ppdb/:applicantId/enroll` → buat akun siswa (role SISWA) + enrollment ke kelas + `AcademicYear`; status `ENROLLED`.

---

## 4. RBAC: 3 Dimensi + Guard Chain

### 4.1 Tiga Dimensi Kontrol Akses ([docs/02 §4](02-technical-architecture.md))

1. **Permission-based**: aksi dikendalikan izin `resource:action[:scope]` — contoh: `payroll:read:school`, `grade:write:class`, `payslip:read:self`, `exam:token:class`, `attendance:scan:self`.
2. **Role hierarchy**: role mewarisi permission; permission tambahan/dibatalkan per role via `RolePermission`; override per user via `UserPermissionOverride`.
3. **Scope**: batas data — **SENDIRI** (data milik aktor), **KELAS** (kelas yang diampu/diikuti), **SEKOLAH** (seluruh data sekolah). Scope di-resolve oleh scope resolver terhadap `RequestContext` (`userId`, `classIds`, `homeroomClassId`).

**14 role** dan deskripsi lengkap: lihat [README.md — Sistem Role & RBAC](../README.md#sistem-role--rbac).

### 4.2 Guard Chain per Request

```
JWT middleware
  → verify JWT in-house (signature, exp) → resolve UserRole aktif dari tabel
  → attach RequestContext { userId, roles[], classIds, homeroomClassId }
Rate limiter (login/ujian/scan QR lebih ketat)
AuthGuard global (@Public() untuk endpoint publik, mis. /auth/login, /ppdb/register, /health)
  → gagal → 401
PermissionsGuard (@RequirePermission('resource:action[:scope]'))
  → cek permission set role (dengan hierarki & override) + scope resolver
  → gagal → 403
FeatureFlagGuard (@Feature(...))
  → flag OFF → 403 FEATURE_DISABLED (fitur OFF ditolak di API, bukan hanya disembunyikan di UI)
Controller → Service → Repository (filter scope wajib di query Prisma)
```

Kunci: **otoritas role adalah tabel `UserRole`**, bukan klaim JWT — perubahan role berlaku instan (lookup di-cache 60 detik). Repository **tidak pernah** query tanpa filter scope kecuali modul global (User, SchoolProfile).

---

## 5. Realtime, Queue, Storage, Cache

### 5.1 Realtime (modul `realtime`)

- Socket.IO **namespace tunggal `/ws`**; Redis adapter aktif saat `REDIS_URL` tersedia (siap multi-instance).
- **Room per konteks**: `user:{userId}`, `class:{classId}`, `exam:{examSessionId}`; handshake auth via `auth.token` (JWT) — gagal → `connection_error: UNAUTHORIZED`.
- Event utama (server → client): `notification:new`, `assignment:new`/`assignment:graded`, `exam:start`, `exam:time-warning`, `exam:autosave-ok`, `exam:force-submit`, `exam:tick`, `attendance:alpa`, `attendance:session-closed`, `invoice:due`, `payment:confirmed`, `announcement:new`, `letter:status`, `ppdb:status`, dll. Event ujian bersifat best-effort; sumber kebenaran tetap REST (autosave via REST dengan `Idempotency-Key`).

### 5.2 Queue (modul `queue` + `jobs`)

- **BullMQ via Redis** (`REDIS_URL`); tanpa Redis → **in-process fallback** (single-instance).
- Job yang dikenal: auto-submit ujian (batching + indeks `status`/`submitted_at`), execute rollover (`ROLLOVER_EXECUTE`), job keuangan SPP + denda (cron + trigger manual), `StorageCleanupJob` (pembersihan file yatim).

### 5.3 Storage ([docs/02 §8](02-technical-architecture.md))

- **Lokal saja** (`STORAGE_LOCAL_DIR`) — tanpa S3/MinIO. Upload via API multipart: `POST /storage/files/:bucket`.
- **Bucket per jenis dokumen**: `materials`, `submissions`, `ppdb-documents`/`ppdb-consents`, `payment-proofs`, `permits`, `counseling-attachments`, `official-letters`, `exports`, `avatars`, `branding`, `landing`. Akses per bucket berbasis RBAC scope; PII (PPDB, BK) tidak pernah di folder publik.
- **Sanitasi**: validasi **magic bytes** (`MAGIC_SIGNATURES`) + allowlist mimetype per bucket + batas per-bucket (`STORAGE_MAX_<BUCKET>_MB`); menolak path traversal. Konvensi path: `{bucket}/{module}/{entity_id}/{file}`.

### 5.4 Cache

- **In-memory TTL** (`CACHE_TTL_MS`, default 30.000 ms) untuk endpoint publik/hot-path: branding, landing, feature flags, scope resolver.
- Resolusi role/permission di-cache **60 detik** (ADR-005); bila scale-out, pertimbangkan cache terdistribusi (Redis).

---

## 6. Frontend

### 6.1 Halaman & Route Groups

**55 file `page.tsx`** di `apps/web/src/app` tersebar dalam **11 route group** + `support` + root `app/page.tsx` (landing) ([apps/web/src/app/README.app.md](../apps/web/src/app/README.app.md), verifikasi 2026-08-08):

| Group          | URL             | Peran                             | Halaman                                                                                                              |
| -------------- | --------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `(siswa)`      | `/siswa/*`      | SISWA                             | dashboard, kelas (+detail), tugas, kuis (+detail), ujian (+detail/kerjakan), nilai, absensi, kalender                |
| `(guru)`       | `/guru/*`       | GURU                              | dashboard, kelas (+detail), materi, tugas, bank-soal, ujian, absensi, penilaian                                      |
| `(admin)`      | `/admin/*`      | OPERATOR/KEPSEK/KEUANGAN/WAKEPSEK | dashboard, operator, kepsek (+change-logs), keuangan, wakepsek                                                       |
| `(superadmin)` | `/superadmin/*` | SUPERADMIN                        | dashboard (+change-logs), admin-sistem, branding, landing, onboarding, rbac, rollover, maintenance, dashboard-config |
| `(ortu)`       | `/ortu/*`       | WALI_MURID                        | dashboard, nilai, absensi, tagihan                                                                                   |
| `(ppdb)`       | `/ppdb/*`       | Publik/CALON_SISWA                | ppdb (beranda), daftar, status                                                                                       |
| `(landing)`    | `/berita/*`     | Publik                            | berita (+detail)                                                                                                     |
| `(auth)`       | `/login`        | Publik                            | login                                                                                                                |
| `(calonsiswa)` | `/calonsiswa/*` | CALON_SISWA                       | dashboard, pengumuman                                                                                                |
| `(pembimbing)` | `/pembimbing/*` | PEMBIMBING_INDUSTRI               | dashboard, siswa (bimbingan)                                                                                         |
| `(penguji)`    | `/penguji/*`    | PENGUJI_EKSTERNAL                 | dashboard, jadwal                                                                                                    |
| `support`      | `/support`      | Publik                            | dukungan                                                                                                             |

### 6.2 Pola Fetching & State

- **Server Components (default)** untuk data-fetching awal, daftar, detail.
- **TanStack Query** untuk server state (cache, retry, optimistic update — nilai & notifikasi).
- **Zustand** untuk client state kecil lintas komponen (mode data-saver dll.); local state untuk form.
- **IndexedDB** (lib `idb`) untuk offline queue: antrean absensi QR & autosave ujian; disinkronkan via background sync.
- **Realtime**: hook `useSocket` (namespace `/ws`) — event → invalidate TanStack Query / toast; badge notifikasi live via `useUnreadNotifications`.
- Halaman ujian online adalah **Client Component** (timer + autosave + `visibilitychange`), tetapi token & jadwal diverifikasi dari server; jawaban tidak pernah dikirim via Server Action — selalu via REST dengan idempotency key.

### 6.3 Auth di Browser

- JWT di **httpOnly cookie** (Secure + SameSite=Lax) — klien tidak membaca token; `proxy.ts` mengarahkan ke `/login` bila session cookie tidak ada (UX-level).
- **Otorisasi final tetap di API**; frontend hanya UX. Middleware web opsional (keputusan R-43: auth via cookie + guard per halaman).

---

## 7. Status Kesehatan Proyek

### 7.1 Bukti Verifikasi (audit 2026-08-07, [riview02 §7](riview/riview02.md))

| Check                           | Hasil                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck` (turbo)             | PASS                                                                                                                                               |
| `lint` (turbo)                  | PASS                                                                                                                                               |
| `build` (turbo)                 | PASS (`nest build` + `next build` + `prisma generate`)                                                                                             |
| Test API                        | **±1.900 tes lulus, 0 gagal** (estimasi 2026-08-08: unit seed-data ~973 + 357 + 29 + dst; 5 suite pra-existing kini hijau — lihat [riview04 §5.3]) |
| Test web (Vitest)               | **94 test** (9 file di `apps/web/src/lib/__tests__/`, 2026-08-08)                                                                                  |
| `npm audit`                     | 0 kerentanan (audit-level=high)                                                                                                                    |
| `db:validate` (prisma validate) | PASS                                                                                                                                               |
| Referensi `eclass` tersisa      | 0                                                                                                                                                  |
| CI                              | 7 gate: lint → typecheck → unit → integration → build → audit → secret scan (gitleaks)                                                             |

### 7.2 Temuan QA yang Tersisa

Register audit putaran 2 (R-01..R-48): **seluruh 3 CRITICAL dan 10 HIGH sudah ditutup**. Status akhir: 31 selesai penuh, 4 sebagian (R-02, R-35, R-43, R-44), 3 dipertahankan (kontrol), **9 terbuka (semua MEDIUM/LOW, non-blocking)**: R-07, R-09, R-10, R-13, R-14, R-22, R-41, R-46, R-47.

Risiko operasional tersisa ([riview02 §8](riview/riview02.md)): akses change-log WAKEPSEK belum diputus (R1), hardcoded neutral light sebagian (R2), exports 50MB via memoryStorage (R3), coverage belum diukur formal (R4), data demo tanpa gate DEMO_MODE (R5), kontrak antrean penilaian guru belum disamakan (R6), kualitas `actor_role` AuditLog + audit login gagal (R7), rate limit upload belum ada (R8), web tests baru bootstrap (R9), beberapa higienis UX (R10), form kontak publik (R11), middleware web opsional (R12).

**Prasyarat rilis production** (sebelum go-live): gate `DEMO_MODE` global, coverage ≥ 80%, perbaikan exports memoryStorage, dan keputusan eksplisit akses change-log WAKEPSEK.

### 7.3 Roadmap (ringkasan)

- **prd05 (penutupan gap G-01…G-67)**: performa & scaling (rate limit identitas, cache scope, optimasi autosave, timer server), keamanan (CSRF, magic bytes — sudah selesai, sanitasi landing), integritas data (idempotensi pembayaran, payroll PAID transaksional), observability, e-Rapor dua-track, ekspor Dapodik, Dockerfile, backup/DR.
- **prd06 (roadmap 3 sprint)**: font Plus Jakarta Sans, font scale 3 level, notifikasi realtime per-user, analisis fitur per-role, global settings, clean code pass, optimisasi performa; target DoD: **2.000+ tes hijau, coverage ≥ 80%, load test k6 1.500–2.000 VU** (p95 autosave < 300 ms, error < 1%).
- Rilis terbaru: **0.5.0** (2026-08-07) — lihat [CHANGELOG.md](../CHANGELOG.md).

---

## 8. Referensi

- Arsitektur teknis & ADR: [docs/02-technical-architecture.md](02-technical-architecture.md)
- ERD & skema: [docs/03-database-erd.md](03-database-erd.md)
- Kontrak API & matriks RBAC: [docs/04-api-contract.md](04-api-contract.md)
- Rencana implementasi: [docs/05-implementation-plan.md](05-implementation-plan.md)
- Riset & validasi keputusan: [docs/06-research-validations.md](06-research-validations.md)
- PRD produk: [docs/01-master-prd.md](01-master-prd.md), [docs/prd/prd04.md](prd/prd04.md)
- PRD development & roadmap: [docs/prd/prd05.md](prd/prd05.md), [docs/prd/prd06.md](prd/prd06.md), [docs/prd/prd07.md](prd/prd07.md)
- Laporan audit: [docs/riview/riview01.md](riview/riview01.md), [docs/riview/riview02.md](riview/riview02.md), [docs/riview/riview03.md](riview/riview03.md), [docs/riview/riview04.md](riview/riview04.md)
- Kontrak modul per direktori: `apps/api/src/modules/<modul>/README.<modul>.md`
- Indeks seluruh dokumentasi: [docs/README.docs.md](README.docs.md)
