# Technical Architecture — openlms Super-App (LMS + SIS, Single-School)

**Versi:** 1.1
**Tanggal:** 7 Agustus 2026
**Status:** Final desain single-school (input: prd04 v4.2 [owner-v4.2]; menggantikan desain multi-tenant v1.0)
**Referensi konsisten:** `03-database-erd.md`, `04-api-contract.md`, `05-implementation-plan.md`

> **Catatan versi 1.1:** dokumen ini menggantikan desain multi-tenant v1.0. Aplikasi melayani **SATU sekolah** (prd04 §16.3(g) [owner-v4.2]): tanpa kolom identitas sekolah di tiap entitas, tanpa tenant isolation, tanpa layanan auth/storage pihak ketiga, tanpa school switcher. Rincian keputusan di §16 ADR.

---

## 1. Ringkasan Eksekutif

openlms dibangun sebagai monorepo Turborepo dengan **satu backend NestJS** (`apps/api`), **satu frontend Next.js App Router** (`apps/web`), dan **tiga paket bersama** (`packages/database`, `packages/ui`, `packages/types`). Aplikasi berjalan untuk **SATU sekolah** dengan **skema tunggal** — tanpa multi-tenant, tanpa school switcher, tanpa SUPERADMIN penyedia SaaS (prd04 §16.3(g) [owner-v4.2]). Otorisasi dikendalikan **permission + scope RBAC (SENDIRI/KELAS/SEKOLAH)** di aplikasi sebagai lapis utama; **RLS PostgreSQL bersifat opsional** (defense-in-depth, tanpa session var tenant). **Auth in-house**: Email/Username + Password (Argon2id), JWT di httpOnly cookie, refresh rotation; **otoritas role adalah tabel `UserRole`** — JWT hanya identitas (`sub`), agar perubahan role instan. Real-time via **Socket.IO namespace tunggal `/ws`** (siap multi-instance via Redis adapter); storage via **object storage self-managed (MinIO/S3) dengan signed URL**; live class **DITUNDA** (tanpa Jitsi/Zoom/Meet); feature flags global (`FeatureFlag`/`AppFeatureSetting`) dikendalikan **SUPERADMIN = admin sistem sekolah** (prd04 §5.N).

Keputusan yang membentuk arsitektur ini: modular backend per domain, route groups frontend per peran, autosave ujian yang idempotent, queue offline untuk absensi QR, observability & backup/DR sejak fase 0 (G6–G8, G11 prd04).

---

## 2. Prinsip Arsitektur

| # | Prinsip | Arti Operasional |
|---|---------|------------------|
| P1 | Isolasi akses per scope RBAC | Guard NestJS `@RequirePermission('resource:action[:scope]')` (scope SENDIRI/KELAS/SEKOLAH) adalah lapis utama; RLS PostgreSQL **opsional** sebagai defense-in-depth **tanpa dimensi tenant**. |
| P2 | JWT = identitas, bukan otorisasi | Role di-resolve dari tabel `UserRole` per request (cache 60 detik); JWT hanya membawa `sub`. |
| P3 | Skema tunggal, evolusi bertahap | Satu skema Prisma untuk SATU sekolah; tambah fitur = tambah migrasi, bukan tenant baru. |
| P4 | Backend modular per domain | Tiap modul (Auth, School, Academic, Lms, Quiz, Exam, Attendance, Finance, Ppdb, Notification, dsb) independen: controller → service → repository. |
| P5 | Frontend server-first | Server Components untuk data-fetching, Client Components hanya untuk interaktivitas (form, timer kuis/ujian). |
| P6 | Kritis alur = idempotent & audit | Autosave ujian, scan QR, dan pembayaran punya idempotency key; perubahan sensitif masuk `AuditLog`. |
| P7 | Observability & DR bukan fitur | Struktur logging, error tracking, backup/PITR, dan rate limiting dibangun di Fase 0–1, bukan ditambahkan belakangan. |

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
│       │   ├── (auth)/login          # login Email/Username + Password (tanpa OAuth)
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
└── .github/workflows/ci.yml          # CI: lint → typecheck → unit → integration → build
```

**Tanggung jawab paket:**

| Paket | Tanggung jawab | Batas |
|-------|----------------|-------|
| `apps/api` | Semua logika bisnis, otorisasi, real-time gateway, integrasi storage (signed URL MinIO/S3) — **tanpa dependensi API fitur pihak ketiga** | Tidak boleh import komponen UI |
| `apps/web` | Presentasi, routing per role, state UI, PWA/offline, upload via signed URL | Tidak boleh query Prisma langsung; hanya via API |
| `packages/database` | Skema Prisma (61 entitas: 56 + FeatureFlag, AppFeatureSetting, AcademicYear, RolloverRun, Alumni), client singleton, migrasi, seed, file RLS **opsional** | Tidak boleh berisi logika bisnis |
| `packages/ui` | Komponen shadcn/ui yang di-styling, primitives | Stateless; data lewat props |
| `packages/types` | Enum, DTO, kontrak API (satu sumber kebenaran tipe) | Tanpa runtime berat |

Aturan dependensi (ditegakkan ESLint `import/no-restricted-paths` + Turborepo): `web → api (HTTP)`, `web → packages/{ui,types}`, `api → packages/{database,types}`, `packages/database → packages/types` (enum).

---

## 4. Arsitektur Backend (NestJS)

### 4.1 Modul per Domain

| Modul | Tanggung jawab utama | Entitas inti (lihat ERD) |
|-------|----------------------|--------------------------|
| `AuthModule` | Login Email/Username + Password (Argon2id), JWT httpOnly cookie, refresh rotation, reset via OPERATOR | User, UserRole |
| `SchoolModule` | Pengaturan aplikasi, feature flags (FeatureFlag/AppFeatureSetting), impor data, retensi, rollover tahun ajaran | SchoolProfile, FeatureFlag, AppFeatureSetting, ImportBatch, ImportError, DataRetentionPolicy, AcademicYear, RolloverRun |
| `AcademicModule` | Kelas, mapel, jadwal, enrollment, rapor | Class, Subject, ClassSubject, ScheduleEntry, Enrollment, Grade |
| `LmsModule` | Materi, tugas, submission, penilaian | Material, Assignment, Submission |
| `QuizModule` | Bank soal, kuis, attempt | Quiz, Question, QuizAttempt |
| `ExamModule` | Paket ujian, sesi, token, attempt, autosave, analisis butir | Exam, ExamPackage, ExamSession, ExamAttempt, ExamAnswerLog |
| `AttendanceModule` | Sesi QR, geofencing, rekap, izin/sakit | AttendanceSession, AttendanceQrToken, AttendanceRecord, Attendance |
| `StudentAffairModule` | BK, tata tertib, ekskul, prestasi | CounselingNote, DisciplinePoint, DisciplineRecord, Extracurricular, ExtracurricularEnrollment, Achievement |
| `StaffModule` | Data induk & absensi guru/staf | Staff, StaffAttendance |
| `AssetModule` | Inventaris & peminjaman | Asset, AssetBooking |
| `LibraryModule` | Katalog & peminjaman buku | LibraryBook, LibraryLoan |
| `FinanceModule` | Tagihan & pembayaran | Invoice, Payment |
| `PpdbModule` | Pendaftaran publik, verifikasi, seleksi, konsent | PpdbApplicant, ParentalConsent |
| `CommunicationModule` | Pengumuman, surat resmi, notifikasi | Announcement, OfficialLetter, Notification |
| `ParentModule` | Portal wali murid (read-only) | ParentGuardian, ParentStudentLink |
| `VocationalModule` | PKL/UKK (Fase 3) | Internship, InternshipJournal, InternshipPartner, IndustryMentor, CompetencyTest, CompetencyRubricItem |
| `ExportModule` | Ekspor Dapodik/ANBK, rekap nilai | DataExportLog |
| `AuditModule` | Audit trail generik | AuditLog |
| `RealtimeModule` | Socket.IO gateway, namespace tunggal `/ws` (siap multi-instance) | Notification |
| `IntegrationModule` | Storage signed URL (MinIO/S3); tanpa integrasi fitur pihak ketiga | — |

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

| Lapisan | Mekanisme |
|---------|-----------|
| Middleware JWT | Verifikasi `Authorization: Bearer <JWT in-house>` (HS256/RS256, secret dari env); cek signature & `exp`. Hasil `sub` → resolve `UserRole` aktif → attach `RequestContext { userId, roles[], classIds, homeroomClassId }`. |
| Guard RBAC global | Baca `@RequirePermission('resource:action[:scope]')` di handler + scope resolver (SENDIRI/KELAS/SEKOLAH); role guard `@Roles(...)` sebagai gula sintaks. Endpoint publik ditandai `@Public()`. |
| Interceptor request | Set request ID header; logging terstruktur; **tanpa session variable tenant**. |
| Filter exception | Format error standar `{ error: { code, message, details, requestId } }` (konsisten dengan 04-api-contract §1.6). |
| Rate limiter | `@nestjs/throttler` per endpoint (lihat §13). |

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
├── (auth)/login                  # login Email/Username + Password (tanpa OAuth)
├── (ppdb)/pendaftaran            # publik (WCAG AA, no auth)
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

| Jenis | Dipakai untuk | Contoh |
|-------|---------------|--------|
| Server Component (default) | Data-fetching awal, daftar, detail, rendering statis | Daftar materi, rekap nilai, detail kelas |
| Client Component | Interaktivitas, timer, form dinamis, real-time | Form tugas, kuis timer, autosave ujian, scan QR kamera, peta geofencing |
| Server Action | Mutasi ringan form (dengan validasi) | Mark notifikasi terbaca, submit izin |

Aturan: halaman ujian online adalah Client Component (butuh timer + autosave + visibilitychange), tetapi token & jadwal diverifikasi dari server; jawaban tidak pernah dikirim via Server Action — selalu via REST API dengan idempotency key.

### 5.3 State Management

- **Server state** (data dari API): TanStack Query — cache, retry, optimistic update untuk nilai & notifikasi.
- **Client state** (UI): Zustand untuk state kecil lintas komponen (mode data-saver, dsb.); local state untuk form.
- **Offline queue**: IndexedDB (lib `idb`) — antrean absensi QR & autosave ujian, disinkronkan dengan background sync (lihat §10).
- **Realtime**: hook Socket.IO (`useSocket`) namespace `/ws`; event → invalidate TanStack Query / toast.

---

## 6. Alur Autentikasi Lengkap

### 6.1 UserRole sebagai Otoritas — JWT Hanya Identitas

**Rekomendasi: tabel `UserRole` adalah satu-satunya otoritas role; JWT in-house hanya identitas (`sub`, `email`).** Tidak ada dimensi sekolah — seluruh user terdaftar di SATU sekolah, tanpa multi-sekolah dan tanpa `active_school` (prd04 §4.3 [owner-v4.2]).

| Aspek | Custom claims di JWT | Tabel mapping (UserRole) |
|-------|----------------------|--------------------------|
| Perubahan role | JWT lama tetap valid sampai expire (~15–60 mnt) | Instan, cukup update baris |
| Multi-role | Representasi rumit dalam satu klaim | Natural: 1 user → N baris (user_id, role) |
| Ukuran | Terbatas (JWT header besar memperlambat request) | Tidak terbatas |
| Queryable untuk RBAC & RLS | Tidak (harus parse token) | Ya (join langsung di policy RLS) |
| Konsistensi dengan RLS | RLS tetap harus lookup tabel | Satu sumber kebenaran untuk app + RLS |
| Kompleksitas | Rendah tapi rapuh | Sedang; mitigasi: cache 60 detik + invalidasi |

Alasan tambahan: prd04 §5.P menetapkan satu metode login dan satu sekolah — tabel `UserRole` adalah satu-satunya otoritas; perubahan role instan; tanpa kebutuhan `active_school`. Risiko: lookup per request; mitigasi dengan cache Redis/in-memory TTL 60 s dan index `(user_id, status)`.

### 6.2 Alur Lengkap (Email/Username + Password, In-house)

```
1. User isi "Email atau Username" + password (web) → POST /api/v1/auth/login
   → AuthModule: cari User (email/username) → verify password Argon2id
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
- **Undangan & reset password**: OPERATOR/WAKEPSEK/KEPSEK/SUPERADMIN kirim undangan (in-app) dengan role tetap; `UserRole.status = INVITED` → user accept → `ACTIVE`. Reset password oleh OPERATOR/SUPERADMIN (in-app, password sementara sekali pakai) — **tanpa email/SMS** (prd04 §5.P).

### 6.3 Diagram Alur Auth

```
┌─────────┐  POST /auth/login        ┌──────────────────┐
│ Browser │─────────────────────────►│ AuthModule       │
│ (web)   │  { emailOrUsername,      │ (NestJS)         │
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

| Arah | Event | Payload inti | Pemicu |
|------|-------|--------------|--------|
| server → client | `notification:new` | `{ id, type, title, body, data }` | Semua notifikasi (modul Notification) |
| server → client | `assignment:new` / `assignment:graded` | `{ assignmentId, classId, ... }` | Guru publish tugas / grade submission |
| server → client | `exam:start` | `{ examSessionId, startAt, durationMin }` | Sesi ujian dibuka |
| server → client | `exam:time-warning` | `{ minutesLeft }` | 10/5/1 menit tersisa |
| server → client | `exam:autosave-ok` | `{ answerLogId, savedAt }` | Acknowledge autosave |
| server → client | `exam:force-submit` | `{ attemptId }` | Waktu habis (server-side autosubmit) |
| server → client | `attendance:alpa` | `{ studentId, date }` | Sesi ditutup tanpa kehadiran (notifikasi homeroom) |
| server → client | `attendance:session-closed` | `{ sessionId }` | QR expire / sesi ditutup |
| server → client | `invoice:due` | `{ invoiceId, studentId }` | Tagihan mendekati jatuh tempo |
| server → client | `payment:confirmed` | `{ paymentId }` | Pembayaran diverifikasi KEUANGAN |
| server → client | `announcement:new`, `letter:status`, `library:due`, `discipline:recorded`, `ppdb:status` | sesuai konteks | Modul masing-masing |
| client → server | `exam:answer:save` | `{ attemptId, answer, idempotencyKey }` | Autosave (juga via REST fallback) |

Semua event ujian bersifat **best-effort**; sumber kebenaran tetap REST API (autosave via REST dengan `Idempotency-Key`; Socket hanya ack cepat). Reconnect: client re-join room otomatis; event yang terlewat diambil ulang via REST (mis. `GET /exam/attempts/:id`).

---

## 8. Storage (Self-Managed Object Storage)

### 8.1 Bucket per Jenis Dokumen

| Bucket | Isi | Policy akses (RBAC scope) |
|--------|-----|---------------------------|
| `materials` | Materi (PDF, video, gambar) | Guru mapel + siswa kelas |
| `submissions` | File tugas siswa | Guru mapel + pemilik |
| `ppdb-documents` | KK, akta, rapor (PII) | OPERATOR + pendaftar pemilik (pre-enroll) |
| `payment-proofs` | Bukti transfer | KEUANGAN + pemilik |
| `permits` | Surat izin/sakit | homeroom + GURU_BK + pemilik |
| `counseling-attachments` | Lampiran BK | GURU_BK/WAKEPSEK/KEPSEK |
| `official-letters` | Surat resmi | OPERATOR + approver |
| `exports` | Rekap nilai, ekspor Dapodik | homeroom/OPERATOR/SUPERADMIN |
| `avatars` | Foto profil | Public-read (bukan PII sensitif) |

### 8.2 Alur Upload (hindari proxy file besar)

```
Client (web) → POST /api/v1/storage/signed-url  { bucket, contentType, size }
   → NestJS: validasi RBAC + jenis bucket + quota → minta signed URL dari MinIO/S3
   → response { uploadUrl, publicUrl?, objectPath }
Client → PUT uploadUrl (langsung ke MinIO/S3, tidak lewat NestJS)
Client → POST /api/v1/{modul}/confirm  { objectPath } → simpan path di DB
```

### 8.3 Contoh Policy (deskriptif)

```sql
-- RLS opsional (defense-in-depth RBAC) berbasis role/scope — tanpa school_id
CREATE POLICY "materials_read_owner_class"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materials'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = current_setting('app.user_id')::uuid
        AND ur.status = 'ACTIVE'
        AND (ur.role IN ('GURU','OPERATOR','WAKEPSEK','KEPSEK','SUPERADMIN')  -- pengajar/admin
             OR (ur.role = 'SISWA' AND <siswa di kelas pemilik materi>))
    )
  );
```
Konvensi path: `{module}/{entity_id}/{file}` (tanpa school_id) agar policy RLS bisa diuji dari path. Enkripsi at-rest: **SSE (server-side encryption)** bawaan MinIO/S3; data PII (PPDB, BK) tidak pernah masuk bucket publik.

---

## 9. Integrasi Eksternal

### 9.1 Live Class

| Opsi | Kapan dipakai | Kebutuhan |
|------|---------------|-----------|
| **DITUNDA** | Tanpa Jitsi/Zoom/Meet (prd04 §5.O) | Bila dibangun: **WebRTC self-hosted** (SFU + TURN/STUN), tanpa API fitur pihak ketiga |
| Link manual (MVP) | MVP: tautan manual | Field `live_class_url` di entitas kelas/jadwal; tombol "Buka Link" |

### 9.2 Lainnya
- **Dapodik/ANBK (G4)**: ekspor file Excel/CSV terformat (bukan API langsung — akses resmi terbatas, prd03 §4.4); struktur data siswa/rombel disiapkan kompatibel.
- **Payment gateway**: **opsional, flag OFF default** (`FINANCE_GATEWAY`, prd04 §5.F.7); manual-first + rekonsiliasi file CSV.
- **Import migrasi (G9)**: template Excel (siswa, guru, kelas) → `ImportBatch`/`ImportError` + validasi & preview.

---

## 10. Offline-First / PWA (G10)

### 10.1 Arsitektur

Keputusan scope: **MVP = queue absensi QR + cache materi dasar** (dibangun di M-ABSQR-T8 & F2-T5); **PWA penuh/luas ditunda** sampai ada bukti kebutuhan sekolah pilot (prd03 G10). Arsitektur di bawah disiapkan modular agar tinggal diaktifkan saat PWA penuh diizinkan.

```
Web (Next.js + next-pwa/Workbox)
├── Service Worker
│   ├── Precache: shell aplikasi (JS/CSS)
│   ├── Runtime cache: materi (stale-while-revalidate), gambar (cache-first + data-saver)
│   └── Background Sync: kirim antrean saat online kembali
├── IndexedDB
│   ├── queue.absensi  → { sessionId, studentId, scannedAt, idempotencyKey }
│   ├── queue.autosave → { attemptId, answerId, payload, idempotencyKey }
│   └── cache.materi   → materi yang sudah dibuka
└── TanStack Query (stale data + refetch saat online)
```

### 10.2 Alur Kritis

**Absensi QR offline** (prd02 §3.3 + prd03 G10):
1. Siswa scan QR saat offline → simpan ke `queue.absensi` (token QR + idempotencyKey di-generate client).
2. Online → background sync kirim `POST /api/v1/attendance/records/scan` dengan key yang sama.
3. Server validasi (token sekali pakai + waktu) → sukses/tolak; duplikat key → `200` idempotent (tidak dobel absen).

**Autosave ujian offline**: jawaban ditulis ke IndexedDB setiap 15 detik + pada `visibilitychange`/beforeunload; flush ke `POST /api/v1/exam/attempts/:id/answers` (idempotent); waktu habis tetap diputus **server-side** (`exam:force-submit`).

**Data-saver (G16, digabung G10)**: kompresi otomatis gambar/dokumen di sisi server sebelum disimpan (prd03 §6); mode hemat data mengirim header `Save-Data` → Next.js image optimizer mengirim versi lebih kecil.

---

## 11. Observability (G7)

| Lapisan | Tool | Detail |
|---------|------|--------|
| Structured logging | pino + pino-http | JSON log; request ID (header `X-Request-Id`, dihasilkan per transaksi, di-echo ke response); konteks request (`userId`, `module`); **tidak pernah log token/password/PII** |
| Error tracking | Sentry (web + api) — opsional non-dependensi | Source map; tag `userId`/`module`; alert error baru; grouping per modul |
| Metrik | Prometheus + Grafana | HTTP request count/latency (histogram), error rate, active Socket.IO connections, queue depth, DB pool; dashboard **SUPERADMIN (admin sistem sekolah)** |
| Alerting | Grafana Alerting | **Khusus jam ujian**: error rate > 1% dalam 5 menit, p95 latency > 3 s, autosave failure rate > 5% → alert on-call; alert umum: error 5xx spike, disk usage, backup gagal |
| Audit | AuditLog | Perubahan data sensitif (nilai, absensi, BK, pembayaran, data siswa) — actor, entity, before/after, timestamp |

---

## 12. Backup & Disaster Recovery (G8)

| Aspek | Target | Implementasi |
|-------|--------|--------------|
| RPO | ≤ 24 jam (target operasional 15 menit) | Backup harian full + WAL archiving (PITR) — pakai kemampuan **managed PostgreSQL (RDS/Neon)** atau `pg_basebackup` + WAL untuk self-managed |
| RTO | ≤ 4 jam | Runbook restore terdokumentasi + restore drill bulanan; komponen stateless (web/api) redeploy otomatis dari image; hanya DB + Storage yang perlu restore |
| Off-region | Backup disimpan di region terpisah | Snapshot DB direplikasi lintas region; **storage MinIO/S3** backup via periodic export ke bucket terpisah |
| Cakupan | DB + Storage + env/secrets | Semua bucket (materi, submission, PPDB) masuk cakupan; secrets di Vault (bukan di backup) |
| Verifikasi | Restore drill bulanan | Auto-test: restore ke sandbox → jalankan smoke test (login, query data, ekspor) |

---

## 13. Security Hardening (G11)

| Area | Langkah |
|------|---------|
| Rate limiting | `@nestjs/throttler`: login 5 gagal/15 mnt/user; submit ujian 20/mnt/user; scan QR 30/mnt/user; API global 1000/mnt/IP |
| Brute-force lockout | Kolom `failed_login_attempts` (User): 5 gagal → lock 15 mnt |
| CSRF | Cookie session `SameSite=Lax`; mutasi lintas-origin pakai double-submit token; Next.js Server Actions memakai proteksi bawaan |
| CSP | Strict: `default-src 'self'`, script nonce; **connect-src hanya API sendiri + Socket.IO** (tanpa Jitsi/Supabase) |
| Header keamanan | Helmet di NestJS; `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Dependency | `npm audit` di CI (fail on high/critical), Dependabot/Renovate, lockfile terverifikasi |
| Secret | `.env.example` tanpa nilai; secret di env CI/Vault; rotasi rutin; scan secret di repo (gitleaks) |
| RLS | **Opsional** (defense-in-depth RBAC, tanpa session var tenant); test **isolasi scope RBAC (SENDIRI/KELAS/SEKOLAH)** di integration test |
| Privacy (G14) | AuditLog untuk perubahan data sensitif; field-level access untuk `CounselingNote` (hanya role **GURU_BK/WAKEPSEK/KEPSEK**) |

---

## 14. Strategi Testing (G6) & CI

| Lapisan | Framework | Cakupan |
|---------|-----------|---------|
| Unit | Jest | Logika penilaian (auto-grade PG, isian), RBAC guard (matrix role×aksi), late submission, perhitungan tagihan, validasi token QR |
| Integration | Jest + Supertest + testcontainers PostgreSQL | Alur ujian E2E (paket → sesi → attempt → autosave → autosubmit → grade), alur QR absensi (generate → scan → sekali pakai), **isolasi scope RBAC (SENDIRI/KELAS/SEKOLAH)**, RLS opsional |
| E2E | Playwright | Setup awal sekolah (G19), **login Email/Username + Password (bukan Google mock)**, guru buat tugas → siswa submit → guru nilai, homeroom lihat rapor |
| Load | k6 | Ujian online: ratusan siswa submit dalam 5 menit terakhir; target p95 < 3 s; identifikasi bottleneck autosave |

**CI (GitHub Actions)**: `lint → typecheck → unit → integration (service postgres) → build → npm audit` pada tiap PR; E2E pada merge ke main; load test terjadwal sebelum ujian sungguhan (prd02 §7).

---

## 15. Diagram Arsitektur Sistem

```
                        ┌──────────────────────────────────────────────┐
                        │                 apps/web (Next.js)           │
                        │  Route groups: (siswa)(guru)(admin)(ortu)    │
                        │  (superadmin)/admin-sistem                   │
                        │  Server Components + Client Components       │
                        │  TanStack Query · Zustand · PWA/Workbox      │
                        │  IndexedDB offline queue · Socket.IO client  │
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
        │ PostgreSQL │ │ Redis      │ │ Object      │ │ Live class     │
        │ skema      │ │ cache/rate │ │ storage     │ │ DITUNDA        │
        │ tunggal,   │ │ lock/socket│ │ (MinIO/S3)  │ │ (WebRTC self-  │
        │ RLS ops.   │ │ adapter    │ │ signed URL  │ │  hosted bila   │
        │ 61 tables  │ │            │ │             │ │  dibangun)     │
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

Loop autosave (Client Component + IndexedDB)
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
**Keputusan:** auth in-house — Email/Username + Password (Argon2id), JWT httpOnly cookie, refresh rotation. **Tanpa ketergantungan pihak ketiga** (prd04 §5.O, §5.P).
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
- Skema lengkap **61 entitas single-school (56 + FeatureFlag, AppFeatureSetting, AcademicYear, RolloverRun, Alumni)** + enum + RLS opsional: `03-database-erd.md`.
- Kontrak endpoint, RBAC matrix, contoh payload: `04-api-contract.md`.
- Urutan implementasi, task breakdown, risk register: `05-implementation-plan.md`.
- Keputusan single-school & no-third-party: prd04 v4.2 §16.3(g) [owner-v4.2].
