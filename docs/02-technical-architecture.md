# Technical Architecture — openlms Super-App (LMS + SIS, Single-School)

**Versi:** 1.1
**Tanggal:** 7 Agustus 2026
**Status:** Final desain single-school (input: prd04 v4.2 [owner-v4.2]; menggantikan desain multi-tenant v1.0)
**Referensi konsisten:** `03-database-erd.md`, `04-api-contract.md`, `05-implementation-plan.md`

> **Catatan versi 1.1:** dokumen ini menggantikan desain multi-tenant v1.0. Aplikasi melayani **SATU sekolah** (prd04 §16.3(g) [owner-v4.2]): tanpa kolom identitas sekolah di tiap entitas, tanpa tenant isolation, tanpa layanan auth/storage pihak ketiga, tanpa school switcher. Rincian keputusan di §16 ADR.

> **Catatan pembaruan 2026-08-16 (sinkronisasi angka):** §4.1 — implementasi aktual 35 modul (tambah `public-content` 12 endpoint publik + `metrics` + **`rapor`** e-Rapor v1); §5.4 — App Design System v3 (AppShell v2, components/ui 12 ekspor) & Landing v2 (10 halaman mandiri); §13 — catatan keamanan terkini (JWT canonical, SEC-001/002/007, COOKIE_SECURE fail-fast, audit failure logging, P2002/P2025/P2003, **keamanan go-live: Redis wajib password, port loopback, gate DEMO_MODE**); §17 — **15 migrasi Prisma** (tambah `20260816000000_staff_ter_category`, `20260816010000_payment_idempotency`, `20260816020000_add_rapor_p5`; folder token-dedupe di-rename `20260809010000` → `20260808235959`); enum `schema.prisma` tetap **63** (tambah `ParentLinkStatus` di gelombang sebelumnya, tanpa enum baru di gelombang rapor); model **90 → 91** (tambah `RaporP5`); CI berisi **9 job** termasuk `web-e2e` (Playwright) dan `web-test` (vitest).
>
> **Catatan pembaruan 2026-08-16 (gelombang Wave 2):** §4.1 — modul API kini **37** (tambah **`pdp`** UU PDP & **`export`** generator ekspor nyata; `ReportProcessor` bukan lagi skeleton — dispatcher `export_type` RAPOR/DAPODIK/NILAI, `jobs/processors/report.processor.ts:58-70`); e-Rapor naik ke **v2** (ekspor PDF per siswa `POST /rapor/:studentId/export-pdf`, hand-rolled `rapor-pdf.ts` footer "Draft Sistem", approval KEPSEK = v2.1 belum); Dapodik **v1** (`POST /dapodik/export` — 3 CSV ber-BOM, gap kolom `nisn`/`nik`/`nuptk`); §17 — **16 migrasi Prisma** (tambah `20260816030000_add_pdp_module`); enum **63 → 65** (tambah `PdpRequestType`, `PdpRequestStatus`); model **91 → 92** (tambah `PdpRequest`); permission seed **141 → 146** (tambah `pdp:data:self`, `pdp:export:self`, `pdp:delete-request:self`, `pdp:review:school`, `report:export:self`); gate CI aktif: prettier + web coverage (floor 0) + import-no-restricted-paths.
>
> **Catatan pembaruan 2026-08-18 (gelombang 20-item):** §6 — **multi-role switcher** (peran aktif UI vs izin union backend, §6.1a); §17 — **squash migrasi**: 17 folder migrasi → **1 baseline `20260818000000_init_squashed`** (92 model + 65 enum + 136 index = 85 CREATE INDEX + 51 CREATE UNIQUE INDEX + 133 relasi; folder migrasi lama dihapus — DB dev di-reset & seed ulang); §4/§17 — **optimasi N+1** (rollover buildPlan/execute batch, asset list tanpa N+1, payroll payslip batch, finance late-fee/refresh batch, PDP updateMany, import chunk `$transaction`, pagination exam/alumni/smk/ppdb) + **4 index baru** (Grade `academic_year`, Invoice `status`, Enrollment `academic_year_id`, Attendance `status`); §5.4 — **UI v2 + gambar asli** (`public/landing/school/*.jpg` via `npm run images:landing`), JSON-LD, OG image, anti-CLS, tagline "Platform Digital Terpadu Sekolah", shadow token `--shadow-app-*`; **dead code cleanup** (galeri-section, `login_*.txt`, ekspor `FormPage`, seed-data finance/assets, deps cva/clsx/tailwind-merge).

---

## 1. Ringkasan Eksekutif

openlms dibangun sebagai monorepo Turborepo dengan **satu backend NestJS** (`apps/api`), **satu frontend Next.js App Router** (`apps/web`), dan **tiga paket bersama** (`packages/database`, `packages/ui`, `packages/types`). Aplikasi berjalan untuk **SATU sekolah** dengan **skema tunggal** — tanpa multi-tenant, tanpa school switcher, tanpa SUPERADMIN penyedia SaaS (prd04 §16.3(g) [owner-v4.2]). Otorisasi dikendalikan **permission + scope RBAC (SENDIRI/KELAS/SEKOLAH)** di aplikasi sebagai lapis utama; **RLS PostgreSQL bersifat opsional** (defense-in-depth, tanpa session var tenant). **Auth in-house**: login by **Username (NIS/NIP) + Password (Argon2id)** — email opsional hanya untuk notifikasi; JWT di httpOnly cookie, refresh rotation; **otoritas role adalah tabel `UserRole`** — JWT hanya identitas (`sub`), agar perubahan role instan. Real-time via **Socket.IO namespace tunggal `/ws`** (siap multi-instance via Redis adapter); storage via **filesystem lokal backend** (`STORAGE_LOCAL_DIR`, tanpa S3/MinIO — upload multipart lewat API); live class **DITUNDA** (tanpa Jitsi/Zoom/Meet); feature flags global (`FeatureFlag`/`AppFeatureSetting`) dikendalikan **SUPERADMIN = admin sistem sekolah** (prd04 §5.N).

Keputusan yang membentuk arsitektur ini: modular backend per domain, route groups frontend per peran, autosave ujian yang idempotent, queue offline untuk absensi QR, observability & backup/DR sejak fase 0 (G6–G8, G11 prd04).

---

## 2. Prinsip Arsitektur

| #   | Prinsip                          | Arti Operasional                                                                                                                                                                              |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Isolasi akses per scope RBAC     | Guard NestJS `@RequirePermission('resource:action[:scope]')` (scope SENDIRI/KELAS/SEKOLAH) adalah lapis utama; RLS PostgreSQL **opsional** sebagai defense-in-depth **tanpa dimensi tenant**. |
| P2  | JWT = identitas, bukan otorisasi | Role di-resolve dari tabel `UserRole` per request (cache 60 detik); JWT hanya membawa `sub`.                                                                                                  |
| P3  | Skema tunggal, evolusi bertahap  | Satu skema Prisma untuk SATU sekolah; tambah fitur = tambah migrasi, bukan tenant baru.                                                                                                       |
| P4  | Backend modular per domain       | Tiap modul (Auth, School, Academic, Lms, Quiz, Exam, Attendance, Finance, Ppdb, Notification, dsb) independen: controller → service → repository.                                             |
| P5  | Frontend server-first            | Server Components untuk data-fetching, Client Components hanya untuk interaktivitas (form, timer kuis/ujian).                                                                                 |
| P6  | Kritis alur = idempotent & audit | Autosave ujian, scan QR, dan pembayaran punya idempotency key; perubahan sensitif masuk `AuditLog`.                                                                                           |
| P7  | Observability & DR bukan fitur   | Struktur logging, error tracking, backup/PITR, dan rate limiting dibangun di Fase 0–1, bukan ditambahkan belakangan.                                                                          |

---

## 3. Struktur Monorepo Final

```
openlms/
├── apps/
│   ├── api/                          # NestJS backend (REST + Socket.IO gateway)
│   │   ├── src/
│   │   │   ├── common/               # guard, middleware, interceptor, filter, decorator
│   │   │   ├── modules/              # modul per domain (lihat §4.1)
│   │   │   └── main.ts               # bootstrap, helmet, global prefix /api/v1
│   │   └── test/                     # unit + integration (Jest + Supertest)
│   └── web/                          # Next.js App Router (frontend PWA)
│       ├── src/app/
│       │   ├── (auth)/login          # login Username (NIS/NIP) + Password (tanpa OAuth)
│       │   ├── (ppdb)/               # halaman publik PPDB
│       │   ├── (siswa)/              # route group siswa
│       │   ├── (guru)/               # route group guru
│       │   ├── (admin)/              # route group OPERATOR/WAKEPSEK/KEUANGAN/KEPSEK
│       │   │   ├── operator/         # data induk, impor, verifikasi PPDB, surat
│       │   │   ├── wakepsek/         # akademik, ujian, jadwal, kesiswaan
│       │   │   ├── keuangan/         # tagihan, pembayaran, laporan
│       │   │   └── kepsek/           # dashboard eksekutif
│       │   ├── (ortu)/               # portal wali murid (MVP)
│       │   └── (superadmin)/admin-sistem  # pengaturan, feature flags, monitoring
│       ├── src/components/           # komponen shared (client)
│       ├── src/lib/                  # api client, offline queue
│       ├── public/sw.js              # service worker (PWA)
│       └── next.config.ts            # CSP, PWA, image optimization
├── packages/
│   ├── database/                     # Prisma schema, client, migrasi, seed, RLS opsional
│   ├── ui/                           # shadcn/ui + Tailwind v4 (komponen shared)
│   └── types/                        # DTO/shared types (dipakai api & web)
├── turbo.json                        # task orchestration (build, lint, test, typecheck)
├── package.json                      # workspace root
├── .env.example                      # template env (tanpa secret)
└── .github/workflows/ci.yml          # CI: 10 job — lint, prettier, typecheck, unit, web-test, integration, web-e2e, build, audit, secrets
```

**Tanggung jawab paket:**

| Paket               | Tanggung jawab                                                                                                                                                                                                                                                                                                           | Batas                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `apps/api`          | Semua logika bisnis, otorisasi, real-time gateway, integrasi storage file lokal (`STORAGE_LOCAL_DIR`) — **tanpa dependensi API fitur pihak ketiga**                                                                                                                                                                      | Tidak boleh import komponen UI                   |
| `apps/web`          | Presentasi, routing per role, state UI, PWA/offline, upload file via API (multipart)                                                                                                                                                                                                                                     | Tidak boleh query Prisma langsung; hanya via API |
| `packages/database` | Skema Prisma (**92 model + 65 enum** — angka aktual `schema.prisma`, verifikasi 2026-08-18), client singleton, migrasi (**1 baseline squashed `20260818000000_init_squashed`** — 136 index = 85 CREATE INDEX + 51 CREATE UNIQUE INDEX + 133 FK; folder migrasi lama dihapus per 2026-08-18), seed, file RLS **opsional** | Tidak boleh berisi logika bisnis                 |
| `packages/ui`       | Komponen shadcn/ui yang di-styling, primitives                                                                                                                                                                                                                                                                           | Stateless; data lewat props                      |
| `packages/types`    | Enum, DTO, kontrak API (satu sumber kebenaran tipe)                                                                                                                                                                                                                                                                      | Tanpa runtime berat                              |

Aturan dependensi (ditegakkan ESLint `import-x/no-restricted-paths` — rule aktual di `eslint.config.mjs:53`, plugin eslint-plugin-import-x; sebagian dokumen lama menulisnya `import/no-restricted-paths` / `import-no-restricted-paths` — nama yang benar untuk kode & CI adalah `import-x/no-restricted-paths` — + Turborepo): `web → api (HTTP)`, `web → packages/{ui,types}`, `api → packages/{database,types}`, `packages/database → packages/types` (enum).

---

## 4. Arsitektur Backend (NestJS)

### 4.1 Modul per Domain

| Modul                 | Tanggung jawab utama                                                                                           | Entitas inti (lihat ERD)                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AuthModule`          | Login Username (NIS/NIP) + Password (Argon2id), JWT httpOnly cookie, refresh rotation, reset via OPERATOR      | User, UserRole                                                                                                          |
| `SchoolModule`        | Pengaturan aplikasi, feature flags (FeatureFlag/AppFeatureSetting), impor data, retensi, rollover tahun ajaran | SchoolProfile, FeatureFlag, AppFeatureSetting, ImportBatch, ImportError, DataRetentionPolicy, AcademicYear, RolloverRun |
| `AcademicModule`      | Kelas, mapel, jadwal, enrollment, rapor                                                                        | Class, Subject, ClassSubject, ScheduleEntry, Enrollment, Grade                                                          |
| `LmsModule`           | Materi, tugas, submission, penilaian                                                                           | Material, Assignment, Submission                                                                                        |
| `QuizModule`          | Bank soal, kuis, attempt                                                                                       | Quiz, Question, QuizAttempt                                                                                             |
| `ExamModule`          | Paket ujian, sesi, token, attempt, autosave, analisis butir                                                    | Exam, ExamPackage, ExamSession, ExamAttempt, ExamAnswerLog                                                              |
| `AttendanceModule`    | Sesi QR, geofencing, rekap, izin/sakit                                                                         | AttendanceSession, AttendanceQrToken, AttendanceRecord, Attendance                                                      |
| `StudentAffairModule` | BK, tata tertib, ekskul, prestasi                                                                              | CounselingNote, DisciplinePoint, DisciplineRecord, Extracurricular, ExtracurricularEnrollment, Achievement              |
| `StaffModule`         | Data induk & absensi guru/staf                                                                                 | Staff, StaffAttendance                                                                                                  |
| `AssetModule`         | Inventaris & peminjaman                                                                                        | Asset, AssetBooking                                                                                                     |
| `LibraryModule`       | Katalog & peminjaman buku                                                                                      | LibraryBook, LibraryLoan                                                                                                |
| `FinanceModule`       | Tagihan & pembayaran                                                                                           | Invoice, Payment                                                                                                        |
| `PpdbModule`          | Pendaftaran publik, verifikasi, seleksi, konsent                                                               | PpdbApplicant, ParentalConsent                                                                                          |
| `CommunicationModule` | Pengumuman, surat resmi, notifikasi                                                                            | Announcement, OfficialLetter, Notification                                                                              |
| `ParentModule`        | Portal wali murid (read-only)                                                                                  | ParentGuardian, ParentStudentLink                                                                                       |
| `VocationalModule`    | PKL/UKK (Fase 3)                                                                                               | Internship, InternshipJournal, InternshipPartner, IndustryMentor, CompetencyTest, CompetencyRubricItem                  |
| `ExportModule`        | Ekspor Dapodik/ANBK, rekap nilai                                                                               | DataExportLog                                                                                                           |
| `AuditModule`         | Audit trail generik                                                                                            | AuditLog                                                                                                                |
| `RealtimeModule`      | Socket.IO gateway, namespace tunggal `/ws` (siap multi-instance)                                               | Notification                                                                                                            |
| `IntegrationModule`   | Storage file lokal (uploads + serve berkas via `/api/v1/storage/files/*`); tanpa integrasi fitur pihak ketiga  | —                                                                                                                       |

> **Catatan Pembaruan 2026-08-10:** tabel modul di atas mencerminkan desain awal.
> Implementasi aktual kini memiliki **34 modul** (`apps/api/src/modules/*/*.module.ts`,
> diverifikasi 2026-08-10): `auth`, `academic`, `lms`, `quiz`, `exam`, `attendance`,
> `finance`, `payroll`, `asset`, `ppdb`, `communication`, `parent-portal`, `smk`,
> `rollover`, `alumni`, `branding`, `landing`, `onboarding`, `maintenance`,
> `notifications`, `rbac-admin`, `realtime`, `storage`, `feature-flags`,
> `app-settings`, `audit`, `users-admin`, `admin-stats`, `dashboard-config`, `health`,
> `queue`, `jobs`, **`public-content`**, **`metrics`**. Perubahan lain per
> 2026-08-08: **enum `Role` = 14 nilai** (`GURU_BK` → `BK`, tambah `KAPRODI` &
> `AUDITOR` — `schema.prisma:29-44`), klaim skema diperbarui ke **90 model + 63
> enum** (verifikasi 2026-08-16 — termasuk `ParentLinkStatus`). Rincian terkini per modul ada di
> `apps/api/src/modules/<modul>/README.<modul>.md`.
> _(Daftar ini historis — untuk daftar terkini **37 modul** termasuk `rapor`,
> `pdp`, `export`, lihat **Catatan Wave 2026-08-16** di bawah.)_
>
> **Catatan Pembaruan 2026-08-16 (gelombang Wave 2):** modul API kini
> **37** — tambah **`pdp`** (UU PDP) dan **`export`** (generator ekspor nyata);
> e-Rapor **v1 → v2** (ekspor PDF per siswa + halaman `/guru/rapor` &
> `/admin/rapor`); Dapodik **v1** (`POST /dapodik/export` — 3 CSV).
> Skema: **92 model + 65 enum**; migrasi **1 baseline squashed** (`20260818000000_init_squashed`); permission seed **146**
> (`pdp:data:self`, `pdp:export:self`, `pdp:delete-request:self`,
> `pdp:review:school`, `report:export:self`). Detail di bawah.

**Modul baru (2026-08-10):**

- **`PublicContentModule`** — endpoint publik **per-halaman landing** (halaman
  mandiri, bukan agregat section): **12 endpoint GET `/api/v1/public/*`**
  (`programs`, `extracurriculars`, `achievements`, `school-profile`,
  `facilities`, `gallery`, `testimonials`, `faqs`, `contact`,
  `school-structure`, `school-profile-extra`, `ppdb-info`). Seluruhnya `@Public()`
  dengan header **`Cache-Control: public, max-age=300`** (cache 5 menit);
  sumber data: tabel domain (`Prodi`, `Extracurricular`, `Achievement`,
  `SchoolProfile`) + JSON `LandingContent` (`public-content.controller.ts:31-118`,
  `public-content.service.ts`). Melengkapi endpoint agregat `GET /public/landing`
  (`landing` module) yang tetap ada.
- **`MetricsModule`** — observability proses ringan tanpa dependency baru:
  **GET `/api/v1/metrics`** — uptime, memori (`process.memoryUsage()`), event loop
  lag (delta `setImmediate`); hanya **SUPERADMIN** dengan permission
  `system:status:read` (fail-closed RBAC), `Cache-Control: no-store`
  (`metrics.controller.ts:16-22`, `metrics.service.ts`; terdaftar di
  `app.module.ts:72`).

**Modul baru (2026-08-16):**

- **`RaporModule`** — e-Rapor Kurikulum Merdeka v1 (G-49): komputasi nilai
  akhir on-the-fly dari `Grade` + track proyek P5 manual (`RaporP5`). Endpoint:
  `GET /rapor/:studentId` (rapor lengkap siswa; scope SENDIRI/KELAS/SEKOLAH +
  `ParentStudentLink` APPROVED untuk WALI_MURID), `GET /rapor/class/:classId`
  (ringkasan per kelas), `GET /rapor/students` (daftar siswa), `GET/PUT
/rapor/settings` (bobot tipe nilai, disimpan di `SchoolProfile.settings.raporWeights`),
  `POST/DELETE /rapor/p5` (upsert/hapus proyek P5, unique
  `[student, semester, academicYear, project]`). Komputasi murni di
  `rapor-compute.ts` (bobot default TUGAS 20 / KUIS 20 / UJIAN 30 / SUMATIF 30;
  PRAKTIK/SIKAP tanpa bobot default). Permission baru: `rapor:p5:write:class`,
  `rapor:p5:write:school`, `rapor:write:school`. Halaman web baru `/siswa/rapor`
  (`apps/web/src/app/(siswa)/siswa/rapor/page.tsx`). Terdaftar di
  `app.module.ts:96`. **v2 (2026-08-16):** ekspor PDF per siswa
  `POST /rapor/:studentId/export-pdf` (`report:export:self/class/school`) —
  PDF hand-rolled `rapor-pdf.ts` tanpa dependency (footer "Draft Sistem"
  `rapor-pdf.ts:177`), job `report.generate` → `RaporExportService`, unduh via
  `GET /exports/:id` + `GET /exports/:id/download`; modul rapor kini **8
  endpoint**; halaman baru `/guru/rapor` & `/admin/rapor`; **approval KEPSEK =
  v2.1 (roadmap, belum)**.
- **`PdpModule`** — kepatuhan UU PDP (G12/G13, 2026-08-16): **14 endpoint
  `/pdp/*`** (`GET /pdp/me/data`, `PUT /pdp/me`, `POST /pdp/me/export`,
  `GET /pdp/me/exports[/:id/download]`, `POST /pdp/me/delete-request`,
  `GET /pdp/me/requests`, `GET /pdp/consents`, `GET /pdp/requests`,
  `POST /pdp/requests/:id/approve|reject`, `GET /pdp/retention`,
  `PUT /pdp/retention/:entity`, `POST /pdp/retention/run`). Model `PdpRequest` +
  enum `PdpRequestType`/`PdpRequestStatus`; `ExportType.PERSONAL`; anonimisasi
  PII placeholder `[dihapus]` (`pdp-anonymize.service.ts`); retensi via
  `DataRetentionPolicy` + cron `pdp-retention-monthly` (`0 3 1 * *`) dengan
  5 kebijakan default 60 bulan; permission `pdp:data:self`, `pdp:export:self`,
  `pdp:delete-request:self`, `pdp:review:school`.
- **`ExportModule`** — generator ekspor nyata (2026-08-16): `RaporExportService`
  (PDF rapor via job) + `DapodikExportService` (3 CSV ber-BOM UTF-8:
  `peserta_didik.csv`, `pendidik.csv`, `rombongan_belajar.csv`); endpoint
  `GET /exports/:id` + `GET /exports/:id/download` (auth pemilik ATAU
  `export:read:school`, defense-in-depth); `POST /dapodik/export`
  (`export:run:school`, `dapodik.controller.ts`). Dipakai `ReportProcessor`
  (`jobs/processors/report.processor.ts:58-70` — dispatcher
  RAPOR/DAPODIK/NILAI, idempoten). **GAP Dapodik v1:** `User`/`Staff` belum
  punya kolom `nisn`/`nik`/`nuptk` — NISN dari `PpdbApplicant` (nullable),
  NUPTK kosong ber-catatan; ekspor best-effort, migrasi v1.1 dijadwalkan.

### 4.2 Lapisan (Layers)

```
Controller (validasi DTO, status HTTP)
   → Service (logika bisnis, transaksi, event emit)
      → Repository (query Prisma, wajib filter scope SENDIRI/KELAS/SEKOLAH)
         → PostgreSQL (RLS opsional — defense-in-depth RBAC, tanpa session var tenant)
```

- **Controller**: hanya parse request/response, dekorator RBAC (`@RequirePermission(...)`, `@Roles(...)` sebagai gula sintaks), validasi DTO (class-validator).
- **Service**: business logic + `$transaction` + emit Socket.IO event + tulis `AuditLog` untuk aksi sensitif.
- **Repository**: semua query Prisma; pola wajib scope `where` berdasarkan RequestContext (`userId`, `classIds`, `homeroomClassId`); tidak pernah query tanpa scope RBAC kecuali modul global (User, SchoolProfile).

### 4.3 Middleware & Guard Global

| Lapisan             | Mekanisme                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Middleware JWT      | Verifikasi `Authorization: Bearer <JWT in-house>` (HS256/RS256, secret dari env); cek signature & `exp`. Hasil `sub` → resolve `UserRole` aktif → attach `RequestContext { userId, roles[], classIds, homeroomClassId }`. |
| Guard RBAC global   | Baca `@RequirePermission('resource:action[:scope]')` di handler + scope resolver (SENDIRI/KELAS/SEKOLAH); role guard `@Roles(...)` sebagai gula sintaks. Endpoint publik ditandai `@Public()`.                            |
| Interceptor request | Set request ID header; logging terstruktur; **tanpa session variable tenant**.                                                                                                                                            |
| Filter exception    | Format error standar `{ error: { code, message, details, requestId } }` (konsisten dengan 04-api-contract §1.6).                                                                                                          |
| Rate limiter        | `@nestjs/throttler` per endpoint (lihat §13).                                                                                                                                                                             |

Alur per request:

```
HTTP request
  → JWT middleware (verify JWT in-house, resolve UserRole, build context)
  → Rate limiter (login/ujian/scan QR lebih ketat)
  → Global guard RBAC (@RequirePermission + scope, @Public)
  → Controller → Service → Repository (filter scope RBAC; RLS opsional)
  → Response + requestId + audit log (jika sensitif)
```

---

## 5. Arsitektur Frontend (Next.js App Router)

### 5.1 Route Groups per Role

```
app/
├── (auth)/login                  # login Username (NIS/NIP) + Password (split-screen, tanpa OAuth)
├── (ppdb)/pendaftaran            # publik (WCAG AA, no auth)
├── (landing)/                    # landing v2 — 10 halaman mandiri (lihat §5.4)
│   # / (beranda), /tentang, /kontak, /program-keahlian, /fasilitas,
│   # /ekstrakurikuler, /prestasi, /galeri, /testimoni, /faq (+ /berita[/slug])
├── (siswa)/kelas, /tugas, /kuis, /ujian, /nilai, /absensi, /kalender
├── (guru)/kelas, /materi, /tugas, /bank-soal, /penilaian, /absensi, /ekskul
├── (admin)/
│   ├── operator/   (siswa, guru, surat, arsip, ppdb-verifikasi, impor)
│   ├── wakepsek/   (dashboard akademik & kesiswaan, ujian, jadwal)
│   ├── keuangan/   (tagihan, pembayaran, laporan)
│   └── kepsek/     (dashboard eksekutif)
├── (ortu)/anak, /nilai, /tagihan, /absensi     # portal wali murid (MVP)
└── (superadmin)/admin-sistem    # pengaturan aplikasi, feature flags, monitoring
```

Middleware Next.js: redirect ke `/login` bila session cookie tidak ada; layout per route group menyembunyikan navigasi yang tidak relevan; otorisasi final tetap di API (frontend hanya UX).

### 5.2 Server Components vs Client Components

| Jenis                      | Dipakai untuk                                        | Contoh                                                                  |
| -------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Server Component (default) | Data-fetching awal, daftar, detail, rendering statis | Daftar materi, rekap nilai, detail kelas                                |
| Client Component           | Interaktivitas, timer, form dinamis, real-time       | Form tugas, kuis timer, autosave ujian, scan QR kamera, peta geofencing |
| Server Action              | Mutasi ringan form (dengan validasi)                 | Mark notifikasi terbaca, submit izin                                    |

Aturan: halaman ujian online adalah Client Component (butuh timer + autosave + visibilitychange), tetapi token & jadwal diverifikasi dari server; jawaban tidak pernah dikirim via Server Action — selalu via REST API dengan idempotency key.

### 5.3 State Management

- **Server state** (data dari API): hook `useApi`/`useAsyncData` (`apps/web/src/lib/use-api.ts`) — status loading/error/disabled/empty/success, refetch, fallback demo; tanpa TanStack Query.
- **Client state** (UI): React Context untuk state lintas komponen (auth, branding, mode data-saver dsb.); local state untuk form.
- **Offline queue**: `localStorage`/`sessionStorage` (`apps/web/src/lib/storage.ts`, key `opensis_*`) — draft PPDB & cache TTL di localStorage; attempt ujian & antrean jawaban offline di sessionStorage (lihat §10).
- **Realtime**: hook Socket.IO (`useSocket`) namespace `/ws`; event → refetch `useApi`/toast (REST tetap sumber kebenaran).

### 5.4 App Design System v3 & Landing v2 (2026-08-09/10)

Dua spesifikasi desain final diimplementasikan dan menjadi acuan FE (sumber:
`docs/app-design-system-v3.md`, `docs/landing-design-v2.md`):

- **App Design System v3 (aplikasi role)** — `AppShell v2`
  (`apps/web/src/components/layout/app-shell.tsx`, 566 baris): sidebar per role
  (dari `lib/roles.ts`), topbar dengan breadcrumb + CommandPalette + notifikasi,
  drawer di mobile, focus trap, theme toggle & font-size toggle. Komponen shared
  di **`apps/web/src/components/ui`** — **12 ekspor** (`components/ui/index.ts`):
  `PageContainer`, `PageHeader`, `StatCard`/`StatGrid`/`Sparkline`, `StatusBadge`,
  `DataTable`, `EmptyStateV3`, `FormPage`/`FormSection`/`ValidationAlert`,
  `CommandPalette`. Login memakai **split-screen**
  (`(auth)/login/page.tsx:32` — `grid lg:grid-cols-2`). 53 halaman role/publik
  lain + login ter-redesign (total 64 file `page.tsx` di `apps/web/src/app`,
  verifikasi glob 2026-08-10).
- **Landing v2 (publik)** — **10 halaman mandiri** (beranda, tentang, kontak,
  program-keahlian, fasilitas, ekstrakurikuler, prestasi, galeri, testimoni, faq)
  - berita; satu sistem token warna/typografi/spasi, 9 komponen aturan baku, dan
    21 aset SVG playful lokal (`apps/web/public/landing/playful/*.svg`, wajib lokal
    karena CSP `img-src 'self' data:`). Aksesibilitas WCAG AA (kontras token,
    `aria-hidden` untuk SVG dekoratif, `focus-visible`, reduced-motion). Data tiap
    halaman disuplai modul `public-content` (12 endpoint, cache 300s — §4.1).
    Keputusan: landing adalah **halaman mandiri**, bukan section dari satu
    `GET /public/landing` (catatan keputusan — [docs/08 §1.2](08-knowledge-base.md)).

---

## 6. Alur Autentikasi Lengkap

### 6.1 UserRole sebagai Otoritas — JWT Hanya Identitas

**Rekomendasi: tabel `UserRole` adalah satu-satunya otoritas role; JWT in-house hanya identitas (`sub`, `email`).** Tidak ada dimensi sekolah — seluruh user terdaftar di SATU sekolah, tanpa multi-sekolah dan tanpa `active_school` (prd04 §4.3 [owner-v4.2]).

| Aspek                      | Custom claims di JWT                             | Tabel mapping (UserRole)                      |
| -------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Perubahan role             | JWT lama tetap valid sampai expire (~15–60 mnt)  | Instan, cukup update baris                    |
| Multi-role                 | Representasi rumit dalam satu klaim              | Natural: 1 user → N baris (user_id, role)     |
| Ukuran                     | Terbatas (JWT header besar memperlambat request) | Tidak terbatas                                |
| Queryable untuk RBAC & RLS | Tidak (harus parse token)                        | Ya (join langsung di policy RLS)              |
| Konsistensi dengan RLS     | RLS tetap harus lookup tabel                     | Satu sumber kebenaran untuk app + RLS         |
| Kompleksitas               | Rendah tapi rapuh                                | Sedang; mitigasi: cache 60 detik + invalidasi |

Alasan tambahan: prd04 §5.P menetapkan satu metode login dan satu sekolah — tabel `UserRole` adalah satu-satunya otoritas; perubahan role instan; tanpa kebutuhan `active_school`. Risiko: lookup per request; mitigasi dengan cache Redis/in-memory TTL 60 s dan index `(user_id, status)`.

### 6.1a Multi-role Switcher (2026-08-18 — item 18)

Tabel `UserRole` mengizinkan **1 user → N baris role aktif** (`@@unique([user_id, role])`), sehingga user non-siswa/non-superadmin dapat **rangkap role** (mis. KEPSEK + GURU, OPERATOR + GURU). Frontend menambahkan lapisan UX **peran aktif** tanpa mengubah otorisasi backend:

- **Peran aktif (UI/navigasi)** — dipilih lewat dropdown **"Ganti peran"** di AppShell (`apps/web/src/components/layout/app-shell.tsx:390`) dan disimpan di localStorage **`opensis_active_role`** (`apps/web/src/lib/active-role.ts:16`). Menentukan dashboard, menu, dan route group yang dilihat user (`roleHome`).
- **Otorisasi backend = union seluruh roles** — guard API membaca **semua** role aktif user (`RequestContext.roles[]`) dan permission di-union; peran aktif TIDAK mempersempit izin. Ini menjaga prinsip P2 (JWT identitas, otorisasi dari `UserRole`) dan fail-closed RBAC tetap berlaku.
- **Aturan switcher** — SISWA & SUPERADMIN selalu single-role (tidak bisa di-switch; `switchableRoles` di `apps/web/src/lib/roles.ts:52`); role aktif valid di-resolve via `resolveActiveRole` (`roles.ts:57-67`) dengan fallback ke role pertama bila nilai localStorage tidak valid.
- **User dev** — seed menambah **`kepsek1`** (KEPSEK + GURU, keduanya ACTIVE) untuk menguji switcher (`packages/database/prisma/seed.ts:221-255`).
- **Test** — `apps/web/src/lib/__tests__/roles.test.ts` (switchableRoles, resolveActiveRole, roleHome).

### 6.2 Alur Lengkap (Username NIS/NIP + Password, In-house)

```
1. User isi "Username" (NIS/NIP) + password (web) → POST /api/v1/auth/login
   → AuthModule: cari User (username) → verify password Argon2id
   → buat JWT access (15–60 mnt; HS256/RS256, secret env) + refresh token (rotating)
   → set cookie httpOnly + Secure + SameSite=Lax; refresh token disimpan ter-hash
   → revoke refresh saat logout / peristiwa keamanan

2. Request API berikutnya
   → Authorization: Bearer <JWT> (dari httpOnly cookie)
   → middleware JWT verify in-house (signature, exp)
   → resolve UserRole aktif → RequestContext { userId, roles[], classIds, homeroomClassId }

3. Guard RBAC: @RequirePermission('resource:action[:scope]') vs permission set role
   (GAGAL → 403; fitur OFF → FEATURE_DISABLED 403)

4. Service/Repository: filter scope SENDIRI/KELAS/SEKOLAH; RLS opsional

5. Refresh: web kirim refresh token → AuthModule putar (rotating) → cookie baru;
   refresh lama di-hash dan di-revoke
```

Catatan penting:

- **Satu akun = satu sesi ujian aktif** (prd02 §2.2.c): saat `ExamAttempt` aktif, login ganda dari device berbeda ditolak oleh `ExamModule` (cek `ExamAttempt` status `IN_PROGRESS` per user; opsi force-expire sesi lama dengan catatan audit).
- **PPDB publik**: endpoint `/api/v1/ppdb/register` ditandai `@Public()` — tidak butuh JWT; pendaftar diberi `CALON_SISWA` role setelah lolos seleksi dan di-enroll (prd04 §5.M).
- **Undangan & reset password**: OPERATOR/WAKEPSEK/KEPSEK/SUPERADMIN kirim undangan (in-app) dengan role tetap; **username wajib (NIS/NIP), email opsional (notifikasi)**; `UserRole.status = INVITED` → user accept → `ACTIVE`. Reset password oleh OPERATOR/SUPERADMIN (in-app, password sementara sekali pakai) — **tanpa email/SMS** (prd04 §5.P).

### 6.3 Diagram Alur Auth

```
┌─────────┐  POST /auth/login        ┌──────────────────┐
│ Browser │─────────────────────────►│ AuthModule       │
│ (web)   │  { username,             │ (NestJS)         │
│         │    password }            │  Argon2id verify │
└────┬────┘                          └────────┬─────────┘
     │  set-cookie: access JWT + refresh      │ UserRole (otoritas role)
     │  (httpOnly, Secure, SameSite=Lax)      │ JWT access 15–60 mnt
     ▼                                        ▼
┌────────────────────────┐   verify in-house   ┌─────────────────────┐
│ API call (Bearer JWT)  │────────────────────►│ JWT middleware      │
│ /api/v1/...            │  (HS256/RS256,     │ (secret env)        │
└────────────────────────┘   secret env)       └──────────┬──────────┘
                                                      resolve UserRole
                                                            ▼
┌────────────────────────┐  roles, scope   ┌──────────────────┐
│ Global RBAC guard      │────────────────►│ Controller →     │
│ (@RequirePermission,   │                 │ Service → Repo   │
│  @Public)              │                 │ (filter scope    │
└────────────────────────┘                 │  RBAC; RLS ops.) │
                                           └──────────────────┘
```

---

## 7. Real-time (Socket.IO)

### 7.1 Topologi

- Satu server Socket.IO terpasang di `apps/api`; **namespace tunggal `/ws`** (adapter Redis untuk multi-instance di masa depan).
- **Room per konteks**: `user:{userId}`, `class:{classId}`, `exam:{examSessionId}` — untuk broadcast terarah.
- **Handshake auth**: `auth.token` (JWT in-house) pada handshake; gagal → `connection_error: UNAUTHORIZED`.

### 7.2 Daftar Event

| Arah            | Event                                                                                    | Payload inti                              | Pemicu                                             |
| --------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| server → client | `notification:new`                                                                       | `{ id, type, title, body, data }`         | Semua notifikasi (modul Notification)              |
| server → client | `assignment:new` / `assignment:graded`                                                   | `{ assignmentId, classId, ... }`          | Guru publish tugas / grade submission              |
| server → client | `exam:start`                                                                             | `{ examSessionId, startAt, durationMin }` | Sesi ujian dibuka                                  |
| server → client | `exam:time-warning`                                                                      | `{ minutesLeft }`                         | 10/5/1 menit tersisa                               |
| server → client | `exam:autosave-ok`                                                                       | `{ answerLogId, savedAt }`                | Acknowledge autosave                               |
| server → client | `exam:force-submit`                                                                      | `{ attemptId }`                           | Waktu habis (server-side autosubmit)               |
| server → client | `attendance:alpa`                                                                        | `{ studentId, date }`                     | Sesi ditutup tanpa kehadiran (notifikasi homeroom) |
| server → client | `attendance:session-closed`                                                              | `{ sessionId }`                           | QR expire / sesi ditutup                           |
| server → client | `invoice:due`                                                                            | `{ invoiceId, studentId }`                | Tagihan mendekati jatuh tempo                      |
| server → client | `payment:confirmed`                                                                      | `{ paymentId }`                           | Pembayaran diverifikasi KEUANGAN                   |
| server → client | `announcement:new`, `letter:status`, `library:due`, `discipline:recorded`, `ppdb:status` | sesuai konteks                            | Modul masing-masing                                |
| client → server | `exam:answer:save`                                                                       | `{ attemptId, answer, idempotencyKey }`   | Autosave (juga via REST fallback)                  |

Semua event ujian bersifat **best-effort**; sumber kebenaran tetap REST API (autosave via REST dengan `Idempotency-Key`; Socket hanya ack cepat). Reconnect: client re-join room otomatis; event yang terlewat diambil ulang via REST (mis. `GET /exam/attempts/:id`).

---

## 8. Storage (Self-Managed Object Storage)

### 8.1 Bucket per Jenis Dokumen

| Bucket                   | Isi                         | Policy akses (RBAC scope)                 |
| ------------------------ | --------------------------- | ----------------------------------------- |
| `materials`              | Materi (PDF, video, gambar) | Guru mapel + siswa kelas                  |
| `submissions`            | File tugas siswa            | Guru mapel + pemilik                      |
| `ppdb-documents`         | KK, akta, rapor (PII)       | OPERATOR + pendaftar pemilik (pre-enroll) |
| `payment-proofs`         | Bukti transfer              | KEUANGAN + pemilik                        |
| `permits`                | Surat izin/sakit            | homeroom + BK + pemilik                   |
| `counseling-attachments` | Lampiran BK                 | BK/WAKEPSEK/KEPSEK                        |
| `official-letters`       | Surat resmi                 | OPERATOR + approver                       |
| `exports`                | Rekap nilai, ekspor Dapodik | homeroom/OPERATOR/SUPERADMIN              |
| `avatars`                | Foto profil                 | Public-read (bukan PII sensitif)          |

> **Catatan drift (2026-08-17):** tabel di atas adalah desain bucket. Bucket yang
> **terdaftar di `BUCKET_POLICIES` aktual** (`storage/storage.constants.ts:292-301`)
> hanya 8: `branding`, `avatars`, `landing`, `materials`, `submissions`,
> `ppdb-documents`, `ppdb-consents`, `exports`. Bucket `payment-proofs`, `permits`,
> `counseling-attachments`, `official-letters` pada tabel desain **belum** ada di
> `BUCKET_POLICIES` (drift; `permits` hanya disebut di `attendance/dto/create-permit.dto.ts:28`
> sebagai konvensi path, tanpa enforcement policy) — selaraskan saat modul
> pemilik (finance/attendance/communication) memakai upload terkelola.

### 8.2 Alur Upload (langsung ke API, multipart — tanpa S3)

```
Client (web) → POST /api/v1/storage/files/{bucket}  (multipart, field "file")
   → NestJS: validasi RBAC + jenis bucket + quota → simpan ke STORAGE_LOCAL_DIR/{bucket}/
   → response { path } → simpan path di DB
Client → GET /api/v1/storage/files/{bucket}/{path} (public branding/avatars; protected lainnya)
```

### 8.3 Contoh Policy (deskriptif)

```sql
-- RLS opsional (defense-in-depth RBAC) berbasis role/scope — tanpa school_id
-- Tabel role aktual: "user_role" (schema @@map). Helper app.current_user_id()
-- mengembalikan text (PK user_* bertipe String/cuid) — jangan pakai ::uuid.
CREATE POLICY "materials_read_owner_class"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materials'
    AND EXISTS (
      SELECT 1 FROM "user_role" ur
      WHERE ur.user_id = app.current_user_id()
        AND ur.status = 'ACTIVE'
        AND (ur.role IN ('GURU','OPERATOR','WAKEPSEK','KEPSEK','SUPERADMIN')  -- pengajar/admin
             OR (ur.role = 'SISWA' AND <siswa di kelas pemilik materi>))
    )
  );
```

Konvensi path: `{bucket}/{module}/{entity_id}/{file}` (tanpa school_id) agar kebijakan akses bisa diuji dari path. Enkripsi at-rest: tanggung jawab filesystem/volume backend (data PII — PPDB, BK — tidak pernah disimpan di folder publik `branding`/`avatars`).

---

## 9. Integrasi Eksternal

### 9.1 Live Class

| Opsi              | Kapan dipakai                      | Kebutuhan                                                                             |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| **DITUNDA**       | Tanpa Jitsi/Zoom/Meet (prd04 §5.O) | Bila dibangun: **WebRTC self-hosted** (SFU + TURN/STUN), tanpa API fitur pihak ketiga |
| Link manual (MVP) | MVP: tautan manual                 | Field `live_class_url` di entitas kelas/jadwal; tombol "Buka Link"                    |

### 9.2 Lainnya

- **Dapodik/ANBK (G4)**: ekspor file Excel/CSV terformat (bukan API langsung — akses resmi terbatas, prd03 §4.4); struktur data siswa/rombel disiapkan kompatibel.
- **Payment gateway**: **opsional, flag OFF default** (`FINANCE_GATEWAY`, prd04 §5.F.7); manual-first + rekonsiliasi file CSV.
- **Import migrasi (G9)**: template Excel (siswa, guru, kelas) → `ImportBatch`/`ImportError` + validasi & preview.

---

## 10. Offline-First / PWA (G10)

### 10.1 Arsitektur

Keputusan scope: **MVP = queue absensi QR + cache materi dasar** (dibangun di M-ABSQR-T8 & F2-T5); **PWA penuh/luas ditunda** sampai ada bukti kebutuhan sekolah pilot (prd03 G10). Arsitektur di bawah disiapkan modular agar tinggal diaktifkan saat PWA penuh diizinkan.

> **Status implementasi (2026-08):** PWA penuh (Service Worker/Workbox, background sync,
> `queue.absensi`, `cache.materi`) **belum diimplementasikan** — diagram di bawah adalah
> desain target/roadmap. Yang sudah berjalan hari ini: antrean jawaban ujian offline via
> **sessionStorage** (`opensis_exam_pending_answers`, `apps/web/src/lib/storage.ts`) dan
> cache ber-TTL via **localStorage** (branding, dashboard config); data fetching memakai
> hook `useApi`/`useAsyncData`, **tanpa TanStack Query, Zustand, maupun IndexedDB**.

```
Web (Next.js + next-pwa/Workbox)                          ← desain target PWA (roadmap)
├── Service Worker
│   ├── Precache: shell aplikasi (JS/CSS)
│   ├── Runtime cache: materi (stale-while-revalidate), gambar (cache-first + data-saver)
│   └── Background Sync: kirim antrean saat online kembali
├── IndexedDB
│   ├── queue.absensi  → { sessionId, studentId, scannedAt, idempotencyKey }
│   ├── queue.autosave → { attemptId, answerId, payload, idempotencyKey }
│   └── cache.materi   → materi yang sudah dibuka
└── TanStack Query (stale data + refetch saat online)    ← diimplementasi sebagai useApi/useAsyncData
```

### 10.2 Alur Kritis

**Absensi QR offline** (prd02 §3.3 + prd03 G10): **belum ada queue offline di klien** —
scan absensi berjalan online (`POST /api/v1/attendance/records/scan`, idempotent). Alur
di bawah adalah desain target PWA:

1. Siswa scan QR saat offline → simpan ke `queue.absensi` (token QR + idempotencyKey di-generate client).
2. Online → background sync kirim `POST /api/v1/attendance/records/scan` dengan key yang sama.
3. Server validasi (token sekali pakai + waktu) → sukses/tolak; duplikat key → `200` idempotent (tidak dobel absen).

**Autosave ujian offline**: jawaban ditulis ke **sessionStorage** (`opensis_exam_pending_answers`) setiap 15 detik + pada `visibilitychange`; flush ke `POST /api/v1/exam/attempts/:id/answers` (idempotent); waktu habis tetap diputus **server-side** (`exam:force-submit`).

**Data-saver (G16, digabung G10)**: kompresi otomatis gambar/dokumen di sisi server sebelum disimpan (prd03 §6); mode hemat data mengirim header `Save-Data` → Next.js image optimizer mengirim versi lebih kecil.

---

## 11. Observability (G7)

| Lapisan            | Tool                                         | Detail                                                                                                                                                                     |
| ------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structured logging | pino + pino-http                             | JSON log; request ID (header `X-Request-Id`, dihasilkan per transaksi, di-echo ke response); konteks request (`userId`, `module`); **tidak pernah log token/password/PII** |
| Error tracking     | Sentry (web + api) — opsional non-dependensi | Source map; tag `userId`/`module`; alert error baru; grouping per modul                                                                                                    |
| Metrik             | Prometheus + Grafana                         | HTTP request count/latency (histogram), error rate, active Socket.IO connections, queue depth, DB pool; dashboard **SUPERADMIN (admin sistem sekolah)**                    |
| Alerting           | Grafana Alerting                             | **Khusus jam ujian**: error rate > 1% dalam 5 menit, p95 latency > 3 s, autosave failure rate > 5% → alert on-call; alert umum: error 5xx spike, disk usage, backup gagal  |
| Audit              | AuditLog                                     | Perubahan data sensitif (nilai, absensi, BK, pembayaran, data siswa) — actor, entity, before/after, timestamp                                                              |

---

## 12. Backup & Disaster Recovery (G8)

| Aspek      | Target                                 | Implementasi                                                                                                                                             |
| ---------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPO        | ≤ 24 jam (target operasional 15 menit) | Backup harian full + WAL archiving (PITR) — pakai kemampuan **managed PostgreSQL (RDS/Neon)** atau `pg_basebackup` + WAL untuk self-managed              |
| RTO        | ≤ 4 jam                                | Runbook restore terdokumentasi + restore drill bulanan; komponen stateless (web/api) redeploy otomatis dari image; hanya DB + Storage yang perlu restore |
| Off-region | Backup disimpan di region terpisah     | Snapshot DB direplikasi lintas region; **direktori storage lokal** (`STORAGE_LOCAL_DIR`) di-backup periodik ke lokasi/volume terpisah                    |
| Cakupan    | DB + Storage + env/secrets             | Semua bucket (materi, submission, PPDB) masuk cakupan; secrets di Vault (bukan di backup)                                                                |
| Verifikasi | Restore drill bulanan                  | Auto-test: restore ke sandbox → jalankan smoke test (login, query data, ekspor)                                                                          |

---

## 13. Security Hardening (G11)

| Area                | Langkah                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limiting       | `@nestjs/throttler`: login 5 gagal/15 mnt/user; submit ujian 20/mnt/user; scan QR 30/mnt/user; API global 1000/mnt/IP                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Brute-force lockout | Kolom `failed_login_attempts` (User): 5 gagal → lock 15 mnt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| CSRF                | Cookie session `SameSite=Lax`; mutasi lintas-origin pakai double-submit token; Next.js Server Actions memakai proteksi bawaan                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| CSP                 | Web (`next.config.ts`): `default-src 'self'`; `script-src 'self' 'unsafe-inline'` di production (tanpa nonce, tanpa `'unsafe-eval'`; dev menambah `'unsafe-eval'` untuk React dev/Turbopack); `style-src 'self' 'unsafe-inline'` (branding CSS vars); `img-src 'self' data:`; `connect-src 'self' ws: wss:` (realtime Socket.IO, tanpa Jitsi/Supabase). API (`main.ts`): helmet default + `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `upgrade-insecure-requests` saat HTTPS. **Roadmap/target: script nonce — saat ini memakai `'unsafe-inline'`** |
| Header keamanan     | Helmet di NestJS; `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Dependency          | `npm audit` di CI (fail on high/critical), Dependabot/Renovate, lockfile terverifikasi                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Secret              | `.env.example` tanpa nilai; secret di env CI/Vault; rotasi rutin; scan secret di repo (gitleaks)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| RLS                 | **Opsional** (defense-in-depth RBAC, tanpa session var tenant); test **isolasi scope RBAC (SENDIRI/KELAS/SEKOLAH)** di integration test                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Privacy (G14)       | AuditLog untuk perubahan data sensitif; field-level access untuk `CounselingNote` (hanya role **BK/WAKEPSEK/KEPSEK**)                                                                                                                                                                                                                                                                                                                                                                                                                                               |

> **Catatan keamanan terkini (verifikasi 2026-08-10):**
>
> - **JWT canonical signature ditolak** — verifier in-house menolak signature
>   base64url NON-kanonik (mutasi bit padding di karakter terakhir): decode →
>   re-encode harus sama persis; selain itu juga `timingSafeEqual` + cek
>   panjang signature (`apps/api/src/modules/auth/jwt.util.ts:88-96`).
> - **RBAC scope enforcement** — permission + scope (SENDIRI/KELAS/SEKOLAH)
>   diperkuat di kasus spesifik: **parent-portal IDOR (SEC-001)** — setiap akses
>   data anak wajib lolos cek relasi `ParentStudentLink` (`parent-portal.service.ts:124,176`);
>   **finance scope (SEC-002)** — baca invoice memaksa scope ke pemilik/anak via
>   `ParentStudentLink` bila aktor SISWA/WALI_MURID (`finance/services/invoice.service.ts:21,233`).
> - **Refresh token di-revoke saat ganti/reset password (SEC-007)** — `changePassword`
>   dan `resetPassword` mencabut SELURUH refresh token aktif user
>   (`auth.service.ts:320-323, 363-366`; unit test `auth.service.spec.ts:295,350`).
> - **`COOKIE_SECURE` fail-fast di production** — `main.ts:21-23`: bila
>   `NODE_ENV=production` dan `COOKIE_SECURE !== "true"`, aplikasi **gagal boot**
>   (tidak memakai cookie non-Secure diam-diam).
> - **Audit log failure logging** — `writeAudit` membungkus kegagalan dengan
>   try/catch agar tidak menggagalkan request utama, lalu mencatat
>   `logger.error("writeAudit gagal", ...)` (`lms/lms-audit.ts:65,93`).
> - **Mapping error Prisma** — filter exception memetakan **P2002** (unique →
>   409), **P2025** (record tidak ditemukan → 404), **P2003** (foreign key → 409) dengan pesan GENERIK ke klien (`common/filters/all-exceptions.filter.ts:111-125`).
> - **Race & reliability** — verifikasi pembayaran memakai transaksi + re-check
>   status (race dua verify → 1 sukses, 1 Conflict, notifikasi sekali —
>   `finance/services/payment.service.ts:122,166,203` + spec); `RolloverProcessor`
>   cek terminal state + cocokkan `idempotency_key` sebelum eksekusi
>   (`jobs/processors/rollover.processor.ts:38-56`).
>
> **Keamanan go-live (2026-08-16):**
>
> - **Redis wajib password** — production memaksa `REDIS_PASSWORD` terisi
>   (fail-fast `docker-compose.prod.yml:37`); API memakai `REDIS_URL` berisi
>   password (`redis://:${REDIS_PASSWORD}@redis:6379`); container redis
>   `requirepass` sama (`docker-compose.yml:81`).
> - **Port service prod hanya 127.0.0.1** — postgres/redis/api/web terikat
>   loopback host (`docker-compose.prod.yml:30-64,111`); port publik HANYA
>   Nginx :80. Migrasi/akses dari host tetap bisa via `localhost:5432/6379/3000/3001`.
> - **Gate `DEMO_MODE`** — jalur data demo/fallback hanya aktif saat
>   `NEXT_PUBLIC_DEMO=1` (`apps/web/src/lib/api-client.ts:13-17`); API menolak
>   boot di production bila `NEXT_PUBLIC_DEMO=1` (`apps/api/src/main.ts:31`).
> - **Anti-IDOR tambahan** — jurnal PKL: `assertJournalActor` memaksa aktor
>   (siswa pemilik/pembimbing/guru dengan scope) sebelum baca/tulis
>   (`smk/internship.service.ts:199`); cancel booking aset: hanya pemilik
>   booking atau role sekolah (`asset/services/asset-booking.service.ts:178-185`).

---

## 14. Strategi Testing (G6) & CI

| Lapisan     | Framework                                    | Cakupan                                                                                                                                                                                 |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Jest                                         | Logika penilaian (auto-grade PG, isian), RBAC guard (matrix role×aksi), late submission, perhitungan tagihan, validasi token QR                                                         |
| Integration | Jest + Supertest + testcontainers PostgreSQL | Alur ujian E2E (paket → sesi → attempt → autosave → autosubmit → grade), alur QR absensi (generate → scan → sekali pakai), **isolasi scope RBAC (SENDIRI/KELAS/SEKOLAH)**, RLS opsional |
| E2E         | Playwright                                   | Setup awal sekolah (G19), **login Username (NIS/NIP) + Password (bukan Google mock)**, guru buat tugas → siswa submit → guru nilai, homeroom lihat rapor                                |
| Load        | k6                                           | Ujian online: ratusan siswa submit dalam 5 menit terakhir; target p95 < 3 s; identifikasi bottleneck autosave                                                                           |

**CI (GitHub Actions)** — implementasi aktual **10 job** (`.github/workflows/ci.yml`, verifikasi 2026-08-17):
`lint` → `prettier` → `typecheck` → `unit` (Jest, tanpa DB) → `web-test` (Vitest) → `integration` (service postgres; test integration + e2e-spec) → **`web-e2e` (Playwright, 4 test scaffold — SUDAH aktif di CI, service postgres + seed + dev stack)** → `build` → `audit` (npm audit) → `secrets` (gitleaks). Seluruh job berjalan pada tiap push ke `main` dan pull request; load test k6 tetap terjadwal sebelum ujian sungguhan (prd02 §7).

**Skrip test (2026-08-16, selaras CI):** `apps/api/package.json` —
`test:unit` = jest tanpa path `integration|e2e`, `test:unit:coverage` = unit + `--coverage`
(gate QA-007, dijalankan job `unit`), `test:integration` = jest HANYA path
`integration|e2e` (dijalankan job `integration`). Web: `apps/web/package.json`
`test:unit` = `vitest run`; `apps/web/vitest.config.ts` kini punya blok
`coverage` (v8 provider, **threshold floor 0** — anti-regresi, bukan target;
target tetap ≥ 80% roadmap). Catatan: job `web-test` belum menjalankan `--coverage` —
aktivasi gate coverage web di CI masih terbuka (Rv5-14).

---

## 15. Diagram Arsitektur Sistem

```
                        ┌──────────────────────────────────────────────┐
                        │                 apps/web (Next.js)           │
                        │  Route groups: (siswa)(guru)(admin)(ortu)    │
                        │  (superadmin)/admin-sistem                   │
                        │  Server Components + Client Components       │
                        │  useApi/useAsyncData · React Context ·       │
                        │  localStorage/sessionStorage (offline queue) │
                        └───────┬───────────────────────┬──────────────┘
                                │ HTTPS (REST /api/v1)  │ WSS (Socket.IO)
                                │ Bearer JWT (cookie)   │ namespace /ws
                                ▼                       ▼
        ┌───────────────────────────────────────────────────────────────┐
        │                     apps/api (NestJS)                          │
        │  JWT middleware → RBAC guard → Controller → Service → Repo     │
        │  Modules: Auth School Academic Lms Quiz Exam Attendance        │
        │           Finance Ppdb Notification ...                        │
        │  Rate limiter · Request ID · pino · AuditLog                   │
        └──────┬──────────────┬──────────────┬──────────────┬───────────┘
               │              │              │              │
        ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼──────┐ ┌─────▼──────────┐
        │ PostgreSQL │ │ Redis      │ │ Storage     │ │ Live class     │
        │ skema      │ │ cache/rate │ │ lokal       │ │ DITUNDA        │
        │ tunggal,   │ │ lock/socket│ │ (STORAGE_   │ │ (WebRTC self-  │
        │ RLS ops.   │ │ adapter    │ │ LOCAL_DIR)  │ │  hosted bila   │
        │ 91 tables │ │            │ │             │ │  dibangun)     │
        └────────────┘ └────────────┘ └─────────────┘ └────────────────┘
```

### 15.1 Diagram Alur Data Ujian Online

```
Siswa buka jadwal ujian (web)
  → GET /exam/sessions (RBAC: siswa)
  → input token sesi (dari pengawas)
  → POST /exam/sessions/:id/attempts/start  { token }
      ├─ validasi: jadwal buka, token sekali pakai, satu akun satu sesi
      ├─ buat ExamAttempt (IN_PROGRESS) + acak soal & opsi (paket A/B/C)
      └─ response { attemptId, questions[], remainingSeconds }

Loop autosave (Client Component + sessionStorage queue)
  → setiap 15s / pada visibilitychange
  → POST /exam/attempts/:id/answers { answer, idempotencyKey }
      ├─ validasi masih IN_PROGRESS & dalam waktu
      ├─ tulis ExamAnswerLog (append-only, timestamp)
      └─ 200 { savedAt } (idempotent per key)

Waktu habis (server-side, tidak bergantung client)
  → ExamModule cron/penjadwalan: autosubmit → ExamAttempt SUBMITTED
  → emit exam:force-submit + exam:autosave-ok
  → grade otomatis PG/isian; esai → antrean manual grade guru
  → skor masuk Grade (sumatif) → bahan e-Rapor (rapor Kurikulum Merdeka)
  → tulis AuditLog (perubahan jawaban & submit) untuk investigasi sengketa
```

---

## 16. Architecture Decision Records (ADR)

### ADR-001: Single-school: satu skema, tanpa school_id

**Keputusan:** satu skema PostgreSQL untuk SATU sekolah; tanpa kolom identitas sekolah (`school_id`) di tiap entitas; tanpa multi-tenant, tanpa school switcher; **RLS opsional** (defense-in-depth).
**Alternatif ditolak:** shared schema + `school_id` + RLS tenant (tidak relevan — tidak ada isolasi antar-sekolah), DB-per-tenant (biaya ops & backup N× lipat, tidak dibutuhkan).
**Alasan:** prd04 §16.3(g) [owner-v4.2] — aplikasi untuk SATU sekolah (500–3.000 user); seluruh data milik sekolah itu; dashboard & ekspor hanya untuk sekolah tersebut.
**Trade-off:** tidak bisa langsung dijadikan SaaS multi-sekolah tanpa refactor; mitigasi: struktur modul tetap memisahkan data per entitas sehingga dimensi sekolah bisa ditambahkan bila model bisnis berubah.
**Implikasi:** guard scope RBAC (SENDIRI/KELAS/SEKOLAH) di aplikasi adalah lapis utama; RLS opsional lapis kedua (tanpa session var tenant).

### ADR-002: Auth in-house vs managed auth / IdP eksternal

**Keputusan:** auth in-house — Username (NIS/NIP) + Password (Argon2id), JWT httpOnly cookie, refresh rotation. **Tanpa ketergantungan pihak ketiga** (prd04 §5.O, §5.P).
**Alternatif ditolak:** managed auth / Google OAuth / email SSO (third-party API fitur — dilarang [owner-v4.1]), Keycloak/Zitadel (beban operasional besar untuk tim kecil).
**Alasan:** prd04 §5.P — satu metode login; hash Argon2id; cookie aman; reset via OPERATOR; keputusan no-third-party [owner-v4.1].
**Trade-off:** **kehilangan OAuth/SSO diterima** (tidak ada social login); mitigasi: interface `AuthService` + JWT standar → bisa menambah IdP nanti tanpa ubah backend.

### ADR-003: Turborepo vs Nx

**Keputusan:** Turborepo.
**Alternatif ditolak:** Nx (powerful tapi kompleks, overkill untuk 2 apps + 3 packages + tim 1–3 orang).
**Alasan:** prd01 [v1] §6.1 — ringan, cache remote cepat, konfigurasi minimal; cukup untuk task orchestration (build/lint/test).
**Trade-off:** plugin ecosystem Nx tidak tersedia; tidak relevan pada skala ini; bisa migrasi bila monorepo tumbuh besar.

### ADR-004: NestJS + Prisma vs Express/TypeORM

**Keputusan:** NestJS (modular per domain, DI, guard global) + Prisma (type-safe, migrasi, anti SQL-injection by default).
**Alternatif ditolak:** Express (tidak ada struktur/DI — rawan modul berantakan), TypeORM/Sequelize (dekorator entity rawan, migrasi kurang mulus).
**Alasan:** prd01 [v1] §6.2; modularitas NestJS cocok untuk 18+ modul domain; Prisma mendukung RLS via `$transaction` — **opsional, tanpa `set_config` tenant** (single-school; session var hanya `app.user_id`).
**Trade-off:** Prisma kurang fleksibel untuk query super kompleks → `$queryRaw` untuk laporan/analitik; tetap filter scope RBAC.

### ADR-005: JWT mapping vs custom claims (lihat §6.1)

**Keputusan:** tabel `UserRole` sebagai otoritas; JWT hanya identitas.
**Alasan:** prd04 §4.3 — role berubah instan, queryable untuk RLS opsional; **tanpa `school_id`/`active_school`** (single-school).
**Trade-off:** lookup tambahan per request → cache 60 detik (Redis/in-memory) + index `(user_id, status)`.

### ADR-006: Live class

**Keputusan:** **DITUNDA**; tanpa Jitsi/Zoom/Meet (prd04 §5.O); MVP memakai tautan manual (`live_class_url`).
**Alternatif ditolak:** Jitsi (third-party API fitur — dilarang [owner-v4.1]), Zoom embed (lisensi & restriktif), BigBlueButton (berat, butuh infra besar).
**Alasan:** prd04 §5.A.10/§5.O — live class bukan prioritas; **bila dibangun = WebRTC self-hosted** (SFU + TURN/STUN).
**Trade-off:** tidak ada video conference built-in di MVP; mitigasi: tautan manual selalu tersedia di UI.

---

## 17. Keterkaitan dengan Dokumen Lain

- Skema lengkap **92 model + 65 enum single-school** (`packages/database/prisma/schema.prisma`, verifikasi 2026-08-18) + **1 baseline migrasi squashed `20260818000000_init_squashed`** (`packages/database/prisma/migrations/`, verifikasi 2026-08-18) — 17 folder migrasi inkremental sebelumnya disquash menjadi satu baseline **136 index (85 CREATE INDEX + 51 CREATE UNIQUE INDEX) + 133 relasi**; DB development di-reset & seed ulang. RLS opsional: `03-database-erd.md`. _(Riwayat migrasi inkremental `20260816030000_add_pdp_module`, `20260816020000_add_rapor_p5`, `20260816010000_payment_idempotency`, `20260816000000_staff_ter_category`, `20260810000000_parent_link_approval`, `20260809000000_audit_fixes`, `20260808235959_exam_attempt_token_dedupe` tercatat di [CHANGELOG.md](../CHANGELOG.md).)_
- **Optimasi N+1 (2026-08-18, item 19)** — pola batch di hot path: rollover `buildPlan`/`execute` (createMany/updateMany per entitas, `rollover.service.ts:503-712`), daftar aset tanpa query per baris, payslip batch payroll (`payroll/services/payslip.service.ts`), denda & refresh status finance (`finance/services/late-fee.service.ts:213`, `payment.service.ts:384-400`), anonimisasi PDP `updateMany` (`pdp-anonymize.service.ts:66-110`), impor chunk `$transaction` (`onboarding/import.service.ts:65,221-283`); pagination `skip/take` pada exam/alumni/smk/ppdb; **4 index baru** (PERF-02): `Grade(academic_year)`, `Invoice(status)`, `Enrollment(academic_year_id)`, `Attendance(status)`.
- Kontrak endpoint, RBAC matrix, contoh payload: `04-api-contract.md`.
- Urutan implementasi, task breakdown, risk register: `05-implementation-plan.md`.
- Keputusan single-school & no-third-party: prd04 v4.2 §16.3(g) [owner-v4.2].
