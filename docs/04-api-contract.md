# REST API Contract — opensis Super-App (Single-School)

**Versi:** 1.2
**Tanggal:** 8 Agustus 2026
**Status:** Final desain single-school (konsisten dengan `02-technical-architecture.md` & `03-database-erd.md`; prd04 v4.2 [owner-v4.2] §16.3(g))
**Base URL:** `https://api.opensis.example/api/v1`

> **Catatan versi 1.2 (2026-08-08):** rebranding referensi operasional `openlms` → `opensis`
> (base URL, contoh invite link); enum `Role` diperbarui menjadi **14 role** (`GURU_BK` → `BK`,
> tambah `KAPRODI` & `AUDITOR`); matriks RBAC §4 menambahkan kolom KAPRODI & AUDITOR
> (nilai diturunkan dari `packages/database/prisma/seed-data/permissions.ts`).
>
> **Catatan versi 1.1:** single-school — tanpa multi-sekolah, tanpa header pemilih sekolah, tanpa school switcher; RBAC scope SENDIRI/KELAS/SEKOLAH; SUPERADMIN = admin sistem sekolah; fitur OFF ditolak API dengan `FEATURE_DISABLED`.

---

## 1. Konvensi Umum

### 1.1 Autentikasi

- Header: `Authorization: Bearer <JWT in-house>` (diambil dari httpOnly cookie) untuk semua endpoint kecuali `@Public` (login/PPDB register).
- JWT hanya identitas; role & scope di-resolve server-side dari `UserRole` (lihat 02-technical-architecture §6).
- **Single-school:** seluruh user terdaftar di SATU sekolah; tanpa header pemilih sekolah, tanpa konteks sekolah aktif (prd04 §16.3(g) [owner-v4.2]).

### 1.2 Versi & Prefix

- Semua endpoint di bawah prefix `/api/v1` (di-set global di NestJS `main.ts`).

### 1.3 Pagination

- Query: `?limit=20&offset=0` (default `limit=20`, maks 100).
- Response menyertakan `meta: { total, limit, offset }`.

### 1.4 Filter & Sorting

- Filter: `?filter[status]=SUBMITTED&filter[class_id]=cls_1` (kombinasi AND).
- Range: `?filter[due_at][gte]=2026-08-01T00:00:00Z`.
- Sorting: `?sort=-created_at` (minus = DESC).

### 1.5 Timestamp

- ISO 8601 UTC: `2026-08-06T07:30:00.000Z`; client menampilkan via timezone sekolah (`school_profile.timezone`).

### 1.6 Format Error Standar

```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | FEATURE_DISABLED | ARCHIVED_YEAR | NOT_FOUND | CONFLICT | RATE_LIMITED | INTERNAL",
    "message": "Pesan singkat untuk user",
    "details": [{ "field": "due_at", "reason": "harus tanggal valid" }],
    "requestId": "req_01H..."
  }
}
```

- HTTP status: 400 (validasi), 401 (token), **403 (RBAC / feature flag OFF → `FEATURE_DISABLED` / tahun ajaran lama read-only → `ARCHIVED_YEAR`)**, 404, 409 (konflik/duplikat), 429 (rate limit), 500.
- `ARCHIVED_YEAR` (403): tahun ajaran lama read-only (rollover §5.R prd04).

### 1.7 Idempotensi

- Header `Idempotency-Key: <uuid>` WAJIB untuk: autosave ujian, scan QR absensi, pembayaran, create submission.
- Duplikat key → respons sukses yang sama (tanpa efek ganda); key disimpan 24 jam.

### 1.8 RBAC Role (nilai enum, konsisten ERD)

`SISWA, GURU, BK, KAPRODI, KEUANGAN, OPERATOR, WAKEPSEK, KEPSEK, AUDITOR, SUPERADMIN, CALON_SISWA, WALI_MURID, PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL`

> Perubahan 2026-08-08: `GURU_BK` → `BK`; tambah `KAPRODI` (Kepala Program Keahlian SMK)
> dan `AUDITOR` (tim audit sekolah, read-only luas). Sumber: `packages/database/prisma/schema.prisma:29-44`.

---

## 2. Endpoint per Modul

> Kolom Role memakai singkatan: S=SISWA, G=GURU, BK=BK, KP=KAPRODI, OPR=OPERATOR, K=KEUANGAN, WPS=WAKEPSEK, KPS=KEPSEK, AUD=AUDITOR, SA=SUPERADMIN, CS=CALON_SISWA, WM=WALI_MURID, PI=PEMBIMBING_INDUSTRI, PE=PENGUJI_EKSTERNAL. `*` = semua role aktif. `P` = public (no auth). **homeroom (wali kelas) bukan role** — scope override untuk role GURU via `Class.homeroom_teacher_id` (prd04 §3.1).

### 2.1 Auth & Pengaturan Aplikasi

| Method | Path                               | Deskripsi                                                           | Role                   |
| ------ | ---------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| GET    | `/auth/me`                         | Profil + role aktif                                                 | *                      |
| POST   | `/auth/login`                      | Login (Public): Email/Username + Password → set JWT httpOnly cookie | P                      |
| POST   | `/auth/logout`                     | Logout (revoke refresh token in-house)                              | *                      |
| GET    | `/auth/invitations`                | Daftar undangan masuk                                               | *                      |
| POST   | `/auth/invitations/:id/accept`     | Terima undangan → UserRole ACTIVE                                   | *                      |
| POST   | `/auth/password/reset`             | Reset password (in-app, tanpa email/SMS)                            | OPR, SA                |
| GET    | `/app/settings`                    | Pengaturan aplikasi (profil sekolah, tahun ajaran, ambang alpa)     | OPR, WPS, KPS, SA      |
| PATCH  | `/app/settings`                    | Update pengaturan aplikasi                                          | SA, OPR                |
| GET    | `/app/feature-flags`               | Daftar saklar fitur (FeatureFlag/AppFeatureSetting)                 | SA                     |
| PATCH  | `/app/feature-flags/:key`          | Ubah on/off/lock fitur (AuditLog)                                   | SA                     |
| POST   | `/app/import`                      | Mulai impor data (Excel) → ImportBatch                              | OPR, SA                |
| GET    | `/app/import/:batchId`             | Status impor + ringkasan error                                      | OPR, SA                |
| POST   | `/app/invitations`                 | Kirim undangan guru/siswa (in-app; tanpa email/SMS)                 | OPR, WPS, KPS, SA      |
| POST   | `/app/rollover`                    | Jalankan rollover tahun ajaran (preview → run → rollback)           | KPS, SA                |
| POST   | `/app/rollover/drafts`             | Buat draft rollover + hasil preview (dry-run, tanpa tulis)          | KPS, SA; OPR (preview) |
| POST   | `/app/rollover/drafts/:id/execute` | Eksekusi draft → RolloverRun RUNNING (idempoten)                    | KPS, SA                |
| POST   | `/app/rollover/runs/:id/rollback`  | Rollback dalam window 7 hari → ROLLED_BACK                          | KPS, SA                |
| GET    | `/app/rollover/history`            | Riwayat run rollover (RolloverRun + status)                         | OPR, WPS, KPS, SA      |

**Contoh create invitation (POST /app/invitations):**

```json
// REQ
{ "username": "guru.2026", "role": "GURU", "classIds": ["cls_1"] }
// RES 201
{ "id": "usr_01H...", "status": "INVITED", "inviteLink": "https://app.opensis.id/invite/tok_..." }
```

**Contoh ubah feature flag (PATCH /app/feature-flags/LMS_EXAM):**

```json
// REQ
{ "enabled": true, "locked": false }
// RES 200
{ "key": "LMS_EXAM", "enabled": true, "auditLogged": "aud_01H..." }
```

### 2.2 LMS (Kelas, Materi, Tugas, Submission, Nilai)

| Method | Path                           | Deskripsi                                           | Role                                   |
| ------ | ------------------------------ | --------------------------------------------------- | -------------------------------------- |
| GET    | `/classes`                     | Daftar kelas (filter grade_level, academic_year_id) | *, SA                                  |
| POST   | `/classes`                     | Buat kelas                                          | OPR, WPS, KPS, SA                      |
| GET    | `/classes/:id`                 | Detail kelas + homeroom                             | *                                      |
| PATCH  | `/classes/:id`                 | Update (homeroom, nama)                             | OPR, WPS, SA                           |
| POST   | `/classes/:id/enroll`          | Tambah siswa (bulk)                                 | OPR, WPS, SA                           |
| POST   | `/classes/:id/unenroll`        | Keluarkan siswa                                     | OPR, WPS, SA                           |
| GET    | `/classes/:id/students`        | Daftar siswa                                        | G, OPR, WPS, KPS, SA, WM(anak)         |
| GET    | `/subjects`                    | Daftar mapel                                        | *                                      |
| POST   | `/subjects`                    | Buat mapel                                          | OPR, WPS, SA                           |
| POST   | `/class-subjects`              | Assign guru ke mapel-kelas                          | OPR, WPS, SA                           |
| GET    | `/class-subjects`              | Daftar kelas-mapel (filter teacher_id)              | *                                      |
| GET    | `/materials`                   | Daftar materi (filter class_subject_id)             | S, G, OPR, WPS, KPS, SA                |
| POST   | `/materials`                   | Upload materi (signed URL flow)                     | G, SA                                  |
| PATCH  | `/materials/:id/publish`       | Publikasikan                                        | G, SA                                  |
| GET    | `/assignments`                 | Daftar tugas (filter class_subject_id, due_at)      | S, G, OPR, WPS, KPS, SA                |
| POST   | `/assignments`                 | Buat tugas                                          | G, SA                                  |
| PATCH  | `/assignments/:id`             | Update/close tugas                                  | G, SA                                  |
| POST   | `/assignments/:id/submissions` | Submit tugas (idempotent)                           | S                                      |
| GET    | `/assignments/:id/submissions` | Semua submission (untuk dinilai)                    | G, OPR, WPS, KPS, SA                   |
| PATCH  | `/submissions/:id/grade`       | Nilai + feedback                                    | G, SA                                  |
| GET    | `/grades`                      | Rekap nilai (filter student_id / class_subject_id)  | S(own), G, OPR, WPS, KPS, SA, WM(anak) |

**Contoh create assignment (POST /assignments):**

```json
// REQ
{
  "classSubjectId": "cs_1",
  "title": "Tugas 1: Persamaan Kuadrat",
  "instructions": "Kerjakan soal di buku lalu upload foto.",
  "dueAt": "2026-08-20T23:59:00.000Z",
  "maxScore": 100,
  "allowLate": false
}
// RES 201
{ "id": "asg_1", "status": "DRAFT", "dueAt": "2026-08-20T23:59:00.000Z" }
```

**Contoh submit submission (POST /assignments/:id/submissions):**

```json
// REQ (Idempotency-Key wajib)
{ "content": "Jawaban...", "attachmentUrl": "submissions/asg_1/std_9/file.pdf" }
// RES 201
{ "id": "sub_1", "status": "SUBMITTED", "submittedAt": "2026-08-19T10:12:00.000Z", "isLate": false }
```

### 2.3 Kuis

| Method | Path                         | Deskripsi                             | Role                    |
| ------ | ---------------------------- | ------------------------------------- | ----------------------- |
| GET    | `/quizzes`                   | Daftar kuis (filter class_subject_id) | S, G, OPR, WPS, KPS, SA |
| POST   | `/quizzes`                   | Buat kuis + soal                      | G, SA                   |
| POST   | `/questions`                 | Tambah soal bank                      | G, SA                   |
| POST   | `/quizzes/:id/attempts`      | Mulai attempt kuis                    | S                       |
| POST   | `/quiz/attempts/:id/answers` | Simpan jawaban                        | S                       |
| POST   | `/quiz/attempts/:id/submit`  | Submit kuis                           | S                       |
| GET    | `/quiz/attempts/:id`         | Hasil (auto-grade)                    | S(own), G, SA           |

### 2.4 Ujian Online

| Method | Path                                | Deskripsi                                                                                                                                                  | Role                            |
| ------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| POST   | `/exams`                            | Buat ujian (jadwal + paket)                                                                                                                                | G, WPS, OPR, SA                 |
| GET    | `/exams`                            | Daftar ujian                                                                                                                                               | S, G, OPR, WPS, KPS, SA         |
| POST   | `/exams/:id/packages`               | Buat paket soal A/B/C                                                                                                                                      | G, WPS, SA                      |
| POST   | `/exams/:id/sessions`               | Buat sesi (shift, waktu, target kelas)                                                                                                                     | G, WPS, OPR, SA                 |
| POST   | `/exam/sessions/:id/token`          | Generate token sesi 6 karakter (alfanumerik uppercase tanpa 0/O/1/I). Scope: `exam:token:class` (GURU — KELAS), `exam:token:school` (WPS/OPR/SA — SEKOLAH) | G (KELAS), WPS/OPR/SA (SEKOLAH) |
| GET    | `/exam/sessions/:id`                | Detail sesi + jadwal                                                                                                                                       | S, G, OPR, WPS, KPS, SA         |
| POST   | `/exam/sessions/:id/attempts/start` | Mulai attempt (validasi token)                                                                                                                             | S                               |
| POST   | `/exam/attempts/:id/answers`        | Autosave jawaban (idempotent)                                                                                                                              | S                               |
| POST   | `/exam/attempts/:id/submit`         | Submit manual                                                                                                                                              | S                               |
| GET    | `/exam/attempts/:id`                | Detail attempt (soal + status)                                                                                                                             | S(own), G, WPS, SA              |
| GET    | `/exam/attempts/:id/logs`           | Log aktivitas (tab switch, IP)                                                                                                                             | G, WPS, SA                      |
| POST   | `/exam/attempts/:id/grade-esai`     | Nilai esai manual                                                                                                                                          | G, SA                           |
| POST   | `/exams/:id/analyze`                | Analisis butir soal                                                                                                                                        | G, WPS, SA                      |

**Contoh create exam session (POST /exams/:id/sessions):**

```json
// REQ
{
  "name": "Shift 1",
  "startsAt": "2026-09-14T07:30:00.000Z",
  "endsAt": "2026-09-14T09:30:00.000Z",
  "targetClassId": "cls_1",
  "room": "Lab Komputer 1"
}
// RES 201
{ "id": "exs_1", "status": "SCHEDULED", "startsAt": "2026-09-14T07:30:00.000Z" }
```

**Contoh generate token sesi (POST /exam/sessions/:id/token):**

```json
// RES 201
{
  "token": "7X4K2M",
  "length": 6,
  "expiresAt": "2026-09-14T07:30:00.000Z",
  "note": "6 karakter alfanumerik uppercase tanpa 0/O/1/I; sekali pakai per attempt"
}
```

**Contoh start exam attempt (POST /exam/sessions/:id/attempts/start):**

```json
// REQ
{ "token": "7X4K2M", "packageId": "exp_1" }
// RES 201
{
  "attemptId": "eat_1",
  "status": "IN_PROGRESS",
  "remainingSeconds": 7200,
  "questions": [
    { "id": "q_1", "type": "PILIHAN_GANDA", "text": "2x+3=7, x=...?",
      "options": [ { "id": "o1", "text": "1" }, { "id": "o2", "text": "2" } ] }
  ]
}
```

**Contoh autosave answer (POST /exam/attempts/:id/answers) — Idempotency-Key wajib:**

```json
// REQ
{ "answers": [ { "questionId": "q_1", "answer": "o2", "savedAtClient": "2026-09-14T08:00:00.000Z" } ] }
// RES 200
{ "saved": true, "savedAt": "2026-09-14T08:00:05.000Z", "duplicate": false }
```

### 2.5 Absensi (QR, Geofencing, Izin/Sakit)

| Method | Path                             | Deskripsi                                                                        | Role                                       |
| ------ | -------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| POST   | `/attendance/sessions`           | Buat sesi absensi (QR/geofencing)                                                | G, OPR, WPS, SA                            |
| GET    | `/attendance/sessions/:id/qr`    | Generate QR (token sekali pakai, expire 5–10 mnt)                                | G, OPR, SA                                 |
| POST   | `/attendance/records/scan`       | Scan QR (idempotent; device siswa)                                               | S                                          |
| POST   | `/attendance/records/checkin`    | Check-in geofencing (lat, lng)                                                   | S                                          |
| POST   | `/attendance/records`            | Input manual (fallback)                                                          | G, OPR, SA                                 |
| GET    | `/attendance/records`            | Rekap (filter student_id, date range)                                            | S(own), G, BK, OPR, WPS, KPS, SA, WM(anak) |
| POST   | `/attendance/permits`            | Ajukan izin/sakit + upload surat (scope: diri sendiri; homeroom/wali untuk anak) | S, G, WM                                   |
| PATCH  | `/attendance/permits/:id`        | Verifikasi izin                                                                  | G(homeroom), BK, OPR, WPS, KPS, SA         |
| GET    | `/attendance/summary/:studentId` | Persentase kehadiran per mapel/semester                                          | G(homeroom), BK, OPR, WPS, KPS, SA, WM     |

**Contoh generate QR (GET /attendance/sessions/:id/qr):**

```json
// RES 200
{
  "sessionId": "ats_1",
  "qrToken": "AT-8H3F2A", // ditampilkan sebagai QR payload
  "expiresAt": "2026-09-02T07:15:00.000Z",
  "qrImageUrl": "https://.../qr/ats_1.png"
}
```

**Contoh scan QR (POST /attendance/records/scan) — Idempotency-Key wajib:**

```json
// REQ
{ "sessionId": "ats_1", "token": "AT-8H3F2A" }
// RES 200
{ "status": "HADIR", "recordedAt": "2026-09-02T07:12:03.000Z", "duplicate": false }
// RES 409 bila token sudah dipakai/expired → { "code": "CONFLICT", "message": "Token tidak valid atau sudah digunakan" }
```

### 2.6 Akademik (Jadwal, Rapor)

| Method | Path                        | Deskripsi                              | Role                                             |
| ------ | --------------------------- | -------------------------------------- | ------------------------------------------------ |
| GET    | `/schedules`                | Jadwal (filter class_id / teacher_id)  | *                                                |
| POST   | `/schedules`                | Buat slot jadwal                       | OPR, WPS, SA                                     |
| PATCH  | `/schedules/:id`            | Ubah slot (validasi bentrok)           | OPR, WPS, SA                                     |
| GET    | `/reports/student/:id`      | Rapor siswa (Kurikulum Merdeka)        | S(own), G(homeroom), OPR, WPS, KPS, SA, WM(anak) |
| GET    | `/reports/class/:id`        | Rekap nilai & absensi per kelas        | G(homeroom), OPR, WPS, KPS, SA                   |
| POST   | `/reports/class/:id/export` | Ekspor rapor PDF/Excel → DataExportLog | G(homeroom), OPR, SA                             |

### 2.7 Keuangan

| Method | Path                      | Deskripsi                                  | Role                                   |
| ------ | ------------------------- | ------------------------------------------ | -------------------------------------- |
| GET    | `/invoices`               | Daftar tagihan (filter student_id, status) | S(own), K, OPR, WPS, KPS, SA, WM(anak) |
| POST   | `/invoices`               | Buat tagihan individual                    | K, OPR, SA                             |
| POST   | `/invoices/bulk`          | Tagihan massal (per kelas/angkatan, SPP)   | K, OPR, SA                             |
| PATCH  | `/invoices/:id`           | Update (diskon, jatuh tempo)               | K, OPR, SA                             |
| POST   | `/payments`               | Catat pembayaran + bukti (idempotent)      | K, OPR, SA                             |
| PATCH  | `/payments/:id/verify`    | Verifikasi pembayaran                      | K, OPR, SA                             |
| GET    | `/reports/finance`        | Laporan keuangan (per periode)             | K, OPR, WPS, KPS, SA                   |
| POST   | `/reports/finance/export` | Ekspor laporan                             | K, OPR, SA                             |

**Contoh create invoice (POST /invoices/bulk):**

```json
// REQ
{
  "type": "SPP",
  "period": "2026-09",
  "amount": 250000,
  "dueDate": "2026-09-10T23:59:00.000Z",
  "classIds": ["cls_1", "cls_2"]
}
// RES 201
{ "created": 72, "invoiceIds": ["inv_1", "inv_2", "..."] }
```

### 2.8 PPDB

| Method | Path                             | Deskripsi                                                                             | Role                       |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------- | -------------------------- |
| POST   | `/ppdb/register`                 | Formulir publik (tanpa login) + consent (G13); identitas sekolah dari `SchoolProfile` | P                          |
| POST   | `/ppdb/applicants/:id/documents` | Upload dokumen (signed URL)                                                           | CS (via token aplikasi)    |
| GET    | `/ppdb/applicants`               | Panel pendaftar (filter status)                                                       | OPR, WPS, KPS, SA          |
| GET    | `/ppdb/applicants/:id`           | Detail + dokumen                                                                      | OPR, WPS, KPS, SA, CS(own) |
| PATCH  | `/ppdb/applicants/:id/verify`    | Verifikasi dokumen                                                                    | OPR, SA                    |
| POST   | `/ppdb/applicants/:id/select`    | Tentukan hasil seleksi                                                                | OPR, WPS, KPS, SA          |
| POST   | `/ppdb/applicants/:id/enroll`    | Ubah jadi siswa aktif (buat User + Enrollment)                                        | OPR, SA                    |

**Contoh register PPDB (POST /ppdb/register) — Public:**

```json
// REQ
{
  "fullName": "Budi Santoso", "nisn": "0081234567",
  "birthDate": "2011-04-12", "birthPlace": "Jakarta",
  "gender": "L", "originSchool": "SMPN 1 Jakarta",
  "phone": "0812...", "email": "ortu@example.com",
  "parentName": "Siti Aminah", "parentPhone": "0813...",
  "consent": { "type": "DATA_CHILD", "granted": true, "parentName": "Siti Aminah" }
}
// RES 201
{ "registrationNo": "PPDB-2026-0001", "status": "SUBMITTED",
  "trackingToken": "tok_rahasia...", "documentsRequired": ["KK", "AKTA", "RAPOR"] }
```

### 2.9 Notifikasi

| Method | Path                          | Deskripsi                                                                                                                                | Role |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| GET    | `/notifications`              | Inbox (pagination)                                                                                                                       | *    |
| GET    | `/notifications/unread-count` | Jumlah belum dibaca                                                                                                                      | *    |
| POST   | `/notifications/:id/read`     | Tandai dibaca                                                                                                                            | *    |
| POST   | `/notifications/read-all`     | Tandai semua dibaca                                                                                                                      | *    |
| —      | Socket.IO                     | Event push: `notification:new`, `assignment:new`, `exam:start`, `attendance:alpa`, dst. (daftar lengkap: 02-technical-architecture §7.2) | —    |

### 2.10 Modul Fase 2/3 (utama)

| Method   | Path                                                     | Deskripsi                                          | Role                                                 |
| -------- | -------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| GET/POST | `/counseling/notes`                                      | Catatan BK (field-level: hanya BK/WAKEPSEK/KEPSEK) | BK, WPS, KPS, SA, AUD (baca)                         |
| GET/POST | `/discipline/points`                                     | Katalog poin pelanggaran                           | OPR, WPS, SA                                         |
| POST     | `/discipline/records`                                    | Catat pelanggaran siswa                            | G, G(homeroom), BK, OPR, WPS, KPS, SA (KP/AUD: baca) |
| GET/POST | `/extracurriculars` (+ `/enrollments`)                   | Ekskul & pendaftaran                               | S, G, BK, OPR, WPS, KPS, SA (KP/AUD: baca)           |
| GET/POST | `/achievements`                                          | Prestasi siswa                                     | G, OPR, SA                                           |
| GET/POST | `/staff`                                                 | Data induk staf                                    | OPR, WPS, KPS, SA                                    |
| GET/POST | `/staff-attendance`                                      | Absensi staf                                       | OPR, SA                                              |
| GET/POST | `/assets` (+ `/bookings`)                                | Inventaris & peminjaman                            | OPR, WPS, SA (booking: * )                           |
| GET/POST | `/library/books` (+ `/loans`)                            | Katalog & peminjaman                               | S, G, BK, OPR, WPS, KPS, SA, KP, AUD (baca)          |
| GET/POST | `/announcements`                                         | Pengumuman sekolah                                 | * (buat: OPR, WPS, KPS, SA)                          |
| GET/POST | `/letters` (+ `/approve`)                                | Surat resmi & approval                             | S, G, BK, OPR, K, WPS, KPS, SA, AUD (baca)           |
| GET      | `/parent/students`                                       | Anak terhubung (portal wali murid)                 | WM                                                   |
| GET      | `/parent/students/:id/grades` , `/absences`, `/invoices` | Pantauan read-only anak                            | WM                                                   |
| GET/POST | `/internships` (+ `/journals`)                           | PKL & jurnal harian                                | S, PI, G(mentor), KP, WPS, SA                        |
| GET/POST | `/internship-partners` (+ `/mentors`)                    | Mitra DUDI & pembimbing industri                   | WPS, SA                                              |
| GET/POST | `/competency-tests` (+ rubric)                           | UKK & penilaian rubrik                             | PE, G, KP, WPS, SA                                   |
| POST     | `/exports/dapodik`                                       | Buat ekspor Dapodik (file) → DataExportLog         | OPR, WPS, KPS, SA                                    |
| GET      | `/exports/:id/download`                                  | Unduh hasil ekspor                                 | OPR, WPS, KPS, SA                                    |
| GET      | `/audit-logs`                                            | Riwayat audit (filter entity)                      | AUD, WPS, KPS, SA                                    |
| POST     | `/retention/run`                                         | Jalankan job retensi manual (G12)                  | SA                                                   |

---

## 3. Contoh Alur Kritis (Ringkas)

1. **Guru buat tugas** → `POST /assignments` (2.2) → Socket `assignment:new` ke room kelas.
2. **Siswa submit** → `POST /assignments/:id/submissions` + Idempotency-Key → status `SUBMITTED`/`LATE`.
3. **Guru nilai** → `PATCH /submissions/:id/grade` → tulis `Grade` + `AuditLog` → `assignment:graded`.
4. **Ujian** → `POST /exam/sessions/:id/token` (pengawas; scope KELAS/SEKOLAH) → `POST /exam/sessions/:id/attempts/start` (siswa, token) → autosave loop `POST /exam/attempts/:id/answers` → `POST /exam/attempts/:id/submit` / server autosubmit → grade → `Grade` sumatif.
5. **Absensi QR** → `POST /attendance/sessions` → `GET .../qr` (token) → siswa `POST /attendance/records/scan` (offline → queue → sync idempotent).
6. **Tagihan** → `POST /invoices/bulk` → siswa/wali murid lihat `GET /invoices` → `POST /payments` (bukti) → `PATCH /payments/:id/verify` → `payment:confirmed`.
7. **PPDB** → `POST /ppdb/register` (public, consent) → **OPERATOR verifikasi** → seleksi → `enroll` → akun siswa aktif.
8. **Feature flag OFF** → route diblokir; API → `403 FEATURE_DISABLED` (menu disembunyikan di UI; data tetap tersimpan).
9. **Rollover tahun ajaran** → `POST /app/rollover/drafts` (KPS, SA; OPR preview) → `POST /app/rollover/drafts/:id/execute` → `POST /app/rollover/runs/:id/rollback` (RolloverRun; idempotency key).

---

## 4. RBAC Matrix (Role × Aksi × Modul)

Legenda: ✓ penuh, △ terbatas (milik sendiri / butuh approval / read-only), ✗ dilarang, — tidak relevan.

| Modul / Aksi | SISWA | GURU | WALI_MURID | BK  | OPERATOR | KEUANGAN | WAKEPSEK | KEPSEK | KAPRODI | SUPERADMIN | CALON_SISWA | AUDITOR | PEMB. INDUSTRI | PENGUJI EKST. |
| ------------ | :---: | :--: | :--------: | :-: | :------: | :------: | :------: | :----: | :-----: | :--------: | :---------: | :-----: | :------------: | :-----------: |

> Nilai kolom BK: isi ✗ untuk semua baris kecuali baris berikut — Auth: login/me/logout ✓; Kelas: lihat ✓; Absensi: rekap/summary ✓; Izin/sakit: ajukan △ (diri) dan verifikasi ✓; BK: catatan ✓; Tata tertib: catat poin ✓; Ekskul: kelola △ (pembina); Kepegawaian: data staf △ (diri); Absensi staf △ (diri); Sarpras: booking ✓; Perpustakaan: pinjam ✓; Komunikasi: pengumuman △ (baca); Surat resmi: ajukan/approve △ (ajukan). Nilai kolom GURU bertanda `△ (homeroom)` berarti hanya berlaku bila user adalah wali kelas kelas tersebut (`Class.homeroom_teacher_id`).
>
> **Pembaruan 2026-08-08:** kolom `GURU_BK` → `BK`; kolom baru **KAPRODI** (Kepala Program Keahlian SMK) dan **AUDITOR** (tim audit, read-only) diturunkan dari `packages/database/prisma/seed-data/permissions.ts:512-529` (KAPRODI) dan `:423-448` (AUDITOR). AUDITOR juga dapat membaca riwayat rollover (`rollover:history:read:school`) — tidak mengeksekusi.

| Auth: login/me/logout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (tracking) | ✓ | ✓ | ✓ |
| Pengaturan aplikasi: settings | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Fitur (feature flags): kelola | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Undangan & impor data | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Kelas: lihat | ✓ (kelasnya) | ✓ | △ (anak) | ✓ | ✓ | △ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Kelas: buat/ubah/enroll | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Mapel & jadwal: kelola | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Materi: upload/publish | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | △ | △ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Tugas: buat/tutup | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | △ | △ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Tugas: submit | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Submission: nilai | ✗ | ✓ (mapel) | ✗ | ✗ | ✗ | ✗ | △ | △ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Bank soal & kuis: kelola | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | △ | △ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Kuis: kerjakan | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Ujian: buat/paket/sesi/token | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Ujian: kerjakan | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Ujian: nilai esai/analisis | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | △ (baca) | ✗ | △ (baca) | ✓ | ✗ | ✗ | ✗ | ✗ |
| Ujian: log aktivitas | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Absensi: buat sesi/QR | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | △ | △ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Absensi: scan/check-in | ✓ | ✓ (staff) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (staff) | ✗ |
| Absensi: rekap/summary | △ (diri) | ✓ | △ (anak) | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Izin/sakit: ajukan | △ (diri) | △ (diri/staf) | △ (anak) | △ (diri) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Izin/sakit: verifikasi | ✗ | △ (homeroom) | ✗ | ✓ | ✓ | ✗ | △ | △ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Rapor: lihat | △ (diri) | △ (homeroom) | △ (anak) | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Rapor: ekspor | ✗ | △ (homeroom) | ✗ | ✗ | ✓ | ✗ | △ | △ | △ | ✓ | ✗ | △ | ✗ | ✗ |
| Keuangan: tagihan kelola | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | △ | △ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Keuangan: lihat status | △ (diri) | ✗ | △ (anak) | ✗ | ✓ | ✓ | △ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| PPDB: register (public) | — | — | ✓ (isi utk anak) | — | — | — | — | — | — | — | ✓ | — | — | — |
| PPDB: verifikasi/seleksi/enroll | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| BK: catatan | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | △ (baca) | ✗ | ✗ |
| Tata tertib: catat poin | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Ekskul: kelola | ✗ | ✓ | ✗ | △ (pembina) | ✓ | ✗ | △ | △ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Ekskul: daftar | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Kepegawaian: data staf | ✗ | △ (diri) | ✗ | △ (diri) | ✓ | △ | ✓ | ✓ | △ (baca) | ✓ | ✗ | △ (baca) | ✗ | ✗ |
| Absensi staf | ✗ | △ | ✗ | △ (diri) | ✓ | △ | △ | ✓ | ✗ | ✓ | ✗ | ✗ | △ | ✗ |
| Sarpras: kelola aset | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Sarpras: booking | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Perpustakaan: pinjam | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Komunikasi: pengumuman | △ (baca) | △ | △ (baca) | △ (baca) | ✓ | △ | ✓ | ✓ | △ (baca) | ✓ | ✗ | △ (baca) | △ | △ |
| Surat resmi: ajukan/approve | △ (ajukan) | △ | ✗ | △ (ajukan) | ✓ | △ | ✓ | ✓ | ✗ | ✓ | ✗ | △ (baca) | ✗ | ✗ |
| PKL: jurnal & penilaian | △ (jurnal) | ✓ (mentor) | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ (bimbingan) | ✗ |
| UKK: penilaian rubrik | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Ekspor Dapodik/ANBK | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | △ (baca hasil) | ✗ | ✗ |
| Audit log & retensi | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (lihat) | ✓ (lihat) | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Rollover tahun ajaran: jalankan | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Rollover: preview | ✗ | ✗ | ✗ | ✗ | △ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Rollover: rollback | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Monitoring teknis & statistik adopsi | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |

> Catatan: semua akses "✓/△" tetap dibatasi **scope RBAC (SENDIRI/KELAS/SEKOLAH)**; △ berarti scope milik sendiri/kelasnya/anaknya atau memerlukan approval; **homeroom (wali kelas) = scope override untuk role GURU** via `Class.homeroom_teacher_id`; **SUPERADMIN = admin sistem sekolah** (bukan penyedia SaaS) — seluruh data milik SATU sekolah dan dicatat di `AuditLog`. Nilai KAPRODI/AUDITOR pada matriks ini diturunkan dari seed permission aktual (2026-08-08); untuk kontrak endpoint per modul, lihat `apps/api/src/modules/<modul>/README.<modul>.md`.
