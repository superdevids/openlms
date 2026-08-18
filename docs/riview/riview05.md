# Riview 05 — opensis: Laporan Review Berkala Putaran 5

|                    |                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tanggal**        | 2026-08-10                                                                                                                                                                                                                                                                                                                                                                |
| **Proyek**         | opensis — monorepo Turborepo: apps/api (NestJS + Prisma + PostgreSQL + Socket.IO), apps/web (Next.js + Tailwind v4 + shadcn/ui), packages/database, packages/ui, packages/types                                                                                                                                                                                           |
| **Revisi**         | v1.0 — laporan review berkala setelah gelombang fitur/desain (Landing v2, FE App v3, public-content, metrics, keamanan & reliability, migrasi DB, backup/staging/E2E)                                                                                                                                                                                                     |
| **Status dokumen** | FINAL                                                                                                                                                                                                                                                                                                                                                                     |
| **Verdict**        | **APPROVE MENUJU PRODUKSI** — kualitas fungsional & keamanan tinggi (skor komposit 8,2/10; tren stabil dari 8,3 di riview04), seluruh temuan fungsional putaran ini ditutup; go-live masih menunggu prasyarat produksi yang tersisa (E2E belum di CI, coverage gate belum aktif, staging belum live, migrasi belum di-deploy di prod, allowlist linkChild OPERATOR belum) |

---

## 1. Ringkasan Eksekutif (BLUF)

**Review berkala putaran 5 menilai gelombang terakhir: redesign frontend penuh
(Landing v2 10 halaman mandiri + App Design System v3), dua modul API baru
(public-content 12 endpoint publik, metrics observability), perbaikan keamanan
& reliability (SEC-001/002/007, REL-001/002/003/006/009, CFG-02,
PERF-01/04/05/06), dua migrasi DB baru, dokumen backup/restore, overlay staging,
dan scaffold E2E. Kesimpulan: seluruh temuan fungsional ditutup dan skor
keamanan naik ke 9,0 — tetapi produksi belum dinyatakan go-live karena prasyarat
operasional (E2E di CI, coverage gate, staging live, migrasi di prod, allowlist
linkChild) masih terbuka.**

- **Landing v2 selesai** (§3.1): 10 halaman mandiri (bukan section dari satu
  agregat), token warna/typografi baru, 21 SVG playful lokal (CSP-safe), WCAG AA;
  data per halaman disuplai modul `public-content` (12 endpoint GET `/public/*`,
  cache 300s).
- **FE App v3 selesai** (§3.2): AppShell v2 + `components/ui` 12 ekspor +
  53 halaman role/publik + login split-screen; token additif, tidak mengubah
  token existing.
- **Keamanan & reliability** (§3.4): JWT canonical signature ditolak, revoke
  refresh saat ganti/reset password, COOKIE_SECURE fail-fast, audit failure
  logging, mapping P2002/P2025/P2003, fix race pembayaran, rollover processor
  idempotent, IDOR parent-portal & finance scope.
- **Tersisa (prasyarat produksi, §4 TERBUKA):** E2E belum berjalan di CI,
  coverage gate belum aktif, staging overlay belum live, migrasi DB belum
  di-deploy di prod, allowlist linkChild oleh OPERATOR belum ada.

> Catatan transparansi: angka test (API 2.140 + web 99 + integration 10,
> termasuk public-content 20) berasal dari catatan eksekusi orkestrator
> (kampanye tester paralel). Klaim tingkat source (sitasi `file:line`) pada
> dokumen ini diverifikasi langsung terhadap source code saat penyusunan.

---

## 2. Lingkup & Metodologi

### 2.1 Lingkup review

| Area                   | Fokus                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing v2             | 10 halaman mandiri, token `--surface-*`/`--gradient-*`/`--playful-*`, 21 SVG, a11y WCAG AA, ISR 30s                                                          |
| FE App v3              | AppShell v2, `components/ui` 12 ekspor, 53 halaman role + login split-screen, token additif v3                                                               |
| Backend API            | Modul `public-content` (12 endpoint GET `/public/*`, cache 300s), modul `metrics` (GET `/metrics`, SUPERADMIN + `system:status:read`)                        |
| Keamanan & Reliability | SEC-001 (parent-portal IDOR), SEC-002 (finance scope), SEC-007 (revoke refresh), REL-001/002/003/006/009, CFG-02 (COOKIE_SECURE fail-fast), PERF-01/04/05/06 |
| Migrasi DB             | 9 → 11 migrasi (tambah `20260809000000_audit_fixes`, `20260809010000_exam_attempt_token_dedupe`)                                                             |
| Operasional            | Backup/restore (`deploy/BACKUP.md` + script), staging overlay (`docker-compose.staging.yml`), E2E scaffold (`apps/web/e2e/`), prasyarat produksi tersisa     |
| Dokumentasi            | `docs/02` (arsitektur), `docs/08` (knowledge base), riview05 ini; konsistensi dengan riview04                                                                |

### 2.2 Metodologi

1. **Review berbasis bukti** — setiap klaim disertai sitasi `file:line` yang
   diverifikasi terhadap source code saat penyusunan dokumen (bukan asumsi).
2. **Verifikasi silang angka** — jumlah modul/halaman/migrasi/endpoint dihitung
   dari glob/grep source; angka test agregat dari catatan eksekusi dan ditandai.
3. **Korelasi lintas dokumen** — perubahan dipetakan ke register putaran
   sebelumnya ([riview04] Rv4-01..16) dan prasyarat produksi [prd07] §6.
4. **Quality Gates QG-W1..W6 dan QG-1..8** — penilaian per gate (§5.6).

---

## 3. Ringkasan Perubahan yang Dilakukan (per area)

Seluruh area berikut **SELESAI** pada gelombang putaran 5. Kolom "Bukti" memuat
artefak terverifikasi pada source; kolom "Status" menunjukkan hasil review.

| #   | Area                                                        | Bukti / indikator                                                                                                                                                                                                                                                                                                                                                                                                                               | Status   |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Landing v2 — 10 halaman mandiri**                         | `docs/landing-design-v2.md` (final 9 Agu 2026); route group `(landing)` = testimoni, fasilitas, prestasi, galeri, kontak, tentang, program-keahlian, faq, berita(+detail), ekstrakurikuler + root `/` (glob `apps/web/src/app/**/page.tsx`); 21 SVG di `apps/web/public/landing/playful/`; token di `globals.css`                                                                                                                               | SELESAI  |
| 2   | **Modul `public-content`** — 12 endpoint publik per halaman | `apps/api/src/modules/public-content/public-content.controller.ts:31-118` (`@Controller("public")`, 12× `@Get` + `@Public()` + `Cache-Control: public, max-age=300`); 20 test di `public-content.service.spec.ts`                                                                                                                                                                                                                               | SELESAI  |
| 3   | **Modul `metrics`** — observability proses                  | `metrics.controller.ts:16-22` — `GET /metrics`, `@Roles(SUPERADMIN)` + `@RequirePermission("system:status:read")`, `Cache-Control: no-store`; `metrics.service.ts` (uptime, memori, event loop lag via `setImmediate` delta); terdaftar `app.module.ts:72`                                                                                                                                                                                      | SELESAI  |
| 4   | **FE App v3 — AppShell v2 + komponen shared**               | `apps/web/src/components/layout/app-shell.tsx` (566 baris: sidebar, topbar + CommandPalette, drawer mobile, focus trap, theme/font-size toggle); `components/ui/index.ts` 12 ekspor (PageContainer, PageHeader, StatCard/StatGrid/Sparkline, StatusBadge, DataTable, EmptyStateV3, FormPage/FormSection/ValidationAlert, CommandPalette); login split-screen `(auth)/login/page.tsx:32` (`grid lg:grid-cols-2`); `docs/app-design-system-v3.md` | SELESAI  |
| 5   | **Keamanan & reliability** (detail §5.4)                    | `jwt.util.ts:88-96` (canonical signature), `auth.service.ts:320-323,363-366` (SEC-007 revoke), `main.ts:21-23` (CFG-02 fail-fast), `lms/lms-audit.ts:65,93` (audit failure logging), `all-exceptions.filter.ts:111-125` (P2002/P2025/P2003), `parent-portal.service.ts:124,176` (SEC-001), `invoice.service.ts:21,233` (SEC-002), `payment.service.ts` (race verify), `rollover.processor.ts:38-56` (idempotent)                                | SELESAI  |
| 6   | **Migrasi DB +2 (total 11)**                                | `packages/database/prisma/migrations/20260809000000_audit_fixes/migration.sql`, `20260809010000_exam_attempt_token_dedupe/migration.sql` — total 11 folder migrasi (glob, 2026-08-10)                                                                                                                                                                                                                                                           | SELESAI* |
| 7   | **Backup/restore**                                          | `deploy/BACKUP.md` (RPO ≤ 24 jam, RTO ≤ 4 jam, `backup.sh`/`restore.sh`, arsip DB custom + storage tar.gz)                                                                                                                                                                                                                                                                                                                                      | SELESAI* |
| 8   | **Staging overlay**                                         | `docker-compose.staging.yml` (mirror PROD: image tag khusus `opensis-*:staging`, `.env.staging`, resource lebih kecil, akses via Nginx :80)                                                                                                                                                                                                                                                                                                     | SELESAI* |
| 9   | **E2E scaffold**                                            | `apps/web/e2e/smoke.spec.ts` + `README.e2e.md` (smoke render landing `/` + login `/login`; Playwright, base URL `http://localhost:3000`)                                                                                                                                                                                                                                                                                                        | SELESAI* |
| 10  | **Dokumentasi**                                             | `docs/02-technical-architecture.md` (34 modul, §5.4, §13, 11 migrasi), `docs/08-knowledge-base.md` (angka test, peta arsitektur, ADR-007/008, referensi riview05)                                                                                                                                                                                                                                                                               | SELESAI  |

\* Artefak/kode selesai ditulis dan terverifikasi ada; penerapan **operasional**
(migrasi di prod, staging live, E2E di CI, coverage gate) masih terbuka — §4
TERBUKA.

---

## 4. Register Temuan Putaran 5 (severity-tagged)

### DIPERBAIKI (gelombang putaran 5 selesai)

| ID     | Temuan                                                                                                                                  | Severity | Bukti verifikasi                                                                                                                                                     | Status     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Rv5-01 | **Landing masih agregat satu halaman** — tiap halaman butuh data sendiri (menggantikan pola "semua section dari `GET /public/landing`") | MEDIUM   | `public-content.controller.ts:31-118` (12 endpoint per halaman, cache 300s); `docs/landing-design-v2.md` (10 halaman mandiri)                                        | DIPERBAIKI |
| Rv5-02 | **App v1/2 belum konsisten antar role** — halaman role belum memakai shell & komponen shared                                            | MEDIUM   | `app-shell.tsx` (AppShell v2); `components/ui/index.ts` (12 ekspor); 53 halaman role + login split-screen terverifikasi via glob                                     | DIPERBAIKI |
| Rv5-03 | **Signature JWT non-kanonik bisa lolos HMAC** — mutasi bit padding pada karakter terakhir menghasilkan byte identik                     | HIGH     | `jwt.util.ts:88-96` — decode → re-encode kanonik wajib sama; + `timingSafeEqual` + cek panjang                                                                       | DIPERBAIKI |
| Rv5-04 | **Refresh token tidak di-revoke saat ganti/reset password** — sesi lama tetap hidup                                                     | HIGH     | `auth.service.ts:320-323,363-366` (SEC-007, `updateMany revoked_at`); test `auth.service.spec.ts:295,350`                                                            | DIPERBAIKI |
| Rv5-05 | **COOKIE_SECURE bisa tidak diset di production** — cookie non-Secure diam-diam                                                          | HIGH     | `main.ts:21-23` — fail-fast bila `NODE_ENV=production` dan `COOKIE_SECURE !== "true"`                                                                                | DIPERBAIKI |
| Rv5-06 | **Kegagalan tulis AuditLog menggagalkan request utama / tidak tercatat**                                                                | MEDIUM   | `lms/lms-audit.ts:65,93` — try/catch + `logger.error("writeAudit gagal")`                                                                                            | DIPERBAIKI |
| Rv5-07 | **Error Prisma bocor / status tidak konsisten** — P2002/P2025/P2003 tanpa mapping                                                       | MEDIUM   | `all-exceptions.filter.ts:111-125` — P2002→409, P2025→404, P2003→409, pesan generik                                                                                  | DIPERBAIKI |
| Rv5-08 | **Parent-portal IDOR** — wali bisa akses data anak yang tidak terhubung                                                                 | HIGH     | `parent-portal.service.ts:124,176` (SEC-001 — wajib lolos `ParentStudentLink`); spec `ParentPortalService (SEC-001 scope SENDIRI)`                                   | DIPERBAIKI |
| Rv5-09 | **Finance scope longgar** — SISWA/WALI_MURID bisa baca invoice di luar kepemilikan                                                      | HIGH     | `finance/services/invoice.service.ts:21,233` (SEC-002 — paksa scope ke diri/anak); spec `InvoiceService (SEC-002 scope baca)`                                        | DIPERBAIKI |
| Rv5-10 | **Race verifikasi pembayaran** — dua verify bersamaan bisa sukses dua kali / notifikasi ganda                                           | HIGH     | `finance/services/payment.service.ts:122,166,203` ($transaction + re-check); spec `payment.service.spec.ts:123` ("1 sukses, 1 ConflictException, notifikasi sekali") | DIPERBAIKI |
| Rv5-11 | **Rollover processor tanpa idempotensi** — job ganda bisa eksekusi dua kali                                                             | HIGH     | `jobs/processors/rollover.processor.ts:38-56` — cek terminal state + cocokkan `idempotency_key`; spec `rollover.processor.spec.ts`                                   | DIPERBAIKI |
| Rv5-12 | **Angka test usang di dokumentasi** — ±1.900/94 (riview04) vs agregat terbaru                                                           | LOW      | `docs/08` diperbarui: API **2.140**, web **99**, integration **10**, public-content **20** (catatan eksekusi 2026-08-10)                                             | DIPERBAIKI |

### TERBUKA (prasyarat produksi / non-blocking)

| ID     | Temuan                                                                                                                                 | Severity | Bukti / rujukan                                                                           | Rencana penanganan                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Rv5-13 | **E2E belum di CI** — scaffold smoke ada (`apps/web/e2e/smoke.spec.ts`) tetapi belum menjadi gate pipeline; cakupan baru render publik | HIGH     | `apps/web/e2e/README.e2e.md` (roadmap: login nyata, alur ujian, alur guru); [prd07] §6 #2 | Sambungkan `test:e2e` ke GitHub Actions (merge ke main); perluas cakupan                                      |
| Rv5-14 | **Coverage gate belum aktif** — DoD coverage ≥ 80% belum terukur formal di CI                                                          | MEDIUM   | [prd07] P3-8; [riview04] R4/Rv4-15                                                        | Aktifkan gate coverage (api+web) di pipeline                                                                  |
| Rv5-15 | **Migrasi DB belum di-deploy di prod** — folder 11 migrasi ada, eksekusi `db:migrate:deploy` di env prod belum                         | HIGH     | `packages/database/prisma/migrations/` (11 folder); [riview04] Rv4-02 (lanjutan)          | `npm run db:migrate:deploy` sebelum go-live                                                                   |
| Rv5-16 | **Staging belum live** — overlay `docker-compose.staging.yml` siap, env staging belum dijalankan                                       | MEDIUM   | `docker-compose.staging.yml`; `deploy/README.staging.md`; [prd07] G-67                    | `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml up -d --build` |
| Rv5-17 | **Allowlist linkChild oleh OPERATOR belum** — mekanisme persetujuan resmi masih TODO                                                   | MEDIUM   | `parent-portal.service.ts:52` (TODO)                                                      | Mekanisme allowlist OPERATOR + verifikasi                                                                     |
| Rv5-18 | **Backup drill bulanan belum diverifikasi** — dokumen + script ada, drill restore belum dijalankan                                     | MEDIUM   | `deploy/BACKUP.md` (RPO ≤ 24 jam, RTO ≤ 4 jam)                                            | Jalankan restore drill ke sandbox; catat bukti                                                                |

---

## 5. Detail per Dimensi

### 5.1 Landing v2 (Rv5-01)

- **10 halaman mandiri** — `docs/landing-design-v2.md` menetapkan blueprint E.1–E.10
  (home, tentang, kontak, program-keahlian, fasilitas, ekstrakurikuler, prestasi,
  galeri, testimoni, faq) + berita; terverifikasi 11 `page.tsx` di route group
  `(landing)` + root `/` (total 64 file `page.tsx` di app, glob 2026-08-10).
- **Data per halaman** — modul `public-content` (12 endpoint GET `/public/*`,
  `Cache-Control: public, max-age=300`); sumber: tabel domain (`Prodi`,
  `Extracurricular`, `Achievement`, `SchoolProfile`) + JSON `LandingContent`.
- **Aset & aksesibilitas** — 21 SVG playful lokal (`/landing/playful/`, wajib
  lokal karena CSP `img-src 'self' data:`); kontras WCAG AA di tabel B.4,
  `aria-hidden` untuk SVG dekoratif, `focus-visible`, reduced-motion.
- **ISR** — `revalidate = 30` efektif (lanjutan riview04 Rv4-05, tidak berubah).

### 5.2 FE App v3 (Rv5-02)

- **AppShell v2** — `components/layout/app-shell.tsx`: sidebar per role dari
  `lib/roles.ts` (ROLE_GROUP_LABEL, visibleNav, roleHome), topbar dengan
  breadcrumb + CommandPalette + unread notifications, drawer di mobile, focus
  trap, ThemeToggle & FontSizeToggle, demo role switch.
- **Komponen shared 12 ekspor** — `components/ui/index.ts`: PageContainer,
  PageHeader, StatCard/StatGrid/Sparkline, StatusBadge, DataTable,
  EmptyStateV3, FormPage/FormSection/ValidationAlert, CommandPalette.
- **Halaman** — 53 halaman role/publik lain + login split-screen
  (`(auth)/login/page.tsx:32` — `grid min-h-screen bg-app-bg lg:grid-cols-2`).
- **Token** — v3 additif (`--app-bg`, `--app-surface`, `--sidebar-*`,
  `--status-*`) tanpa mengubah token landing v2 / shadcn existing.

### 5.3 Backend API — public-content & metrics (Rv5-01, Rv5-03)

- **34 modul** (naik dari 32; glob `apps/api/src/modules/*/*.module.ts`):
  tambah `public-content` & `metrics`.
- **public-content**: 12 endpoint GET `/public/*`, seluruhnya `@Public()` +
  cache 300s; 20 test unit (`public-content.service.spec.ts`) — mapping,
  fallback kosong, 404 bila section tidak ada, null fallback.
- **metrics**: `GET /metrics` — hanya SUPERADMIN + `system:status:read`
  (fail-closed), `Cache-Control: no-store`; data `process.*` + event loop lag.
  Tanpa dependency npm baru.

### 5.4 Keamanan & Reliability (Rv5-03..Rv5-11)

| ID      | Item                                     | Verifikasi                                                                                                                             |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-001 | Parent-portal IDOR                       | `parent-portal.service.ts:124,176` — scope SENDIRI via `ParentStudentLink`; spec mencantumkan "SEC-001 scope SENDIRI"                  |
| SEC-002 | Finance scope                            | `invoice.service.ts:21,233` — aktor tanpa `invoice:read:school` dipaksa scope ke diri/anak; spec "InvoiceService (SEC-002 scope baca)" |
| SEC-007 | Revoke refresh saat ganti/reset password | `auth.service.ts:320-323,363-366` — `updateMany { revoked_at }` semua token aktif; test `auth.service.spec.ts:295,350`                 |
| CFG-02  | COOKIE_SECURE fail-fast                  | `main.ts:21-23` — boot gagal bila production tanpa `COOKIE_SECURE=true`                                                                |
| —       | JWT canonical signature                  | `jwt.util.ts:88-96` — tolak base64url non-kanonik + `timingSafeEqual`                                                                  |
| —       | Audit failure logging                    | `lms/lms-audit.ts:65,93` — try/catch + `logger.error("writeAudit gagal")`; request utama tidak gagal                                   |
| —       | Error mapping Prisma                     | `all-exceptions.filter.ts:111-125` — P2002→409, P2025→404, P2003→409                                                                   |
| REL-*   | Race pembayaran                          | `payment.service.ts:122,166,203` — transaksi + re-check; spec `:123`                                                                   |
| REL-*   | Rollover processor idempotent            | `rollover.processor.ts:38-56` — terminal state + `idempotency_key`                                                                     |
| PERF-*  | Token sesi ujian dedupe                  | migrasi `20260809010000_exam_attempt_token_dedupe`; guard P2002 di `exam-attempt.service.ts:680-682` (PERF-05)                         |

### 5.5 Migrasi DB, Operasional, Dokumentasi (Rv5-12..Rv5-18)

- **Migrasi** — 9 → **11** folder: tambah `20260809000000_audit_fixes` dan
  `20260809010000_exam_attempt_token_dedupe` (glob `migrations/*/migration.sql`).
- **Backup/restore** — `deploy/BACKUP.md` + `deploy/scripts/backup.sh`/
  `restore.sh`: RPO ≤ 24 jam, RTO ≤ 4 jam, DB `pg_dump -Fc` + storage `tar.gz`,
  peringatan off-host.
- **Staging** — `docker-compose.staging.yml`: overlay di atas PROD (image tag
  `opensis-*:staging`, `.env.staging` via `!override`, port 3000/3001 tidak
  dipublish, akses via Nginx :80, resource lebih kecil).
- **E2E** — `apps/web/e2e/smoke.spec.ts` + `README.e2e.md`: smoke render
  landing `/` + login `/login`; belum di CI (Rv5-13).
- **Dokumentasi** — `docs/02` §4.1 (34 modul), §5.4 (FE v3/landing v2), §13
  (catatan keamanan), §17 (11 migrasi); `docs/08` §1.1/§1.2/§6/§7/§8 sinkron;
  riview05 ini.

### 5.6 Quality Gates

| Gate                                 | Hasil                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| QG-W1 Commands/samples verified      | PASS — sitasi `file:line` diverifikasi terhadap source                                          |
| QG-W2 No invented examples           | PASS — seluruh endpoint/komponen/token terverifikasi (public-content 12 endpoint, ui 12 ekspor) |
| QG-W3 Consistent hierarchy           | PASS — struktur dokumen mempertahankan format riview04                                          |
| QG-W4 Steps numbered + prerequisites | PASS — rekomendasi berisi langkah konkret (§7.2)                                                |
| QG-W5 Code blocks language-tagged    | PASS                                                                                            |
| QG-W6 No filler                      | PASS                                                                                            |
| QG-1..8 universal                    | PASS — klaim agregat ditandai sebagai catatan eksekusi (bukan asumsi source)                    |

---

## 6. Hasil Verifikasi (raw evidence)

Angka yang terverifikasi langsung terhadap source pada penyusunan dokumen
(2026-08-10):

| Item                                | Hasil verifikasi                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Modul API                           | **34** (`apps/api/src/modules/*/*.module.ts`) — tambah `public-content`, `metrics`                                       |
| Endpoint public-content             | **12** GET `/public/*` (`public-content.controller.ts:31-118`, semua `@Public()` + `Cache-Control: public, max-age=300`) |
| Endpoint metrics                    | **1** GET `/metrics` — SUPERADMIN + `system:status:read`, `Cache-Control: no-store` (`metrics.controller.ts:16-22`)      |
| Test public-content                 | **20** `it(` (`public-content.service.spec.ts`)                                                                          |
| Migrasi Prisma                      | **11** folder (`packages/database/prisma/migrations/*/migration.sql`)                                                    |
| Model / Enum Prisma                 | **90 model / 62 enum** (`schema.prisma`)                                                                                 |
| Halaman `page.tsx` web              | **64** (`apps/web/src/app/**/page.tsx`): 11 di `(landing)` + 53 role/publik lain                                         |
| Komponen `components/ui`            | **12 ekspor** (`components/ui/index.ts`)                                                                                 |
| AppShell v2                         | `components/layout/app-shell.tsx` (566 baris)                                                                            |
| Login split-screen                  | `(auth)/login/page.tsx:32` (`grid lg:grid-cols-2`)                                                                       |
| JWT canonical                       | `jwt.util.ts:88-96`                                                                                                      |
| SEC-007 revoke                      | `auth.service.ts:320-323,363-366` + test `:295,350`                                                                      |
| COOKIE_SECURE fail-fast             | `main.ts:21-23`                                                                                                          |
| P2002/P2025/P2003                   | `all-exceptions.filter.ts:111-125`                                                                                       |
| Race pembayaran                     | `payment.service.ts:122,166,203` + spec `:123`                                                                           |
| Rollover processor                  | `jobs/processors/rollover.processor.ts:38-56` + spec                                                                     |
| Backup                              | `deploy/BACKUP.md`, `deploy/scripts/backup.sh`, `restore.sh`                                                             |
| Staging                             | `docker-compose.staging.yml`                                                                                             |
| E2E                                 | `apps/web/e2e/smoke.spec.ts` + `README.e2e.md`                                                                           |
| Test API (catatan eksekusi)         | **2.140** lulus, 0 gagal                                                                                                 |
| Test web (catatan eksekusi)         | **99** (10 file di `apps/web/src/lib/__tests__/`)                                                                        |
| Test integration (catatan eksekusi) | **10** (`apps/api/test/integration/*.spec.ts`; `app.e2e-spec.ts` terpisah +4)                                            |

> Angka test agregat (2.140/99/10) adalah catatan eksekusi orkestrator dari
> kampanye tester paralel; verifikasi ulang dari CI tetap menjadi rekomendasi
> sebelum klaim DoD final (Rv5-14).

---

## 7. Risiko Terbuka & Rekomendasi

### 7.1 Risiko terbuka (lihat §4 TERBUKA)

1. **E2E belum di CI** (Rv5-13, HIGH) — scaffold ada, gate pipeline belum.
2. **Migrasi belum di-deploy di prod** (Rv5-15, HIGH) — lanjutan Rv4-02.
3. **Coverage gate belum aktif** (Rv5-14, MEDIUM) — DoD ≥ 80% belum terukur.
4. **Staging belum live** (Rv5-16, MEDIUM) — overlay siap, env belum berjalan.
5. **Allowlist linkChild OPERATOR belum** (Rv5-17, MEDIUM) — TODO di service.
6. **Backup drill belum diverifikasi** (Rv5-18, MEDIUM) — dokumen+script ada.

### 7.2 Rekomendasi prioritas

1. **Deploy & migrasi (hari ini/1–2 hari):** jalankan `npm run db:migrate:deploy`
   di env dengan DB (dev + prod), naikkan overlay staging (`docker compose`
   3-file), verifikasi smoke E2E terhadap staging.
2. **Tutup gate pipeline (Sprint 1):** aktifkan E2E Playwright di CI (merge ke
   main), aktifkan coverage gate ≥ 80% (api+web), verifikasi angka test final
   dari CI dan catat ke README/riview.
3. **Selesaikan fitur keamanan tersisa:** mekanisme allowlist linkChild oleh
   OPERATOR (`parent-portal.service.ts:52`), lalu jalankan backup restore drill
   dan catat bukti.
4. **Jaga akurasi klaim:** seluruh angka agregat wajib diregenerasi dari CI pada
   audit berikutnya; tandai angka catatan eksekusi secara eksplisit.

---

## 8. Kesimpulan & Verdict

**Verdict: APPROVE MENUJU PRODUKSI.** Seluruh temuan fungsional putaran 5
ditutup (landing v2, FE app v3, public-content, metrics, keamanan &
reliability), tidak ada temuan CRITICAL terbuka, dan skor keamanan naik ke 9,0.
Go-live final masih menunggu prasyarat operasional: E2E di CI (Rv5-13), migrasi
di-deploy di prod (Rv5-15), coverage gate (Rv5-14), staging live (Rv5-16),
allowlist linkChild (Rv5-17), dan drill backup (Rv5-18). Bila seluruh prasyarat
tersebut hijau, verdict naik menjadi **APPROVE PRODUKSI (go-live)**.

| Dimensi                            | Skor (1–10) | Catatan                                                                                                                     |
| ---------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| Landing v2 (design + a11y)         | 8,5         | 10 halaman mandiri, 21 SVG lokal, WCAG AA, token additif                                                                    |
| FE App v3 (AppShell v2 + komponen) | 8,5         | AppShell v2 + 12 ekspor ui + 53 halaman + login split-screen; konsisten antar role                                          |
| Arsitektur Backend                 | 8,5         | 34 modul; public-content 12 endpoint (cache 300s); metrics observability                                                    |
| Keamanan & Reliability             | 9,0         | SEC-001/002/007, JWT canonical, COOKIE_SECURE fail-fast, audit failure logging, race/idempotensi; sisa: allowlist linkChild |
| Testing                            | 8,0         | API 2.140 + web 99 + integration 10; public-content 20; E2E & coverage gate belum di CI                                     |
| Dokumentasi                        | 8,5         | docs/02 + docs/08 sinkron; riview05 baru; sitasi file:line                                                                  |
| Production readiness               | 7,0         | Backup/staging/E2E scaffold ada; migrasi prod, staging live, CI gates belum                                                 |
| **Skor komposit**                  | **8,2**     | Rata-rata tertimbang dimensi di atas; tren stabil dari 8,3 (riview04) — naik di keamanan/FE, tertahan prasyarat produksi    |

---

## Lampiran A — Peta Prompt Historis → Status (tambahan putaran 5)

| #   | Prompt / permintaan historis          | Status   | Catatan / rujukan                                                    |
| --- | ------------------------------------- | -------- | -------------------------------------------------------------------- |
| 22  | Landing page mandiri per halaman      | SELESAI  | `public-content` 12 endpoint + `docs/landing-design-v2.md` (Rv5-01)  |
| 23  | Design system FE (APP v3)             | SELESAI  | `docs/app-design-system-v3.md` + AppShell v2 + ui 12 ekspor (Rv5-02) |
| 24  | Observability proses (metrics)        | SELESAI  | `GET /metrics` SUPERADMIN (Rv5-03)                                   |
| 25  | Keamanan: IDOR/scope/revoke/fail-fast | SELESAI  | SEC-001/002/007, CFG-02, JWT canonical (Rv5-04..Rv5-09)              |
| 26  | Reliability: race & idempotensi       | SELESAI  | payment verify race, rollover processor (Rv5-10/11)                  |
| 27  | Migrasi DB baru                       | SELESAI* | 11 migrasi; deploy prod belum (Rv5-15)                               |
| 28  | Backup/restore                        | SELESAI* | `deploy/BACKUP.md` + script; drill belum (Rv5-18)                    |
| 29  | Staging overlay                       | SELESAI* | `docker-compose.staging.yml`; belum live (Rv5-16)                    |
| 30  | E2E scaffold                          | SELESAI* | smoke render; belum di CI (Rv5-13)                                   |
| 31  | Sinkronisasi angka test               | SELESAI  | docs/08: API 2.140, web 99, integration 10 (Rv5-12)                  |

---

## Addendum — Sinkronisasi Angka 2026-08-16 (tidak mengubah isi laporan)

> **Catatan:** isi laporan di atas adalah catatan historis per 2026-08-10 dan
> TIDAK diubah. Angka di bawah adalah pembaruan status yang diverifikasi ulang
> terhadap source pada 2026-08-16 — untuk pembaca yang memakai laporan ini
> sebagai acuan terkini:
>
> - **Rv5-13 (E2E belum di CI) — TUTUP.** Scaffold Playwright (4 test) SUDAH
>   berjalan di CI sebagai job **`web-e2e`** (`.github/workflows/ci.yml`:
>   service postgres, `db:migrate:deploy` + `db:seed`, dev stack manual, upload
>   artifact playwright-report). Job CI kini **9**: lint, typecheck, unit,
>   web-test, integration, web-e2e, build, audit, secrets.
> - **Rv5-15 (migrasi 11) — angkanya kini 12.** Migrasi terakhir
>   `20260810000000_parent_link_approval` (status `ParentLinkStatus` pada
>   `parent_student_link`); deploy ke prod tetap terbuka.
> - **Rv5-17 (allowlist linkChild OPERATOR) — implementasi ada.** `linkChild`
>   membuat tautan berstatus **PENDING** (`parent-portal.service.ts:109`),
>   endpoint `POST /parent/links/:linkId/approve|reject` (`parent-portal.controller.ts:33-44`),
>   akses data anak hanya untuk tautan APPROVED (`:131,253`); test spec menutupi
>   alur approve/reject/ajukan ulang. (README.parent-portal.md masih menyebut
>   TODO — perlu pembaruan kontrak.)
> - **Enum Prisma — kini 63** (tambah `ParentLinkStatus`), bukan 62
>   (`packages/database/prisma/schema.prisma`).
> - **Angka test tetap catatan eksekusi** (API 2.140 / web 99 / integration 10 /
>   public-content 20, 2026-08-10) — regenerasi dari CI masih direkomendasikan
>   (Rv5-14).

---

## Addendum 2 — Gelombang Implementasi e-Rapor v1 & Go-Live 2026-08-16 (tidak mengubah isi laporan)

> **Catatan:** laporan di atas tetap catatan historis per 2026-08-10; Addendum 1
> (2026-08-16) tetap berlaku. Blok ini mencatat gelombang implementasi terbaru
> (e-Rapor v1 + go-live hardening), diverifikasi terhadap source pada 2026-08-16:
>
> - **Rv5-13 (E2E di CI) — SUDAH.** Playwright (4 test scaffold) berjalan di CI
>   job `web-e2e` (tetap 9 job: lint, typecheck, unit, web-test, integration,
>   web-e2e, build, audit, secrets).
> - **Rv5-14 (coverage gate) — SEBAGIAN.** Gate coverage **API** aktif di CI
>   (job `unit` memakai `--coverage`, QA-007); **coverage web vitest ditambahkan**
>   di `apps/web/vitest.config.ts` (provider v8, **threshold floor 0** —
>   anti-regresi, bukan target) tetapi job `web-test` belum menjalankan
>   `--coverage`. Target roadmap tetap **coverage ≥ 80%**.
> - **Rv5-17 (allowlist linkChild OPERATOR) — SELESAI** (sudah di Addendum 1,
>   dikonfirmasi tetap): endpoint approve/reject + akses hanya tautan APPROVED;
>   README.parent-portal.md masih perlu pembaruan kontrak (follow-up).
> - **Temuan MEDIUM Wave 2 — DITUTUP:** TER B/C payroll (kolom
>   `Staff.ter_category` + `PATCH /payroll/staff/:staffId/ter-category` —
>   catatan: nilai bracket PMK 168/2023 perlu review pajak sebelum produksi),
>   **payment idempotency** (`Idempotency-Key` dipersist di
>   `Payment.idempotency_key` unique + `allocations` JSONB, replay aman),
>   **kurikulum persist di DB** (`CurriculumReference`, sebelumnya Map
>   in-memory), **SMK/asset ownership (anti-IDOR)** jurnal PKL
>   (`assertJournalActor`) & cancel booking aset.
> - **Angka skema:** migrasi **12 → 15** (tambah
>   `20260816000000_staff_ter_category`, `20260816010000_payment_idempotency`,
>   `20260816020000_add_rapor_p5`; folder token-dedupe di-rename
>   `20260809010000` → `20260808235959`); **modul API 34 → 35** (tambah
>   `rapor`); **permission seed 138 → 141** (`rapor:p5:write:class`,
>   `rapor:p5:write:school`, `rapor:write:school`); **enum tetap 63**; **model
>   90 → 91** (`RaporP5`); halaman web 64 → **65** (`/siswa/rapor`).
> - **Keamanan go-live hardening — SELESAI:** Redis wajib password
>   (`REDIS_PASSWORD` fail-fast prod), port service prod hanya 127.0.0.1
>   (nginx :80 publik), gate `DEMO_MODE` (data demo tidak bocor; API fail-fast
>   bila `NEXT_PUBLIC_DEMO=1` di production).
> - **Test infra:** script test diselaraskan CI (`test:unit` tanpa e2e,
>   `test:integration` termasuk e2e, `+test:unit:coverage`); **angka test baru
>   = catatan eksekusi 2026-08-16**: API ±2.228 (101 suite — ±2.203/99 suite
>   sebelum modul rapor + 25 test rapor), web 99. **Bukan angka final** —
>   regenerasi dari CI tetap wajib (Rv5-14).
> - **Sisa prasyarat produksi (Rv5-15/16/18 + Rv5-14 lanjutan):**
>   **migrate deploy prod** (Rv5-15), **staging live** (Rv5-16), **drill
>   backup** (Rv5-18), **coverage ≥ 80%** (Rv5-14), **observability alerting**.

---

## Addendum 3 — Gelombang Wave 2 (modul PDP, e-Rapor v2, Dapodik v1) 2026-08-16 (tidak mengubah isi laporan)

> **Catatan:** laporan di atas dan Addendum 1–2 tetap catatan historis dan TIDAK
> diubah. Blok ini mencatat gelombang Wave 2 (kepatuhan UU PDP + e-Rapor v2 +
> Dapodik v1 + gate CI), diverifikasi terhadap source pada **2026-08-16**:
>
> - **6 temuan lama register putaran 2 — DITUTUP:** R-07 (kualitas
>   `actor_role` AuditLog + audit login gagal), R-09, R-22, R-41, R-46, R-47 —
>   register QA putaran 2 kini **9 terbuka → 3 tersisa** (R-10, R-13, R-14;
>   semua MEDIUM/LOW, non-blocking; lihat docs/08 §7.2).
> - **Modul PDP (UU PDP, G12/G13) — DIBANGUN:** modul API **`pdp`** — **14
>   endpoint `/pdp/*`** (data pribadi, perbaikan profil, ekspor personal
>   `ExportType.PERSONAL`, delete-request + approve/reject, consents, retensi +
>   `POST /pdp/retention/run`); 4 permission `pdp:*`
>   (`pdp:data:self`, `pdp:export:self`, `pdp:delete-request:self`,
>   `pdp:review:school`); model `PdpRequest` + enum
>   `PdpRequestType`/`PdpRequestStatus`; anonimisasi PII placeholder `[dihapus]`;
>   cron retensi bulanan `pdp-retention-monthly` (**`0 3 1 * *`**,
>   `jobs/processors/pdp-retention.processor.ts:17`) + **5 kebijakan retensi
>   default 60 bulan** (`packages/database/prisma/seed-data/retention-policies.ts`).
> - **e-Rapor v2 — ekspor PDF selesai:** `POST /rapor/:studentId/export-pdf`
>   (`report:export:self/class/school`) — PDF hand-rolled `rapor-pdf.ts` (footer
>   **"Draft Sistem"** `rapor-pdf.ts:160`), unduh `GET /exports/:id` +
>   `GET /exports/:id/download`; halaman `/guru/rapor` & `/admin/rapor` + tombol
>   unduh di `/siswa/rapor`; modul rapor kini **8 endpoint**. **Approval KEPSEK =
>   v2.1 (belum).**
> - **Dapodik v1 (G-50) — selesai best-effort:** `POST /dapodik/export`
>   (`export:run:school`) → **3 CSV ber-BOM** (`peserta_didik.csv`,
>   `pendidik.csv`, `rombongan_belajar.csv`); halaman `/admin/dapodik`.
>   **GAP v1:** `User`/`Staff` belum punya kolom `nisn`/`nik`/`nuptk` — NISN dari
>   `PpdbApplicant` (nullable), NUPTK kosong ber-catatan; migrasi **v1.1
>   dijadwalkan**.
> - **`ReportProcessor` bukan lagi skeleton:** dispatcher `export_type`
>   RAPOR/DAPODIK/NILAI (`jobs/processors/report.processor.ts:58-70`, idempoten);
>   `ExportModule` berisi generator nyata (`rapor-export.service.ts`,
>   `dapodik-export.service.ts`).
> - **3 gate CI aktif:** **prettier** (`ci.yml` job `prettier`),
>   **web coverage** (vitest `--coverage`, floor 0 — job `web-test`),
>   **import-no-restricted-paths** (ESLint `eslint.config.mjs:53`, job `lint`).
> - **Angka skema terverifikasi 2026-08-16:** modul API **35 → 37** (tambah
>   `pdp`, `export`); migrasi **15 → 16** (tambah `20260816030000_add_pdp_module`);
>   **permission seed 141 → 146** (tambah `pdp:data:self`, `pdp:export:self`,
>   `pdp:delete-request:self`, `pdp:review:school`, `report:export:self`);
>   **model 91 → 92** (`PdpRequest`); **enum 63 → 65** (`PdpRequestType`,
>   `PdpRequestStatus`); halaman web 65 → **68** (`/guru/rapor`, `/admin/rapor`,
>   `/admin/dapodik`).
> - **Angka test catatan eksekusi 2026-08-16 (Wave 2):** API **2.353 (111
>   suite)**, web **99**, integration **10** — **bukan angka final**, regenerasi
>   dari CI tetap wajib (Rv5-14).
> - **Sisa prasyarat produksi:** **migrate deploy prod** (Rv5-15), **staging
>   live** (Rv5-16), **drill backup** (Rv5-18), **review pajak TER** (nilai
>   bracket PMK 168/2023 sebelum produksi), **coverage ≥ 80%** (Rv5-14),
>   **observability alerting**.

---

## Addendum 4 — Audit Putaran 2 (Dokumentasi & PDP) 2026-08-17 (tidak mengubah isi laporan)

> **Catatan:** laporan di atas dan Addendum 1–3 tetap catatan historis dan TIDAK
> diubah. Blok ini mencatat hasil **audit putaran 2** (verifikasi terhadap
> source pada **2026-08-17**):
>
> - **3 temuan HIGH baru — modul PDP (UU PDP):**
>   1. **Anonimisasi** — `PdpAnonymizeService.anonymizeUser`
>      (`apps/api/src/modules/pdp/pdp-anonymize.service.ts`) mengganti PII
>      dengan placeholder `[dihapus]` dan menonaktifkan user, tetapi **tidak
>      ada mekanisme verifikasi/uji** bahwa seluruh jejak PII di tabel turunan
>      (mis. log, riwayat chat, lampiran) ikut dianonimkan — perlu inventaris
>      field PII per model + test anonimisasi menyeluruh.
>   2. **Legal hold** — `DataRetentionPolicy` (`retention-policies.ts`) belum
>      punya konsep **legal hold / freeze** untuk data yang sedang dalam proses
>      hukum atau permintaan otoritas; retensi DELETE dapat menghapus data yang
>      seharusnya ditahan.
>   3. **Data anak** — alur consent `ParentalConsent` (PPDB/`GET /pdp/consents`)
>      belum mengikat kuat ekspor/permintaan PDP untuk data anak (Pasal 22/24
>      UU PDP) — perlu pemisahan alur WALI_MURID vs SISWA dan verifikasi
>      keabsahan wali.
> - **Gap dokumentasi (16 gap) — ditutup 2026-08-17:** README modul `pdp`
>   & `export` dibuat; `README.jobs.md` diperbarui (7 JOB_NAMES, processor
>   aktual, trigger REPORT_GENERATE); `docs/04` path aktual + section `/pdp/*`;
>   hitungan CI 9 → **10 job**; model/enum 92/65 diselaraskan; banner
>   STATUS: IMPLEMENTED di 6 README.registration; drift bucket storage &
>   nama rule ESLint (`import-x/no-restricted-paths`) diklarifikasi. Rincian di
>   [CHANGELOG.md](../../CHANGELOG.md) (Unreleased — sinkronisasi dokumentasi
>   putaran 2).
> - **Temuan info:** komentar header `permissions.ts:3` masih menulis "141
>   permission" padahal seed aktual **146** (perlu perbaikan source, bukan
>   dokumentasi).
> - **Target berikutnya:** **Dapodik v1.1** (kolom `nisn`/`nik`/`nuptk` pada
>   `User`/`Staff` — migrasi schema) dan **e-Rapor v2.1** (approval KEPSEK +
>   integrasi file e-Rapor resmi Kemdikbud); keduanya tetap roadmap.

---

## Addendum 5 — Gelombang 20-item (multi-role, squash migrasi, optimasi N+1, UI v2, dead code) 2026-08-18 (tidak mengubah isi laporan)

> **Catatan:** laporan di atas dan Addendum 1–4 tetap catatan historis dan TIDAK
> diubah. Blok ini mencatat hasil **gelombang 20-item** (verifikasi terhadap
> source pada **2026-08-18**):
>
> - **Multi-role switcher (item 18) — SELESAI:**
>   - User non-siswa/non-superadmin dapat **rangkap role** (1 user → N baris
>     `UserRole` ACTIVE); dropdown **"Ganti peran"** di AppShell
>     (`apps/web/src/components/layout/app-shell.tsx:390`).
>   - Peran aktif disimpan di localStorage **`opensis_active_role`**
>     (`apps/web/src/lib/active-role.ts:16`); peran aktif HANYA mengatur
>     dashboard/menu (UI/navigasi) — **izin backend tetap union seluruh roles**
>     (guard `roles[]` di API), sehingga tidak mempersempit otorisasi.
>   - `switchableRoles`/`resolveActiveRole`/`roleHome` di
>     `apps/web/src/lib/roles.ts:52-67`; SISWA & SUPERADMIN single-role
>     (tidak bisa di-switch); test `apps/web/src/lib/__tests__/roles.test.ts`.
>   - Seed user dev baru **`kepsek1`** (KEPSEK + GURU, keduanya ACTIVE —
>     `packages/database/prisma/seed.ts:221-255`). Login tetap **username
>     (NIS/NIP)**; email opsional (tidak berubah dari Addendum 4).
> - **Squash migrasi (item 17) — SELESAI (dev):**
>   - 17 folder migrasi Prisma inkremental disquash menjadi **1 baseline
>     `20260818000000_init_squashed`** (`packages/database/prisma/migrations/`):
>     **92 tabel + 65 enum + 85 index + 133 FK**.
>   - DB development di-reset & seed ulang (idempotent).
>   - ⚠️ **BLOCKER go-live:** baseline belum di-apply ke environment
>     production; env prod yang punya data historis butuh strategi bootstrap
>     (`prisma migrate resolve` / rebuild) — lihat [analisa-production-ready.md](../../analisa-production-ready.md).
> - **Optimasi N+1 (item 19) — SELESAI:**
>   - Rollover `buildPlan`/`execute` batch — `createMany`/`updateMany` per
>     entitas (`apps/api/src/modules/rollover/rollover.service.ts:503-712`).
>   - Daftar aset tanpa query per baris; payslip batch payroll; finance
>     late-fee/refresh batch (`late-fee.service.ts:213`,
>     `payment.service.ts:384-400`); PDP anonimisasi `updateMany`
>     (`pdp-anonymize.service.ts:66-110`); impor chunk `$transaction`
>     (`onboarding/import.service.ts:65,221-283`).
>   - Pagination `skip/take` pada exam/alumni/smk/ppdb; **4 index baru**
>     (PERF-02): `Grade(academic_year)`, `Invoice(status)`,
>     `Enrollment(academic_year_id)`, `Attendance(status)`.
> - **UI v2 + gambar asli (item 12/16/19-UI) — SELESAI:**
>   - Landing memakai gambar JPG asli (`apps/web/public/landing/school/*.jpg` —
>     hero, classroom, library, facility, activity) via script **`images:landing`**
>     (`package.json:27` → `scripts/generate-landing-images.mjs`).
>   - JSON-LD (`apps/web/src/app/page.tsx:268-296`), OG image
>     (`layout.tsx:66`), anti-CLS (dimensi eksplisit), tagline default
>     **"Platform Digital Terpadu Sekolah"**, shadow token `--shadow-app-*`
>     (`globals.css:334-336,457-459`).
> - **Dead code (item 20) — SELESAI (sebagian):**
>   - Dihapus: `galeri-section.tsx` (diganti `galeri-grid.tsx`), `login_*.txt`,
>     ekspor `FormPage` dari `components/ui/index.ts` (tersisa
>     `FormSection`/`ValidationAlert`/`RequiredLabel`), seed-data
>     `finance.ts`/`assets.ts`, deps `cva`/`clsx`/`tailwind-merge` dari
>     `apps/web/package.json`.
>   - ⚠️ **Catatan:** `api-dev.log` di root repo MASIH ADA (tidak ikut
>     terhapus) — perlu dihapus manual + ditambahkan ke `.gitignore`.
> - **Angka test catatan eksekusi 2026-08-18 (gelombang 20-item):** API
>   **~2.412 (118 suite)**, web **109** — **bukan angka final**, regenerasi
>   dari CI tetap wajib (Rv5-14). (Verifikasi tambahan: 124+ file spec API
>   terdeteksi di `apps/api/src/**/*.spec.ts` + `apps/api/test/**`.)
> - **Status prasyarat produksi (tetap, dari Addendum 3/4 + baru):**
>   **migrate deploy prod** (kini makin kritis karena baseline squashed belum
>   di-apply), **staging live** (Rv5-16), **drill backup** (Rv5-18), **review
>   pajak TER/BPJS** (nilai bracket PMK 168/2023 sebelum produksi),
>   **coverage ≥ 80%** (Rv5-14), **observability alerting**, **CSP nonce**
>   (`script-src 'unsafe-inline'` — roadmap), **RLS opsional** (belum diaktifkan),
>   **ganti password seed dev** sebelum go-live.
> - **Koreksi angka index (post-review 2026-08-18):** klaim "85 index" di atas
>   hanya menghitung `@@index` pada `schema.prisma` (85). Baseline
>   `20260818000000_init_squashed/migration.sql` sebenarnya memuat **85 CREATE
>   INDEX + 51 CREATE UNIQUE INDEX = 136 total** (51 unique mencakup inline
>   `@unique` yang di-generate Prisma). Angka 136 dipakai di
>   [03-database-erd.md](../03-database-erd.md),
>   [analisa-production-ready.md](../../analisa-production-ready.md), dan
>   CHANGELOG.md.
> - **Koreksi `api-dev.log` (post-review 2026-08-18):** klaim "masih ada" pada
>   Addendum 5 sudah tidak berlaku — file kosong di root sudah dihapus dan
>   `*.log` di `.gitignore`.

---

_End of document — Riview 05, opensis, 10 Agustus 2026._
