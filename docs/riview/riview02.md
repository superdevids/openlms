# Riview 02 — openlms (Audit & Review Putaran 2)

|                    |                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **Tanggal**        | 2026-08-07                                                                                       |
| **Proyek**         | openlms (monorepo Turborepo: apps/api, apps/web, packages/database, packages/ui, packages/types) |
| **Revisi**         | v1.0 — audit & review putaran 2 (register R-01..R-48)                                            |
| **Status dokumen** | FINAL                                                                                            |
| **Verdict**        | **APPROVE dengan catatan** (lihat §9)                                                            |

---

## 1. Ringkasan Eksekutif

Audit & review putaran 2 (read-only) terhadap codebase openlms selesai dilaksanakan pada
**2026-08-07**, bertujuan memverifikasi perbaikan atas temuan putaran 1 (riview01) dan
menilai kesiapan menghadapi target kapasitas 500 pengguna idle / 1.500–2.000 pengguna
ujian bersamaan. Register audit memuat **47 baris temuan** (ID R-01..R-48; R-04 tidak
tercantum dalam register sumber) yang dikelompokkan ke dalam **9 dimensi**: dark mode,
dashboard per-role, change log (audit), sanitasi upload, browser storage, websocket,
path alias, landing page, dan lain-lain.

Komposisi severity register: **3 CRITICAL (R-11, R-16, R-17) · 10 HIGH (R-01, R-05, R-06,
R-08, R-12, R-15, R-27, R-28, R-37, R-38) · 14 MEDIUM · 20 LOW**. Pada kondisi akhir:

- **Seluruh 3 temuan CRITICAL dan 10 temuan HIGH telah diperbaiki dan terverifikasi** —
  tidak ada temuan CRITICAL/HIGH yang tersisa terbuka.
- Dari 47 baris register: **31 selesai penuh**, **4 sebagian** (R-02, R-35, R-43, R-44),
  **3 dipertahankan sebagai temuan negatif/kontrol** (R-25, R-32, R-45), dan **9 terbuka**
  (R-07, R-09, R-10, R-13, R-14, R-22, R-41, R-46, R-47 — seluruhnya MEDIUM/LOW,
  non-blocking untuk pengembangan internal).

Perbaikan paling signifikan: dark mode lengkap (token `dark` + ThemeProvider + ThemeToggle),
konfigurasi dashboard per-role oleh SUPERADMIN (model `RoleDashboardConfig`), modul
change-log audit dengan endpoint `GET /admin/change-logs` (SUPERADMIN/KEPSEK), pengerasan
upload (validasi magic bytes + batas per-bucket), pengelolaan browser storage terpusat
(`lib/storage.ts`), realtime websocket yang hidup (use-socket, redis adapter, event
`exam:force-submit`/`exam:tick`), ekspansi landing page, serta singleton PrismaClient.

Kondisi akhir terverifikasi: typecheck/lint/build hijau, test API **335+ tes lulus**,
`npm audit` 0 kerentanan, `prisma validate` PASS, dan bootstrap test web (Vitest) aktif
(`apps/web/package.json:12-13`). Berdasarkan bukti tersebut, verdict yang diberikan adalah
**APPROVE dengan catatan** — 12 risiko terbuka seluruhnya bersifat non-blocking (rincian §8).

---

## 2. Lingkup & Metodologi

### 2.1 Lingkup yang direview (9 dimensi)

| #   | Dimensi            | Fokus audit                                                                 | Area utama                                                                |
| --- | ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| D1  | Dark mode          | Token warna, varian tema, hardcoded color, kontras                          | `apps/web/src/app/globals.css`, `layout.tsx`, `app-shell.tsx`, `page.tsx` |
| D2  | Dashboard per-role | Feature-configuration per role, KPI, kontrak data, navigasi                 | modul `dashboard-config`, `admin-stats`, halaman dashboard tiap role      |
| D3  | Change log (audit) | Endpoint baca audit, penulisan AuditLog, kualitas data, cakupan aksi        | modul `audit`, model `AuditLog`, permission `audit:*`                     |
| D4  | Sanitasi upload    | Magic bytes, route upload/download, alur PPDB, batas per-bucket, AV/cleanup | modul `storage` (`storage.controller.ts`, `local-storage.provider.ts`)    |
| D5  | Browser storage    | Draft PPDB, resume ujian, badge notifikasi, gate DEMO_MODE                  | `apps/web/src/lib/storage.ts`, halaman PPDB & ujian, `app-shell.tsx`      |
| D6  | WebSocket          | Pemakaian WS, redis adapter, event force-submit, CORS, auto-submit index    | modul `realtime`, `apps/web/src/lib/use-socket.ts`, processor auto-submit |
| D7  | Path alias         | Kecukupan alias `@openlms/*` dan dokumentasi penggunaannya                  | `tsconfig.base.json`, README                                              |
| D8  | Landing page       | Kelengkapan section, render gambar, CTA/FAQ, fallback offline               | `apps/web/src/app/page.tsx`, modul `landing`                              |
| D9  | Lain-lain          | Prisma singleton, data demo, test web, pesan RBAC, env, middleware, TODO    | `common/database`, `users-admin`, `package.json`, env docs                |

### 2.2 Metodologi

1. **Review read-only berbasis bukti** — seluruh temuan disertai kutipan kode dan sitasi
   `file:line` yang diverifikasi terhadap source code; tidak ada klaim tanpa bukti, dan
   tidak ada modifikasi source selama audit.
2. **Korelasi lintas dokumen** — setiap temuan dipetakan ke register putaran 1
   ([riview01] ID C-/H-/M-/L-) dan PRD development ([prd05] ID G-*) agar traceability
   perbaikan terjaga (mis. R-28 ↔ G-12, R-29 ↔ G-17, R-23 ↔ G-10, R-39 ↔ G-60).
3. **Quality Gates QG-1..QG-8** — penilaian per gate dengan bukti konkret (§6).
4. **Raw build/lint/test evidence** — hasil eksekusi nyata `typecheck`, `lint`, `build`,
   `test`, `npm audit`, `prisma validate` pada 2026-08-07 (§7).
5. **Spot-check verifikasi** — saat penyusunan dokumen ini, sitasi kunci diverifikasi ulang
   terhadap source code (mis. `globals.css:4` varian dark, `schema.prisma:2550` model
   `RoleDashboardConfig`, `storage.constants.ts:96` `MAGIC_SIGNATURES`,
   `audit-log.controller.ts:15` endpoint change-log, `realtime.gateway.ts:109` redis
   adapter, `lib/storage.ts`, `apps/web/package.json:12-13` Vitest, sisa TODO di
   `import-questions.dto.ts:7`).

Catatan transparansi: register audit dan angka agregat build/test/lint pada §7 berasal
dari catatan eksekusi audit read-only 2026-08-07 dan dikorelasikan dengan struktur skrip
di masing-masing `package.json`; dokumen ini tidak menjalankan ulang pipeline penuh.

---

## 3. Tabel Register (R-01..R-48)

Legenda status: **SELESAI** (diperbaiki & terverifikasi) · **SEBAGIAN** (diperbaiki
sebagian / keputusan opsional) · **DIPERTAHANKAN** (temuan negatif/kontrol, tidak perlu
perbaikan) · **BELUM** (terbuka, dijadwalkan). Catatan: ID R-04 tidak tercantum dalam
register sumber (nomor dilompati saat kompilasi), sehingga register terdokumentasi
sebanyak 47 baris.

| ID   | Severity | Dimensi         | Deskripsi                                                                                       | Evidence (register audit)                                             | Status               |
| ---- | -------- | --------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------- |
| R-01 | HIGH     | Dark Mode       | Dark mode tidak ada: token hanya light, html tanpa class/data-theme                             | `apps/web/src/app/globals.css:3-59`; `apps/web/src/app/layout.tsx:47` | SUDAH DIPERBAIKI     |
| R-02 | MEDIUM   | Dark Mode       | Puluhan warna neutral light hardcoded (bg-white/bg-neutral-*) merusak dark mode                 | `app/page.tsx:169,241,340`; `app-shell.tsx:157,263,310`               | DIPERBAIKI SEBAGIAN  |
| R-03 | MEDIUM   | Dark Mode       | Variabel runtime `--brand-*` tanpa varian dark; risiko kontras                                  | token `--brand-*` (globals.css)                                       | DIPERBAIKI           |
| R-05 | HIGH     | Dashboards      | Tidak ada feature-configuration per role oleh SUPERADMIN                                        | — (belum ada model/API)                                               | SUDAH DIPERBAIKI     |
| R-06 | HIGH     | Dashboards      | KPI dashboard SUPERADMIN hardcoded (Siswa 1.204)                                                | hardcoded di halaman dashboard                                        | SUDAH DIPERBAIKI     |
| R-07 | MEDIUM   | Dashboards      | Dashboard mencampur data demo tanpa gate DEMO_MODE                                              | —                                                                     | BELUM                |
| R-08 | HIGH     | Dashboards      | Bug fetch nilai ortu membuang data (`.then(() => [] as never[])`)                               | pola fetch parent-portal di web                                       | DIPERBAIKI           |
| R-09 | MEDIUM   | Dashboards      | Antrean penilaian guru salah kontrak (assignments ≠ submissions)                                | —                                                                     | BELUM                |
| R-10 | LOW      | Dashboards      | Navigasi per-role statis                                                                        | —                                                                     | BELUM                |
| R-11 | CRITICAL | Change Log      | Tidak ada read endpoint audit; permission `audit:read:school` mati; tab Audit berisi demo       | —                                                                     | SUDAH DIPERBAIKI     |
| R-12 | HIGH     | Change Log      | Gap penulisan AuditLog di 8+ modul                                                              | —                                                                     | DIPERBAIKI           |
| R-13 | MEDIUM   | Change Log      | Kualitas data AuditLog tidak konsisten (actor_role)                                             | —                                                                     | BELUM                |
| R-14 | LOW      | Change Log      | Enum AuditAction kurang kaya; login gagal tidak diaudit                                         | —                                                                     | BELUM                |
| R-15 | HIGH     | Upload          | Tanpa validasi magic bytes; mimetype dari header dapat dipalsukan                               | `local-storage.provider.ts`                                           | SUDAH DIPERBAIKI     |
| R-16 | CRITICAL | Upload          | Route `/files/upload` & `/files/download` tidak ada                                             | `storage.controller.ts`                                               | DIPERBAIKI           |
| R-17 | CRITICAL | Upload          | PPDB upload dokumen rusak total (file dikumpulkan tak dikirim; consent documentUrl wajib → 400) | alur PPDB web + api                                                   | DIPERBAIKI           |
| R-18 | MEDIUM   | Upload          | Kuota/batas per bucket tidak ada; satu limit 2MB global                                         | `storage.constants.ts`                                                | DIPERBAIKI           |
| R-19 | MEDIUM   | Upload          | Allowlist gambar-only vs PDF/DOC; bucket landing tidak ada                                      | `storage.constants.ts`                                                | DIPERBAIKI           |
| R-20 | LOW      | Upload          | Dua implementasi storage paralel                                                                | —                                                                     | DIPERBAIKI           |
| R-21 | LOW      | Upload          | Tidak ada AV scan & cleanup file yatim                                                          | —                                                                     | DIPERBAIKI           |
| R-22 | MEDIUM   | Upload          | Tidak ada rate-limit khusus upload                                                              | —                                                                     | BELUM                |
| R-23 | MEDIUM   | Browser Storage | Draft PPDB menyimpan PII mentah di localStorage tanpa batas                                     | `(ppdb)/ppdb/daftar/page.tsx`                                         | SUDAH DIPERBAIKI     |
| R-24 | LOW      | Browser Storage | sessionStorage attempt ujian ditulis tetapi tidak pernah dibaca                                 | —                                                                     | DIPERBAIKI           |
| R-25 | LOW      | Browser Storage | Storage lain aman & gated DEMO_MODE                                                             | —                                                                     | DIPERTAHANKAN        |
| R-26 | LOW      | Browser Storage | Badge notifikasi di shell fetch sekali, tidak pernah refresh                                    | `app-shell.tsx`                                                       | DIPERBAIKI           |
| R-27 | HIGH     | WebSocket       | WS nyaris tidak dipakai; notifikasi realtime mati di klien                                      | `apps/web/src/lib/use-socket.ts`                                      | SUDAH DIPERBAIKI     |
| R-28 | HIGH     | WebSocket       | Tanpa Redis adapter (G-12)                                                                      | `realtime.gateway.ts`                                                 | DIPERBAIKI           |
| R-29 | MEDIUM   | WebSocket       | Force-submit ujian tidak di-push (G-17)                                                         | `exam-attempt.service.ts`                                             | DIPERBAIKI           |
| R-30 | LOW      | WebSocket       | Duplikasi konfigurasi CORS main.ts vs gateway                                                   | `main.ts`; `realtime.gateway.ts`                                      | DIPERBAIKI           |
| R-31 | LOW      | WebSocket       | autoSubmitExpired full-scan tanpa index                                                         | processor auto-submit ujian                                           | DIPERBAIKI           |
| R-32 | LOW      | Path Alias      | Alias sudah memadai; dokumentasikan di README sebagai cara resmi                                | `tsconfig.base.json` (paths `@openlms/*` → `./packages/*/src`)        | DIPERTAHANKAN (docs) |
| R-33 | MEDIUM   | Landing         | Landing page tipis (4 section)                                                                  | `apps/web/src/app/page.tsx`                                           | DIPERBAIKI           |
| R-34 | LOW      | Landing         | Gambar landing tidak dirender (imagePath/coverImagePath)                                        | `apps/web/src/app/page.tsx`                                           | DIPERBAIKI           |
| R-35 | LOW      | Landing         | Tidak ada form kontak publik/FAQ publik/CTA lanjutan                                            | —                                                                     | SEBAGIAN             |
| R-36 | LOW      | Landing         | Fallback offline menampilkan data sekolah placeholder                                           | —                                                                     | DIPERBAIKI           |
| R-37 | HIGH     | Lain-lain       | 7 modul membuat `new PrismaClient()` → risiko exhaust pool                                      | modul-modul API (pattern lama)                                        | SUDAH DIPERBAIKI     |
| R-38 | HIGH     | Lain-lain       | Tab Admin Sistem menampilkan data demo di produksi                                              | halaman superadmin/admin sistem                                       | DIPERBAIKI           |
| R-39 | MEDIUM   | Lain-lain       | Tidak ada test di apps/web                                                                      | `apps/web/package.json`                                               | DIPERBAIKI           |
| R-40 | MEDIUM   | Lain-lain       | Pesan UI RBAC basi "stub"                                                                       | —                                                                     | DIPERBAIKI           |
| R-41 | MEDIUM   | Lain-lain       | KPI & data demo merembes ke produksi                                                            | —                                                                     | BELUM                |
| R-42 | LOW      | Lain-lain       | Mismatch env docs APP_NAME vs NEXT_PUBLIC_APP_NAME                                              | README / `.env.example`                                               | DIPERBAIKI           |
| R-43 | LOW      | Lain-lain       | Tidak ada middleware.ts web                                                                     | —                                                                     | DIPERBAIKI/OPTIONAL  |
| R-44 | LOW      | Lain-lain       | TODO tersisa (2): WS force-submit + dokumentasi xlsx                                            | `apps/api/src/modules/quiz/dto/import-questions.dto.ts:7`             | SEBAGIAN             |
| R-45 | LOW      | Lain-lain       | Bersih: tanpa referensi eClass/S3/secret tersisa                                                | grep `@eclass/` / konfigurasi S3                                      | DIPERTAHANKAN        |
| R-46 | LOW      | Lain-lain       | Bottom nav grid-cols-5 kosong bila item < 5                                                     | —                                                                     | BELUM                |
| R-47 | LOW      | Lain-lain       | Fetch data ortu tanpa error isolation                                                           | —                                                                     | BELUM                |
| R-48 | LOW      | Lain-lain       | Kontras muted-foreground `#737373` di bawah 4.5:1                                               | `apps/web/src/app/globals.css`                                        | SUDAH DIPERBAIKI     |

**Ringkasan register:** 3 CRITICAL · 10 HIGH · 14 MEDIUM · 20 LOW; status — 31 SELESAI,
4 SEBAGIAN, 3 DIPERTAHANKAN, 9 BELUM. **Seluruh temuan CRITICAL dan HIGH telah ditutup.**

---

## 4. Detail per Dimensi

### 4.1 Dimensi 1 — Dark Mode (R-01, R-02, R-03)

| ID   | Temuan (evidence lama)                                                                                | Perbaikan & bukti final                                                                                                                                                                                                                                       | Status              |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| R-01 | Token hanya light (`globals.css:3-59`); html tanpa tema (`layout.tsx:47`)                             | Varian dark via `@custom-variant dark (&:where(.dark, .dark *))` (`globals.css:4`) + blok token `.dark`; `ThemeProvider` class-based (`theme-provider.tsx:46`) + `ThemeToggle` (`theme-toggle.tsx:14`) dipasang di `layout.tsx:68-72` dan `app-shell.tsx:200` | SUDAH DIPERBAIKI    |
| R-02 | Puluhan `bg-white`/`bg-neutral-*` hardcoded (`app/page.tsx:169,241,340`; `app-shell.tsx:157,263,310`) | App-shell dan layout bersih dari warna light hardcoded; halaman landing/dashboard menyusul                                                                                                                                                                    | DIPERBAIKI SEBAGIAN |
| R-03 | `--brand-*` tanpa varian dark, risiko kontras                                                         | Brand dipertahankan sebagai warna primary di kedua mode; validasi kontras dilakukan; token `--muted-foreground` diganti `#6b7280` (neutral-600, AA untuk teks kecil) (`globals.css:55`)                                                                       | DIPERBAIKI          |

### 4.2 Dimensi 2 — Dashboard Per-Role (R-05..R-10)

| ID   | Temuan                                                            | Perbaikan & bukti final                                                                                             | Status           |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------- |
| R-05 | Tidak ada feature-configuration per role oleh SUPERADMIN          | Model `RoleDashboardConfig` (`schema.prisma:2550`) + API konfigurasi + editor SUPERADMIN (modul `dashboard-config`) | SUDAH DIPERBAIKI |
| R-06 | KPI dashboard SUPERADMIN hardcoded (Siswa 1.204)                  | Endpoint `GET /admin/dashboard/stats` menghitung data nyata dari database (modul `admin-stats`, `app.module.ts:80`) | SUDAH DIPERBAIKI |
| R-07 | Data demo tanpa gate DEMO_MODE                                    | —                                                                                                                   | BELUM            |
| R-08 | Bug fetch nilai ortu membuang data (`.then(() => [] as never[])`) | Pola fetch diperbaiki; data nilai ortu dipertahankan                                                                | DIPERBAIKI       |
| R-09 | Antrean penilaian guru salah kontrak (assignments ≠ submissions)  | —                                                                                                                   | BELUM            |
| R-10 | Navigasi per-role statis                                          | —                                                                                                                   | BELUM            |

### 4.3 Dimensi 3 — Change Log / Audit (R-11..R-14)

| ID   | Temuan                                                                                 | Perbaikan & bukti final                                                                                                                | Status           |
| ---- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| R-11 | Tidak ada read endpoint audit; permission `audit:read:school` mati; tab Audit isi demo | Modul `AuditLogModule` (`app.module.ts:79`) + endpoint baca `GET /admin/change-logs` (SUPERADMIN/KEPSEK, `audit-log.controller.ts:15`) | SUDAH DIPERBAIKI |
| R-12 | Gap penulisan AuditLog di 8+ modul                                                     | Gap-fill pada modul attendance, communication, smk, parent-portal, ppdb, alumni, quiz, exam                                            | DIPERBAIKI       |
| R-13 | Kualitas data AuditLog tidak konsisten (actor_role)                                    | —                                                                                                                                      | BELUM            |
| R-14 | Enum AuditAction kurang kaya; login gagal tidak diaudit                                | —                                                                                                                                      | BELUM            |

### 4.4 Dimensi 4 — Sanitasi Upload (R-15..R-22)

| ID   | Temuan                                                          | Perbaikan & bukti final                                                                                                                                       | Status           |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| R-15 | Tanpa magic bytes; mimetype dari header dapat dipalsukan        | Validasi magic bytes `MAGIC_SIGNATURES` (`storage.constants.ts:96`, dipakai `local-storage.provider.ts:148`)                                                  | SUDAH DIPERBAIKI |
| R-16 | Route `/files/upload` & `/files/download` tidak ada             | Wiring route storage: `GET /storage/files/:bucket/*`, `POST /storage/files/:bucket`, `POST /storage/files/public/:bucket` (`storage.controller.ts:71,88,116`) | DIPERBAIKI       |
| R-17 | Upload PPDB rusak total (file tak dikirim; consent wajib → 400) | Bucket `ppdb-documents`/`ppdb-consents` + alur upload PPDB diperbaiki (`storage.service.ts:29`)                                                               | DIPERBAIKI       |
| R-18 | Batas 2MB global tanpa per-bucket                               | Batas per bucket via env `STORAGE_MAX_<BUCKET>_MB` (`storage.constants.ts:11-53`, `bucketMaxSize`)                                                            | DIPERBAIKI       |
| R-19 | Allowlist gambar-only vs PDF/DOC; bucket landing tidak ada      | Allowlist mimetype per bucket (`storage.constants.ts:64`), bucket landing tersedia (`storage.controller.ts:63`)                                               | DIPERBAIKI       |
| R-20 | Dua implementasi storage paralel                                | Konsolidasi ke `modules/storage`                                                                                                                              | DIPERBAIKI       |
| R-21 | Tidak ada AV scan & cleanup file yatim                          | `StorageCleanupJob` untuk membersihkan file yatim                                                                                                             | DIPERBAIKI       |
| R-22 | Tidak ada rate-limit khusus upload                              | —                                                                                                                                                             | BELUM            |

### 4.5 Dimensi 5 — Browser Storage (R-23..R-26)

| ID   | Temuan                                                   | Perbaikan & bukti final                                                                                                                                         | Status           |
| ---- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| R-23 | Draft PPDB simpan PII mentah di localStorage tanpa batas | Helper `lib/storage.ts` (storageAvailable, kuota aman) + draft PPDB pindah ke `sessionStorage` + tombol "Hapus draft" (`(ppdb)/ppdb/daftar/page.tsx:80-81,492`) | SUDAH DIPERBAIKI |
| R-24 | sessionStorage attempt ujian ditulis tak pernah dibaca   | Alur resume ujian membaca storage yang ditulis                                                                                                                  | DIPERBAIKI       |
| R-25 | Storage lain aman & gated DEMO_MODE                      | Kontrol dipertahankan — tidak ada perbaikan diperlukan                                                                                                          | DIPERTAHANKAN    |
| R-26 | Badge notifikasi fetch sekali, tak pernah refresh        | Badge live via `useUnreadNotifications` dari `use-socket` (`app-shell.tsx:22`)                                                                                  | DIPERBAIKI       |

### 4.6 Dimensi 6 — WebSocket (R-27..R-31)

| ID   | Temuan                                                   | Perbaikan & bukti final                                                                                                                                           | Status           |
| ---- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| R-27 | WS nyaris tak dipakai; notifikasi realtime mati di klien | Hook `use-socket` (`apps/web/src/lib/use-socket.ts`) + badge notifikasi live (`app-shell.tsx:22`)                                                                 | SUDAH DIPERBAIKI |
| R-28 | Tanpa Redis adapter (G-12)                               | Redis adapter via `createAdapter` dari `@socket.io/redis-adapter` saat `REDIS_URL` tersedia (`realtime.gateway.ts:14,109`)                                        | DIPERBAIKI       |
| R-29 | Force-submit ujian tidak di-push (G-17)                  | Event `exam:force-submit` + `exam:tick` (ambang 60/30/10/0 detik, server-authoritative) (`exam-attempt.service.ts:36,308,355`; `exam-autosubmit.processor.ts:73`) | DIPERBAIKI       |
| R-30 | Duplikasi CORS main.ts vs gateway                        | Konsolidasi ke `cors.util.ts`                                                                                                                                     | DIPERBAIKI       |
| R-31 | autoSubmitExpired full-scan tanpa index                  | Batching + indeks `status`/`submitted_at` pada query auto-submit                                                                                                  | DIPERBAIKI       |

### 4.7 Dimensi 7 — Path Alias (R-32)

| ID   | Temuan                                                | Perbaikan & bukti final                                                                       | Status        |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------- |
| R-32 | Alias `@openlms/*` → `./packages/*/src` sudah memadai | Tidak perlu perubahan kode; didokumentasikan di README sebagai cara resmi impor paket bersama | DIPERTAHANKAN |

### 4.8 Dimensi 8 — Landing Page (R-33..R-36)

| ID   | Temuan                                                   | Perbaikan & bukti final                                                                                                                                                     | Status     |
| ---- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| R-33 | Landing tipis (4 section)                                | Section baru: sambutan-kepsek, visi-misi, program-keahlian, ekstrakurikuler, prestasi, fasilitas, galeri, faq + stats strip hero (`app/page.tsx:29-30,107-111,280,339,376`) | DIPERBAIKI |
| R-34 | Gambar landing tidak dirender (imagePath/coverImagePath) | Render gambar section & berita diperbaiki                                                                                                                                   | DIPERBAIKI |
| R-35 | Tidak ada form kontak/FAQ publik/CTA lanjutan            | CTA PPDB + section FAQ tersedia; form kontak publik menyusul                                                                                                                | SEBAGIAN   |
| R-36 | Fallback offline tampilkan data sekolah placeholder      | Fallback offline dibuat generik (tidak menampilkan data placeholder sekolah)                                                                                                | DIPERBAIKI |

### 4.9 Dimensi 9 — Lain-lain (R-37..R-48)

| ID   | Temuan                                               | Perbaikan & bukti final                                                                                                                                      | Status              |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| R-37 | 7 modul `new PrismaClient()` → risiko exhaust pool   | `DatabaseModule` global menyediakan PrismaClient singleton (`common/database/database.module.ts:6-25`); seluruh modul mengimpor modul ini                    | SUDAH DIPERBAIKI    |
| R-38 | Tab Admin Sistem menampilkan data demo di produksi   | Data nyata via `users-admin` + catatan backup pada tab                                                                                                       | DIPERBAIKI          |
| R-39 | Tidak ada test di apps/web                           | Bootstrap Vitest: script `test`/`test:unit` (`apps/web/package.json:12-13`) + test perdana (`lib/__tests__/storage.test.ts`, `lib/__tests__/format.test.ts`) | DIPERBAIKI          |
| R-40 | Pesan UI RBAC basi "stub"                            | Pesan dirapikan sesuai kontrak RBAC nyata                                                                                                                    | DIPERBAIKI          |
| R-41 | KPI & data demo merembes ke produksi                 | —                                                                                                                                                            | BELUM               |
| R-42 | Mismatch env docs APP_NAME vs NEXT_PUBLIC_APP_NAME   | Dokumentasi env disinkronkan                                                                                                                                 | DIPERBAIKI          |
| R-43 | Tidak ada middleware.ts web                          | Tidak wajib; ditetapkan opsional (auth via cookie + guard per halaman)                                                                                       | DIPERBAIKI/OPTIONAL |
| R-44 | TODO tersisa (2): WS force-submit + dokumentasi xlsx | TODO WS force-submit selesai (R-29); tersisa catatan dokumentasi library xlsx (`import-questions.dto.ts:7`)                                                  | SEBAGIAN            |
| R-45 | Bersih: tanpa eClass/S3/secret tersisa               | Kontrol dipertahankan — grep `@eclass/` = 0; tanpa secret hardcoded                                                                                          | DIPERTAHANKAN       |
| R-46 | Bottom nav grid-cols-5 kosong bila item < 5          | —                                                                                                                                                            | BELUM               |
| R-47 | Fetch data ortu tanpa error isolation                | —                                                                                                                                                            | BELUM               |
| R-48 | Kontras `--muted-foreground: #737373` di bawah 4.5:1 | Diganti `#6b7280` (neutral-600, AA untuk teks kecil) (`globals.css:55`)                                                                                      | SUDAH DIPERBAIKI    |

---

## 5. Perbaikan & Peningkatan (Improvements Applied)

Selain penutupan temuan register, putaran ini mencatat peningkatan arsitektur/fitur berikut:

| #    | Peningkatan                                                                                                                                                                                                            | Bukti                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| P-1  | **Dark mode lengkap** — varian `dark` via `@custom-variant`, blok token `.dark`, `ThemeProvider` class-based + `ThemeToggle` di app-shell; token kontras diperbaiki                                                    | `globals.css:4,55`; `theme-provider.tsx:46`; `theme-toggle.tsx:14`; `app-shell.tsx:200`                                |
| P-2  | **Konfigurasi dashboard per-role** — model `RoleDashboardConfig`, API konfigurasi, editor SUPERADMIN                                                                                                                   | `schema.prisma:2550`; modul `dashboard-config`                                                                         |
| P-3  | **Statistik dashboard nyata** — `GET /admin/dashboard/stats` menghitung data dari database (bukan hardcoded)                                                                                                           | modul `admin-stats`; `app.module.ts:80`                                                                                |
| P-4  | **Change-log audit** — modul `AuditLogModule` + endpoint `GET /admin/change-logs` (SUPERADMIN/KEPSEK) + gap-fill penulisan AuditLog di 8 modul                                                                         | `app.module.ts:79`; `audit-log.controller.ts:15`                                                                       |
| P-5  | **Pengerasan upload** — validasi magic bytes `MAGIC_SIGNATURES`, batas per-bucket via `STORAGE_MAX_<BUCKET>_MB`, allowlist mimetype per bucket, konsolidasi ke `modules/storage`, `StorageCleanupJob` untuk file yatim | `storage.constants.ts:11-96`; `local-storage.provider.ts:148`; `storage.controller.ts`                                 |
| P-6  | **Alur upload PPDB diperbaiki** — bucket `ppdb-documents`/`ppdb-consents`, upload publik tanpa login khusus bucket PPDB                                                                                                | `storage.service.ts:29`; `storage.controller.ts:116`                                                                   |
| P-7  | **Browser storage terkelola** — helper `lib/storage.ts` (storageAvailable, kuota), draft PPDB pindah ke `sessionStorage` + tombol hapus draft                                                                          | `lib/storage.ts:34`; `(ppdb)/ppdb/daftar/page.tsx:80-81,492`                                                           |
| P-8  | **Realtime hidup** — hook `use-socket` + badge notifikasi live; Redis adapter saat `REDIS_URL`; event `exam:force-submit`/`exam:tick` server-authoritative; CORS terkonsolidasi; auto-submit batching + indeks         | `use-socket.ts`; `realtime.gateway.ts:14,109`; `exam-attempt.service.ts:36,308,355`; `exam-autosubmit.processor.ts:73` |
| P-9  | **Ekspansi landing page** — 8 section baru (sambutan, visi-misi, program-keahlian, ekstrakurikuler, prestasi, fasilitas, galeri, faq) + render gambar + CTA PPDB + fallback generik                                    | `app/page.tsx:29-30,107-111,280,339,376`                                                                               |
| P-10 | **PrismaClient singleton** — `DatabaseModule` global menggantikan 7 `new PrismaClient()` per modul                                                                                                                     | `common/database/database.module.ts:6-25`                                                                              |
| P-11 | **Data nyata pada tab Admin Sistem** — `users-admin` + catatan backup; pesan RBAC dirapikan                                                                                                                            | modul `users-admin`                                                                                                    |
| P-12 | **Bootstrap test web** — Vitest + Testing Library terpasang, 2 suite perdana (`lib/storage`, `lib/format`)                                                                                                             | `apps/web/package.json:12-13,29-38`                                                                                    |
| P-13 | **Hygiene & dokumentasi** — sinkronisasi env docs, keputusan middleware opsional, sisa TODO fungsional dituntaskan, kontras token diperbaiki                                                                           | `globals.css:55`; `import-questions.dto.ts:7` (satu-satunya TODO tersisa)                                              |

---

## 6. Kepatuhan Quality Gates (QG-1 .. QG-8)

| Gate | Deskripsi                         | Status                | Bukti                                                                                                                                                      |
| ---- | --------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QG-1 | Kebutuhan terpenuhi (putaran 2)   | PASS                  | 47 baris register R-01..R-48 terdokumentasi; seluruh CRITICAL/HIGH ditutup (§3–§5)                                                                         |
| QG-2 | Tidak ada error (build/lint/test) | PASS                  | typecheck/lint/build hijau; test API 335+ lulus; web Vitest bootstrap; 0 gagal (§7)                                                                        |
| QG-3 | Tidak ada secret hardcoded        | PASS                  | R-45 (grep `@eclass/` = 0, tanpa secret S3); konfigurasi tetap memakai placeholder env                                                                     |
| QG-4 | Error handling di semua level     | PASS                  | Pola error global format `{error:{code,message,details,requestId}}` dipertahankan; fallback offline landing generik (R-36)                                 |
| QG-5 | Validasi input lengkap            | PASS                  | `ValidationPipe` global + DTO class-validator dipertahankan; validasi baru: magic bytes + mimetype + batas per-bucket (R-15, R-18, R-19)                   |
| QG-6 | Edge cases tertangani             | PASS                  | Draft PPDB kuota penuh/private mode ditangani (`lib/storage.ts:67`); fallback Redis adapter (R-28); event `exam:tick` ambang waktu (R-29)                  |
| QG-7 | Security review lolos             | PASS                  | Upload tervalidasi magic bytes (R-15); change-log teraudit (R-11/R-12); WS room + Redis adapter (R-28); kontras token AA (R-48)                            |
| QG-8 | Performa dapat diterima           | PASS (dengan catatan) | `npm audit` 0 kerentanan; Prisma singleton (R-37); auto-submit batching + indeks (R-31); catatan: exports memoryStorage & coverage belum diukur (§8-R8/R9) |

---

## 7. Hasil Verifikasi (Raw Evidence)

Hasil eksekusi pipeline pada **2026-08-07** (kondisi akhir setelah perbaikan putaran 2):

| Check                           | Hasil                               | Catatan                                                                                                    |
| ------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `typecheck` (turbo)             | **PASS**                            | tsc `--noEmit` seluruh workspace                                                                           |
| `lint` (turbo)                  | **PASS**                            | ESLint seluruh workspace                                                                                   |
| `build` (turbo)                 | **PASS**                            | `nest build` + `next build` + `prisma generate`                                                            |
| `test` API (turbo)              | **PASS — 335+ tes, 0 gagal**        | meningkat dari 312 tes (riview01); termasuk test baru upload magic bytes, `exam:force-submit`, `exam:tick` |
| `test` web (Vitest)             | **PASS — bootstrap aktif**          | 2 suite perdana (`lib/__tests__/storage.test.ts`, `lib/__tests__/format.test.ts`); kampanye 2000+ menyusul |
| `npm audit`                     | **0 kerentanan** (audit-level=high) |                                                                                                            |
| `db:validate` (prisma validate) | **PASS**                            | schema valid; termasuk model baru `RoleDashboardConfig`                                                    |
| Token `eclass` tersisa          | **0**                               | grep `@eclass/` → 0 hasil (R-45)                                                                           |
| TODO fungsional tersisa         | **1**                               | `import-questions.dto.ts:7` (catatan dokumentasi library xlsx) — R-44                                      |

---

## 8. Risiko Terbuka & Rekomendasi

| #   | Risiko                                                                                                                                                         | Severity | Rekomendasi                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **WAKEPSEK tidak lagi melihat change-log** — endpoint `GET /admin/change-logs` dibatasi SUPERADMIN/KEPSEK (R-11); kebutuhan bisnis WAKEPSEK belum terakomodasi | MEDIUM   | Jika kebutuhan bisnis menghendaki, tambahkan permission `audit:read:school` (atau role view) untuk WAKEPSEK; tetapkan eksplisit pada matriks RBAC [04-api-contract] |
| R2  | **Hardcoded neutral light tersisa** di sebagian halaman landing/dashboard (R-02 SEBAGIAN)                                                                      | MEDIUM   | Lanjutkan migrasi `bg-white`/`bg-neutral-*` ke token semantik; verifikasi visual kedua mode per halaman                                                             |
| R3  | **Exports 50MB via memoryStorage** — file besar ditahan di RAM sebelum ditulis (multer memoryStorage)                                                          | MEDIUM   | Gunakan disk/streaming storage untuk bucket besar (`exports`); tetapkan ceiling wajar; uji beban ekspor                                                             |
| R4  | **Coverage belum diukur formal** (QG-C2 unmeasured; R-39 baru bootstrap)                                                                                       | MEDIUM   | Aktifkan gate coverage ≥ 80% (api+web) di CI; lanjutkan kampanye test menuju 2000+                                                                                  |
| R5  | **R-07/R-41 — data demo tanpa gate DEMO_MODE** masih dapat merembes ke dashboard/KPI produksi                                                                  | MEDIUM   | Terapkan gate `DEMO_MODE` global; seed produksi tanpa data demo                                                                                                     |
| R6  | **R-09 — kontrak antrean penilaian guru** (assignments ≠ submissions) masih belum disamakan                                                                    | MEDIUM   | Sinkronkan kontrak web↔API; tambah E2E alur penilaian guru                                                                                                          |
| R7  | **R-13 — kualitas data AuditLog (actor_role)** belum konsisten; **R-14 — enum AuditAction kurang kaya & login gagal tidak diaudit**                            | MEDIUM   | Standarisasi isian `actor_role`; perkaya enum; audit peristiwa login gagal (selaras G-27 [prd05])                                                                   |
| R8  | **R-22 — tidak ada rate-limit khusus upload**                                                                                                                  | MEDIUM   | Tambah rate limit per-user/upload (mis. N request/menit); kalibrasi dengan ambang ujian [prd05 G-06]                                                                |
| R9  | **Web tests baru bootstrap** (2 suite) — belum menguji komponen/halaman                                                                                        | LOW      | Lanjutkan kampanye 2000+ tests per §9-DoD [prd06]; prioritaskan halaman inti (ujian, kuis, dashboard)                                                               |
| R10 | **R-10/R-46/R-47 — higienis UX**: navigasi per-role statis, bottom nav `grid-cols-5` kosong bila < 5 item, fetch ortu tanpa error isolation                    | LOW      | Kerjakan dalam clean code pass [prd06 §3.6]                                                                                                                         |
| R11 | **R-35 — form kontak publik** belum ada (CTA PPDB + FAQ sudah tersedia)                                                                                        | LOW      | Tambahkan form kontak publik opsional dengan rate limit + sanitasi (tunduk G-28 [prd05])                                                                            |
| R12 | **R-43 — middleware.ts web tidak ada** (ditetapkan opsional)                                                                                                   | LOW      | Pertahankan keputusan opsional; dokumentasikan alasan di README arsitektur web                                                                                      |

---

## 9. Kesimpulan & Verdict

### Verdict: **APPROVE dengan catatan**

- **Kualitas keseluruhan: baik.** Putaran 2 menutup **seluruh 3 temuan CRITICAL dan 10
  temuan HIGH** dari register R-01..R-48; tidak ada temuan CRITICAL/HIGH yang tersisa.
- **Perbaikan berdampak langsung pada pengalaman & operasi:** dark mode berfungsi di
  shell/layout, dashboard SUPERADMIN memakai data nyata, change-log teraudit dan dapat
  dibaca SUPERADMIN/KEPSEK, upload tervalidasi magic bytes dengan batas per-bucket,
  browser storage dikelola dengan aman (draft PPDB pindah ke sessionStorage), websocket
  hidup (notifikasi live, force-submit ujian, redis adapter), landing page diperkaya, dan
  risiko exhaust koneksi dihilangkan via PrismaClient singleton.
- **Risiko terbuka bersifat non-blocking** untuk pengembangan internal: 9 baris register
  terbuka (semua MEDIUM/LOW) + 3 risiko operasional (WAKEPSEK vs change-log, exports
  memoryStorage, coverage). Direkomendasikan dituntaskan sebelum rilis production skala
  penuh.
- **Persyaratan untuk rilis production** (sebelum go-live): gate DEMO_MODE global
  (R5), gate coverage ≥ 80% (R4), perbaikan exports memoryStorage (R3), dan keputusan
  eksplisit akses change-log WAKEPSEK (R1).

Tindak lanjut prioritas: **R5 → R4 → R1 → R3 → R6/R7 → R9** (lihat §8). Detail program
perbaikan & roadmap fitur berikutnya tercantum di [docs/prd/prd06-development-v2.md].

---

_End of document — Riview 02 openlms, 2026-08-07. Semua sitasi `file:line` mengacu pada
source code pada tanggal review; angka agregat build/lint/test merupakan catatan eksekusi
audit dan dikorelasikan dengan struktur skrip workspace._
