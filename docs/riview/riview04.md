# Riview 04 — opensis: Laporan Review Berkala Putaran 4

|                    |                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tanggal**        | 2026-08-08                                                                                                                                                                                                                                                               |
| **Proyek**         | opensis — monorepo Turborepo: apps/api (NestJS + Prisma + PostgreSQL + Socket.IO), apps/web (Next.js + Tailwind v4 + shadcn/ui), packages/database, packages/ui, packages/types                                                                                          |
| **Revisi**         | v1.0 — laporan review berkala setelah audit paralel 5 agent + gelombang perbaikan Wave 2 (role system, clean code, stabilitas test, ISR/landing, dark mode, sinkronisasi dokumentasi)                                                                                    |
| **Status dokumen** | FINAL                                                                                                                                                                                                                                                                    |
| **Verdict**        | **BELUM 100% PRODUCTION-READY** — kualitas fungsional tinggi (skor komposit 8,3/10) dan seluruh temuan Wave 2 selesai, namun prasyarat produksi PRD 7 §6 sebagian belum hijau (migrasi DB, observability, backup, E2E; Dockerfile sudah ada — Rv4-10 ditutup 2026-08-09) |

---

## 1. Ringkasan Eksekutif (BLUF)

**Review berkala putaran 4 dilakukan setelah audit paralel lima agent (reviewer,
architect, debugger, designer, writer) dan gelombang perbaikan Wave 2 selesai.
Kesimpulan: seluruh temuan Wave 2 ditutup — role system diperbarui menjadi 14 role
(BK, KAPRODI, AUDITOR), clean code refactor 98 file, 5 suite test pra-existing hijau,
konflik ISR vs force-dynamic dihapus, dan warna landing bermigrasi ke token semantik.
Namun go-live produksi masih menunggu prasyarat PRD 7 §6 yang belum hijau (migrasi
database belum diterapkan, observability/backup belum ada, E2E penuh belum
berjalan; Dockerfile aplikasi sudah tersedia — Rv4-10 ditutup 2026-08-09).**

- **Gelombang perbaikan Wave 2 selesai di 8 area** (§3): role system (GURU_BK → BK,
  tambah KAPRODI & AUDITOR, total 14 role), clean code refactor 98 file, perbaikan
  5 suite test pra-existing (hijau di `NODE_ENV=production` tanpa env), penghapusan
  konflik ISR vs `force-dynamic` (ISR `revalidate = 30` efektif), migrasi warna
  hardcoded `app/page.tsx` ke token semantik, penambahan token `--color-primary-200`,
  perbaikan kontras dark, dan sinkronisasi dokumentasi (riview04 + update README,
  arsitektur, ERD, kontrak API, KB, indeks docs).
- **Temuan tersisa seluruhnya bersifat prasyarat produksi atau non-blocking** (§4):
  migrasi DB `20260808143817_add_roles_bk_kaprodi_auditor` belum diterapkan (DB lokal
  offline), backup/observability belum ada, risiko cache in-memory
  multi-instance, dan E2E penuh atas PostgreSQL belum berjalan. Dockerfile aplikasi
  (Rv4-10) sudah ditutup 2026-08-09.
- **Rekomendasi prioritas** (§7) selaras PRD 7 §6: terapkan migrasi di env dengan DB,
  tutup prasyarat produksi (P1-2 E2E, P1-6/P3-4 observability, P3-6 backup,
  G-67 staging), lalu verifikasi ulang angka test agregat dari CI.

> Catatan transparansi: angka agregat test (API ±1.900 + web 94 → estimasi ±2.000+)
> dan jumlah file refactor (98) berasal dari catatan eksekusi orkestrator; verifikasi
> akhir pipeline oleh tester dijadwalkan paralel — bila angka final tersedia di laporan
> tester, gunakan angka tersebut (§6). Klaim tingkat source (sitasi `file:line`)
> diverifikasi langsung terhadap source code pada penyusunan dokumen ini.

---

## 2. Lingkup & Metodologi

### 2.1 Lingkup review

| Area        | Fokus                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Role system | Enum Role 12 → 14 (GURU_BK→BK, KAPRODI, AUDITOR), sinkronisasi seed permission & dashboard config, migrasi Prisma                    |
| Clean code  | Refactor 98 file: lookup map ganti nested ternary PPDB, `import * as React` dihapus, N+1 rollover di-batch, `KOLOM.map`, import type |
| Testing     | 5 suite test pra-existing, konflik ISR vs force-dynamic, angka agregat API + web                                                     |
| Frontend    | Tokenisasi warna landing, token `--color-primary-200`, kontras dark, route groups & halaman aktual                                   |
| Dokumentasi | README, 02-arsitektur, 03-ERD, 04-kontrak API, 07-UX, 08-KB, README.docs, README.types; riview04 baru                                |
| Operasional | Prasyarat produksi PRD 7 §6: migrasi DB, Dockerfile (sudah ada — Rv4-10 ditutup 2026-08-09), backup, observability, staging, E2E     |

### 2.2 Metodologi

1. **Audit paralel 5 agent** — reviewer (kualitas/kepatuhan), architect (arsitektur &
   production readiness), debugger (stabilitas test & konflik render), designer
   (dark mode & tokenisasi), writer (dokumentasi & klaim `file:line`). Setiap temuan
   dilaporkan severity-tagged, lalu diperbaiki pada Wave 2 dan diverifikasi ulang.
2. **Review berbasis bukti** — temuan disertai sitasi `file:line` yang diverifikasi
   terhadap source code; klaim agregat ditandai asal catatan eksekusi.
3. **Korelasi lintas dokumen** — perubahan dipetakan ke register putaran sebelumnya
   ([riview03] T1..T8, [riview02] R-_, [riview01] C-/H-/M-/L-) dan prasyarat
   produksi [prd07] §6.
4. **Spot-check verifikasi** saat penyusunan dokumen, mis. `schema.prisma:29-44`
   (enum Role 14 nilai), `packages/types/src/index.ts:9-24` (ROLE_VALUES),
   `migration.sql` (rename + 2 ADD VALUE), `(landing)/layout.tsx:10-11` (tanpa
   `force-dynamic` — ISR efektif), `app/page.tsx:38` (`revalidate = 30`),
   `globals.css:16,93` (`--color-primary-200` light & dark), serta 90 model/62 enum
   di `schema.prisma` dan 55 file `page.tsx` di `apps/web/src/app`.
5. **Quality Gates QG-W1..W6 dan QG-1..8** — penilaian per gate (§5).

---

## 3. Ringkasan Perubahan yang Dilakukan (per area)

Seluruh area berikut **SELESAI** pada gelombang perbaikan Wave 2. Kolom "Bukti"
memuat artefak yang terverifikasi pada source; kolom "Status" menunjukkan hasil
review dokumen ini.

| #   | Area                                                                                                                                                                   | Bukti / indikator                                                                                                                                                                                                                                                         | Status   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Role system 14 role** — enum `Role` + `ROLE_VALUES` sinkron; seed permission & dashboard config per role                                                             | `packages/database/prisma/schema.prisma:29-44` (SISWA, GURU, BK, KAPRODI, KEUANGAN, OPERATOR, WAKEPSEK, KEPSEK, AUDITOR, SUPERADMIN, CALON_SISWA, WALI_MURID, PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL); `packages/types/src/index.ts:9-24`                                 | SELESAI  |
| 2   | **KAPRODI & AUDITOR** — permission dan dashboard config baru                                                                                                           | `packages/database/prisma/seed-data/permissions.ts:512-529` (KAPRODI), `:423-448` (AUDITOR), `:654-671` (BK); `seed-data/dashboard-config.ts:151,288,361` (BK/KAPRODI/AUDITOR)                                                                                            | SELESAI  |
| 3   | **Migrasi Prisma baru** — rename `GURU_BK`→`BK` + `ADD VALUE KAPRODI/AUDITOR` (non-destructive)                                                                        | `packages/database/prisma/migrations/20260808143817_add_roles_bk_kaprodi_auditor/migration.sql` (3 statement ALTER TYPE) — **belum diterapkan** (§4-Rv4-02)                                                                                                               | SELESAI* |
| 4   | **Clean code refactor 98 file** — nested ternary PPDB → lookup map, 94 `import * as React` dihapus, N+1 rollover di-batch, tabel `KOLOM.map`, `import type`, 1-line if | Catatan eksekusi orkestrator; pola lookup map & `KOLOM.map` terverifikasi di halaman daftar web                                                                                                                                                                           | SELESAI  |
| 5   | **Stabilitas test** — 5 suite pra-existing diperbaiki, hijau di `NODE_ENV=production` tanpa env                                                                        | `apps/api/test/unit/{realtime.gateway.unit,feature-flags.service,queue.in-process,onboarding.service,communication.state-machine}.spec.ts`                                                                                                                                | SELESAI  |
| 6   | **ISR/landing** — konflik ISR vs `force-dynamic` dihapus; `revalidate = 30` efektif                                                                                    | `apps/web/src/app/(landing)/layout.tsx:10-11` (komentar arsitek: tanpa `force-dynamic` agar `revalidate` efektif); `apps/web/src/app/page.tsx:38` (`export const revalidate = 30`)                                                                                        | SELESAI  |
| 7   | **UI dark mode & tokenisasi** — warna hardcoded `app/page.tsx` → token semantik; token `--color-primary-200` ditambahkan; kontras dark diperbaiki                      | `apps/web/src/app/page.tsx` (`bg-brand-primary`, `bg-card`, `bg-muted`, `bg-white/10` overlay); `apps/web/src/app/globals.css:16` (light `--color-primary-200`) & `:93` (dark `--color-primary-200: #1e3a8a`)                                                             | SELESAI  |
| 8   | **Dokumentasi** — riview04 baru; README role 14 + link diperbaiki; arsitektur/ERD/kontrak API/KB/indeks docs disinkronkan                                              | `docs/riview/riview04.md` (file ini); perubahan pada `README.md`, `docs/02-technical-architecture.md`, `docs/03-database-erd.md`, `docs/04-api-contract.md`, `docs/07-ux-design.md`, `docs/08-knowledge-base.md`, `docs/README.docs.md`, `packages/types/README.types.md` | SELESAI  |

\* Kode migrasi selesai ditulis, tetapi **eksekusi `npm run db:migrate` belum dilakukan**
karena DB lokal offline; ini menjadi prasyarat go-live (PRD 7 §6 #5, §4-Rv4-02).

---

## 4. Register Temuan Putaran 4 (severity-tagged)

### DIPERBAIKI (Wave 2 selesai)

| ID     | Temuan                                                                                                                                                      | Severity | Bukti verifikasi                                                                                                                                                                                                                        | Status                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Rv4-01 | **Role enum usang & tidak lengkap** — `GURU_BK` perlu direname `BK`; role `KAPRODI` (Kepala Program Keahlian SMK) & `AUDITOR` (tim audit sekolah) belum ada | HIGH     | `schema.prisma:29-44` (14 role); `packages/types/src/index.ts:9-24` (ROLE_VALUES); `migration.sql` (RENAME + 2 ADD VALUE)                                                                                                               | DIPERBAIKI              |
| Rv4-02 | **Migrasi DB belum diterapkan** — `20260808143817_add_roles_bk_kaprodi_auditor` ditulis tetapi belum jalan (DB lokal offline)                               | HIGH     | `packages/database/prisma/migrations/20260808143817_add_roles_bk_kaprodi_auditor/migration.sql` — jalankan `npm run db:migrate` di env dengan DB                                                                                        | TERBUKA                 |
| Rv4-03 | **Clean code debt** — nested ternary PPDB, `import * as React` (94 file), N+1 rollover, render manual daftar                                                | MEDIUM   | Refactor 98 file (catatan eksekusi); lookup map & `KOLOM.map` terverifikasi di halaman daftar web                                                                                                                                       | DIPERBAIKI              |
| Rv4-04 | **5 suite test pra-existing gagal** (terkait `jwt.util`/redis/timing)                                                                                       | HIGH     | `apps/api/test/unit/{realtime.gateway.unit,feature-flags.service,queue.in-process,onboarding.service,communication.state-machine}.spec.ts` hijau di `NODE_ENV=production` tanpa env                                                     | DIPERBAIKI              |
| Rv4-05 | **Konflik ISR vs force-dynamic** di landing — `revalidate=30` tidak efektif ([riview03] T3)                                                                 | MEDIUM   | `(landing)/layout.tsx:10-11` tanpa `force-dynamic`; `app/page.tsx:38` `revalidate = 30` efektif; `berita/page.tsx:19` & `berita/[slug]/page.tsx:12` seragam `revalidate = 30`                                                           | DIPERBAIKI              |
| Rv4-06 | **Warna hardcoded di `app/page.tsx`** ([riview03] T4)                                                                                                       | MEDIUM   | `app/page.tsx` memakai `bg-brand-primary`, `bg-card`, `bg-muted`, `bg-white/10` (overlay disengaja di atas warna brand); `globals.css` token semantik aktif                                                                             | DIPERBAIKI              |
| Rv4-07 | **Token `--color-primary-200` belum ada** — palet primary tidak lengkap                                                                                     | LOW      | `globals.css:16` (light `#bfdbfe`) & `:93` (dark `#1e3a8a`)                                                                                                                                                                             | DIPERBAIKI              |
| Rv4-08 | **Kontras dark tidak konsisten** — beberapa permukaan dark memakai nilai yang terlalu terang/gelap                                                          | MEDIUM   | `globals.css:93` (dark `--color-primary-200: #1e3a8a` — kontras lebih baik); token semantik dipakai lintas halaman                                                                                                                      | DIPERBAIKI              |
| Rv4-09 | **Sinkronisasi dokumentasi tertinggal** — role 12, GURU_BK, angka test lama, link putus, "9 route group/48-52 page.tsx", base URL `openlms`                 | MEDIUM   | README/KB/02/03/04/07/README.docs/README.types diperbarui bersamaan (lihat §4-detail dokumentasi); link putus diidentifikasi & diperbaiki                                                                                               | DIPERBAIKI              |
| Rv4-10 | **Dockerfile aplikasi belum ada** — service `api`/`web` di docker-compose dikomentari                                                                       | HIGH     | `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore` ada; `docker-compose.prod.yml` service `api` (baris 21) & `web` (baris 70) AKTIF dengan healthcheck + deploy limits; README §Deployment & deploy/README.deploy.md sinkron | DIPERBAIKI (2026-08-09) |

### TERBUKA (prasyarat produksi / non-blocking)

| ID     | Temuan                                                                                                                                            | Severity | Bukti / rujukan                                                                              | Rencana penanganan                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Rv4-11 | **Backup/restore belum operasional** — RPO ≤ 24 jam / RTO ≤ 4 jam + drill belum ada                                                               | HIGH     | [prd07] §6 #3; [prd05] G-63                                                                  | Sprint 3 PRD 7 (P3-6)                                |
| Rv4-12 | **Observability belum lengkap** — health dinamis, metrik, slow query log, error tracking, alerting belum ada                                      | HIGH     | [prd07] §6 #4; [prd05] G-30..G-34; health module hanya dasar (`apps/api/src/modules/health`) | Sprint 1/3 PRD 7 (P1-6, P3-4)                        |
| Rv4-13 | **E2E penuh belum ada** — verifikasi kontrak web↔API belum otomatis atas PostgreSQL ([riview03] T1)                                               | HIGH     | Tidak ditemukan file `**/e2e/**`; [prd05] G-60/G-61; [prd07] §6 #2                           | Sprint 1 PRD 7 (P1-2)                                |
| Rv4-14 | **Cache in-memory multi-instance** — cache TTL berjalan di memori proses; bila instance > 1 hasil tidak konsisten ([riview03] T6)                 | MEDIUM   | Cache TTL di `modules/landing`, `app-settings`; [prd07] risiko R4                            | Sprint 1 PRD 7 (P1-5); ADR cache + jalur Redis       |
| Rv4-15 | **Angka test agregat belum diverifikasi ulang dari CI** — estimasi ±2.000+; verifikasi akhir pipeline oleh tester dijadwalkan paralel             | MEDIUM   | Catatan eksekusi (API ±1.900, web 94); [riview03] catatan transparansi                       | Verifikasi akhir oleh tester; regenerasi angka di CI |
| Rv4-16 | **Galeri landing masih placeholder** — hanya dirender bila `galeriImages.length > 0`; belum ada alur upload gambar di CMS landing ([riview03] T5) | LOW      | `apps/web/src/app/page.tsx:619`                                                              | Sprint 2 PRD 7 (P2-9)                                |

---

## 5. Detail per Dimensi

### 5.1 Clean Code (Rv4-03)

Gelombang Wave 2 memuat refactor 98 file dengan pola yang konsisten:

- **Nested ternary PPDB diganti lookup map** — logika pemetaan status/formulir PPDB
  yang berlapis diganti tabel lookup (object map), mengurangi kompleksitas kognitif
  dan memperbaiki keterbacaan.
- **94 `import * as React` dihapus** — konversi ke named import sesuai praktik
  modern; `import type` dipakai untuk tipe-only import (isolasi runtime type).
- **N+1 rollover di-batch** — query berulang pada proses rollover tahun ajaran
  dikelompokkan menjadi batch (mengurangi beban DB saat tutup tahun ajaran).
- **Tabel render via `KOLOM.map`** — daftar kolom tabel dihitung dari array
  konfigurasi, menghapus baris JSX berulang.
- **1-line if** — kondisi sederhana disederhanakan tanpa mengurangi keterbacaan.

Status: **DIPERBAIKI**. Catatan: jumlah "98 file" adalah angka catatan eksekusi;
dokumen ini tidak mengaudit ulang seluruh diff satu per satu.

### 5.2 Role System (Rv4-01, Rv4-02)

- **Enum `Role` kini 14 nilai** — `schema.prisma:29-44` dan
  `packages/types/src/index.ts:9-24` sinkron: SISWA, GURU, BK, KAPRODI, KEUANGAN,
  OPERATOR, WAKEPSEK, KEPSEK, AUDITOR, SUPERADMIN, CALON_SISWA, WALI_MURID,
  PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL.
- **BK (rename dari GURU_BK)** — mempertahankan permission counseling/discipline
  (`seed-data/permissions.ts:654-671`): `counseling:read:class`,
  `counseling:write:school`, `discipline:record:class`, `discipline:read:school`,
  verifikasi izin (`permit:verify:class`), ekskul, rekap absensi.
- **KAPRODI** — Kepala Program Keahlian SMK (`permissions.ts:512-529`): baca
  kurikulum/jadwal/prodi (`class/subject/schedule:read:school`,
  `academic:prodi:read`), rekap nilai & rapor program (`report:read:school`,
  `report:export:class`, `report:read:class`), rekap absensi
  (`attendance:rekap:class|school`), disiplin (`discipline:read:school`), PKL
  (`internship:write:school`) & UKK (`competency:grade:school`).
- **AUDITOR** — tim audit sekolah (`permissions.ts:423-448`): akses read-only luas —
  `audit:read:school`, `monitor:read:school`, `rbac:read:school`, baca
  students/grades/finance/payroll/attendance/users/staff/assets/exam-log/
  rollover-history (`user:read:school`, `class:read:school`, `exam:read:school`,
  `exam:log:read:school`, `attendance:rekap:school`, `invoice:read:school`,
  `payroll:read:school`, `asset:read:school`, `staff:read:school`,
  `rollover:history:read:school`, dst.). Tanpa permission tulis.
- **Dashboard config per role** — `seed-data/dashboard-config.ts:151,288,361`
  memuat blok BK/KAPRODI/AUDITOR; `ROLES_TO_SEED` 14 role
  (`permissions.ts:726-741`).
- **Migrasi** — `20260808143817_add_roles_bk_kaprodi_auditor/migration.sql`:
  `ALTER TYPE "Role" RENAME VALUE 'GURU_BK' TO 'BK';` + `ADD VALUE 'KAPRODI'` +
  `ADD VALUE 'AUDITOR'` (non-destructive, data existing ikut terpetakan).
  **TERBUKA:** migrasi belum dieksekusi karena DB lokal offline — wajib
  `npm run db:migrate` (dev) / `npm run db:migrate:deploy` (produksi) sebelum
  deploy (PRD 7 §6 #5).

### 5.3 Test Stability (Rv4-04, Rv4-15)

- 5 suite pra-existing yang sebelumnya gagal ([riview03] T2) kini **hijau di
  `NODE_ENV=production` tanpa env**: `realtime.gateway.unit`, `feature-flags.service`,
  `queue.in-process`, `onboarding.service`, `communication.state-machine`.
- Konfigurasi test menghindari ketergantungan env/timing yang membuat flaky.
- Angka terkini (catatan eksekusi): API unit — seed-data (~973) + 357 + 29 + dst
  (total API ±1.900); web Vitest **94 test** (9 file di `apps/web/src/lib/__tests__/`).
  **Estimasi agregat ±2.000+.** Verifikasi akhir oleh tester dijalankan paralel;
  angka final bila tersedia di laporan tester menggantikan estimasi ini.
- Catatan kejujuran: angka ini belum di-regenerate dari CI pada review ini; wajib
  diverifikasi ulang sebelum klaim DoD (PRD 6: 2.000+ test hijau, coverage ≥ 80%).

### 5.4 ISR / Landing (Rv4-05)

- Sebelumnya ([riview03] T3): `app/page.tsx` menetapkan `revalidate = 30` tetapi
  `(landing)/layout.tsx` menetapkan `dynamic = "force-dynamic"` sehingga ISR tidak
  efektif.
- Sekarang: `(landing)/layout.tsx:10-11` berisi komentar arsitek — "ISR: tanpa
  force-dynamic agar `revalidate` di page.tsx/berita/* efektif (keputusan arsitek
  T3 — konten landing dari CMS, revalidate 30s)". `page.tsx:38`,
  `berita/page.tsx:19`, dan `berita/[slug]/page.tsx:12` seragam `revalidate = 30`.
- Status: **DIPERBAIKI** — strategi render landing seragam (ISR 30 detik).

### 5.5 UI Dark Mode & Tokenisasi (Rv4-06, Rv4-07, Rv4-08)

- Warna hardcoded `app/page.tsx` ([riview03] T4) dimigrasi ke token semantik:
  `bg-brand-primary`, `bg-card`, `bg-muted`; sisa `bg-white/10`, `bg-white/15`,
  `text-white/90` adalah overlay disengaja di atas latar brand gelap (bukan
  hardcode netral).
- Token `--color-primary-200` ditambahkan: light `#bfdbfe` (`globals.css:16`) dan
  dark `#1e3a8a` (`globals.css:93`) — melengkapi palet `--color-primary-50..800`.
- Kontras dark diperbaiki dengan nilai dark token yang lebih gelap (mis.
  `--color-primary-200` dark = `#1e3a8a`), menjaga rasio kontras teks.
- Status: **DIPERBAIKI**.

### 5.6 Dokumentasi (Rv4-09)

Sinkronisasi besar dilakukan bersamaan dengan riview04:

| Dokumen                             | Perubahan utama                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                         | Role 12 → 14 (BK/KAPRODI/AUDITOR); angka test ±2.000+; 9 → 11 route group, 55 page.tsx; link putus diperbaiki; daftar dokumen + riview04 |
| `docs/02-technical-architecture.md` | Klaim 61 entitas → 90 model/62 enum; modul aktual 32; GURU_BK → BK; catatan pembaruan 2026-08-08                                         |
| `docs/03-database-erd.md`           | Klaim 61 → 90 model/62 enum; enum Role 14; GURU_BK → BK; modul aktual; catatan pembaruan 2026-08-08                                      |
| `docs/04-api-contract.md`           | Base URL `api.opensis.example`; invite `app.opensis.id`; RBAC role 14; matriks + KAPRODI/AUDITOR; GURU_BK → BK                           |
| `docs/07-ux-design.md`              | Copy UI login "Masuk ke opensis"                                                                                                         |
| `docs/08-knowledge-base.md`         | Role 14; 11 route group; 55 page.tsx; angka test; referensi riview04 & link prd diperbaiki                                               |
| `docs/README.docs.md`               | riview04 masuk indeks; link prd07.md/prd06.md diperbaiki; referensi `note.md` dihapus (file tidak ada)                                   |
| `packages/types/README.types.md`    | Enum Role: GURU_BK → BK + KAPRODI/AUDITOR                                                                                                |

### 5.7 Arsitektur / Production Readiness (Rv4-10..Rv4-14)

- **Kuat:** monorepo 32 modul (`apps/api/src/modules/*/*.module.ts`), 90 model/62
  enum, RBAC fail-closed, auth in-house, storage lokal tersanitasi, queue BullMQ +
  fallback in-process, realtime Redis adapter.
- **Belum hijau (prasyarat PRD 7 §6):** migrasi DB (Rv4-02), backup/restore (Rv4-11),
  observability (Rv4-12), E2E atas PostgreSQL (Rv4-13), staging (G-67). Cache
  multi-instance masih risiko (Rv4-14).
- **Dockerfile (Rv4-10) — DIPERBAIKI 2026-08-09:** `apps/api/Dockerfile`,
  `apps/web/Dockerfile`, `.dockerignore` tersedia; `docker-compose.prod.yml` service
  `api` (baris 21) & `web` (baris 70) aktif dengan healthcheck (`:51`, `:95`) dan
  resource limits (`:59`, `:102`) — overlay PROD siap `docker compose up -d --build`.

---

## 6. Hasil Verifikasi (raw evidence)

Angka yang terverifikasi langsung terhadap source pada penyusunan dokumen:

| Item                                  | Hasil verifikasi                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Model Prisma                          | **90** (grep `^model ` di `schema.prisma`)                                                                                 |
| Enum Prisma                           | **62** (grep `^enum ` di `schema.prisma`)                                                                                  |
| Enum Role                             | **14 nilai** (`schema.prisma:29-44`)                                                                                       |
| `ROLE_VALUES` (types)                 | 14 nilai sinkron (`packages/types/src/index.ts:9-24`)                                                                      |
| Migrasi role baru                     | Ada, belum dieksekusi (`migrations/20260808143817_add_roles_bk_kaprodi_auditor/migration.sql`)                             |
| Modul API                             | **32** (`apps/api/src/modules/*/*.module.ts`)                                                                              |
| Halaman `page.tsx` web                | **55** (`apps/web/src/app/**/page.tsx`)                                                                                    |
| Route group web                       | **11** + `support` + root (`(auth)(calonsiswa)(ppdb)(admin)(ortu)(landing)(pembimbing)(guru)(superadmin)(siswa)(penguji)`) |
| ISR landing                           | `page.tsx:38` `revalidate = 30`; `(landing)/layout.tsx` tanpa `force-dynamic`                                              |
| Token `--color-primary-200`           | `globals.css:16` (light) & `:93` (dark)                                                                                    |
| Seed permission KAPRODI/AUDITOR/BK    | `permissions.ts:423-448,512-529,654-671`; `dashboard-config.ts:151,288,361`                                                |
| Test API (estimasi, catatan eksekusi) | unit seed-data ~973 + 357 + 29 + dst → ±1.900; **belum verifikasi ulang penuh**                                            |
| Test web (Vitest)                     | **94 test** (9 file di `apps/web/src/lib/__tests__/`) — catatan eksekusi                                                   |
| Total agregat                         | **±2.000+** (verifikasi akhir pipeline oleh tester)                                                                        |

> Apabila laporan tester (dijalankan paralel) memuat angka final, angka tersebut
> menggantikan kolom estimasi di atas. Semua angka source (`file:line`) diverifikasi
> pada 8 Agustus 2026; nomor baris dapat bergeser setelah perbaikan berikutnya
> (risiko [prd07] R7).

---

## 7. Risiko Terbuka & Rekomendasi

### 7.1 Risiko terbuka (lihat §4 TERBUKA)

1. **Migrasi DB belum diterapkan** (Rv4-02, HIGH) — tanpa `npm run db:migrate`,
   production memakai enum lama (`GURU_BK`) dan role KAPRODI/AUDITOR tidak tersedia.
2. **Backup/observability belum ada** (Rv4-11/12, HIGH) — menghalangi operasional
   produksi yang andal (PRD 7 §6 #3/#4; G-63, G-30..G-34). Dockerfile (Rv4-10) sudah
   ditutup 2026-08-09 (G-62).
3. **E2E penuh belum ada** (Rv4-13, HIGH) — verifikasi kontrak web↔API belum otomatis
   atas PostgreSQL (PRD 7 §6 #2).
4. **Cache multi-instance** (Rv4-14, MEDIUM) — TTL di memori proses; keputusan ADR +
   jalur Redis dibutuhkan sebelum skala (PRD 7 §6 P1-5).
5. **Angka test belum diverifikasi ulang dari CI** (Rv4-15, MEDIUM) — DoD 2.000+
   test/coverage ≥ 80% baru terukur bila pipeline regenerasi.

### 7.2 Rekomendasi prioritas

1. **Terapkan migrasi & verifikasi angka (hari ini):** `npm run db:migrate` di env
   dengan DB; jalankan verifikasi akhir pipeline oleh tester; catat angka final ke
   README/riview04.
2. **Tutup prasyarat produksi (Sprint 1):** E2E atas PostgreSQL (P1-2), observability
   minimal (P1-6), keputusan cache (P1-5), backup/drill (P3-6), staging hijau (P3-7) —
   seluruh item PRD 7 §6. (Dockerfile P3-5/G-62 sudah tuntas: Dockerfile + overlay PROD
   aktif di `docker-compose.prod.yml`.)
3. **Lanjutkan nilai per role (Sprint 2):** fitur per role batch 1 (PRD 7 §3.1),
   termasuk galeri landing (Rv4-16, P2-9) dan dashboard KAPRODI/AUDITOR berbasis
   permission yang sudah di-seed.
4. **Jaga akurasi klaim:** angka agregat wajib diregenerasi dari CI pada audit
   berikutnya; tandai seluruh angka estimasi secara eksplisit.

---

## 8. Kesimpulan & Verdict

**Verdict: BELUM 100% PRODUCTION-READY.** Seluruh temuan Wave 2 selesai dan tidak
ada temuan CRITICAL baru yang terbuka pada putaran ini, namun prasyarat produksi
PRD 7 §6 sebagian belum hijau (migrasi DB, observability, backup, E2E, staging).
Dockerfile aplikasi (Rv4-10) sudah tersedia sejak 2026-08-09. Verdict naik menjadi
**APPROVE PRODUKSI** hanya bila seluruh prasyarat tersebut tertutup.

| Dimensi                           | Skor (1–10) | Catatan                                                                                                                |
| --------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| Role system & RBAC                | 9,0         | 14 role sinkron (schema/types/seed); fail-closed; migrasi belum dieksekusi (-1 poin)                                   |
| Clean code                        | 8,5         | 98 file refactor; lookup map, batch rollover, import type; sisa utang kecil dipantau                                   |
| Testing                           | 8,0         | 5 suite pra-existing hijau; ±2.000+ estimasi; E2E & verifikasi CI belum ada                                            |
| ISR / Landing                     | 8,5         | Konflik force-dynamic ditutup; ISR 30s efektif seragam                                                                 |
| UI / Dark mode                    | 8,5         | Landing termigrasi token; --color-primary-200 + kontras dark diperbaiki                                                |
| Dokumentasi                       | 8,5         | README/KB/02/03/04/07/indeks sinkron; link putus diperbaiki; riview04 baru                                             |
| Arsitektur / Production readiness | 6,5         | 32 modul, 90 model solid; Dockerfile ada (Rv4-10 ditutup 2026-08-09); observability/backup/staging/E2E masih prasyarat |
| **Skor komposit**                 | **8,3**     | Rata-rata tertimbang dimensi di atas                                                                                   |

Syarat peningkatan ke **APPROVE PRODUKSI**: seluruh prasyarat PRD 7 §6 hijau —
migrasi DB diterapkan (Rv4-02), backup/drill (Rv4-11), observability (Rv4-12), E2E
atas PostgreSQL (Rv4-13), staging (G-67) — dan angka test final terverifikasi dari CI
(Rv4-15). (Rv4-10 Dockerfile sudah ditutup 2026-08-09.)

---

## Lampiran A — Peta Prompt Historis → Status

> Peta ringkas permintaan/prompt pengguna yang pernah diajukan dan statusnya pada
> putaran ini. `SELESAI` = diimplementasi & terverifikasi; `SEBAGIAN` = ada bagian
> yang belum tuntas; `BELUM` = belum dikerjakan. Detail temuan lanjutan di §4.

| #   | Prompt / permintaan historis             | Status   | Catatan / rujukan                                                                                                                                                           |
| --- | ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dark mode UI                             | SELESAI  | Token semantik + kontras dark; `globals.css:93`                                                                                                                             |
| 2   | Dashboard per role                       | SELESAI  | 11 route group + dashboard-config per role (BK/KAPRODI/AUDITOR di `dashboard-config.ts`)                                                                                    |
| 3   | Change log / audit trail                 | SELESAI  | AuditLog + `GET /admin/change-logs`; AUDITOR baru diberi `audit:read:school`                                                                                                |
| 4   | Sanitasi upload                          | SELESAI  | Magic bytes, allowlist mimetype, Content-Length middleware (modul `storage`)                                                                                                |
| 5   | Browser storage                          | SELESAI  | Cache TTL + queue offline ujian via **sessionStorage** (`lib/storage.ts`); scan absensi **belum** punya queue offline di klien (dikoreksi — sebelumnya ditulis IndexedDB)   |
| 6   | WebSocket realtime                       | SELESAI  | Socket.IO `/ws`, Redis adapter, event notifikasi/ujian                                                                                                                      |
| 7   | Server-Sent Events (SSE)                 | BELUM    | Real-time memakai WebSocket; SSE tidak diimplementasikan                                                                                                                    |
| 8   | Path alias `@opensis/*`                  | SELESAI  | `tsconfig.base.json` paths → `./packages/*/src` ([riview02] R-32)                                                                                                           |
| 9   | Landing page                             | SELESAI  | 17 section + 8 berita + ISR 30s; galeri masih placeholder (Rv4-16)                                                                                                          |
| 10  | Clean code pass                          | SELESAI  | 98 file refactor (Wave 2)                                                                                                                                                   |
| 11  | Role KAPRODI / BK / AUDITOR              | SELESAI  | Enum 14 role + permission seed + dashboard config; migrasi belum dieksekusi (Rv4-02)                                                                                        |
| 12  | ID 10 digit (NISN/NPSN/format identitas) | SEBAGIAN | NPSN 8 digit divalidasi (`school_profile.npsn`); NISN unik; penormalan ID 10 digit belum penuh                                                                              |
| 13  | WhatsApp (wa.me link)                    | SEBAGIAN | Link `wa.me` parsial; integrasi WhatsApp resmi tidak ada (tanpa API pihak ketiga — [prd04] §5.O)                                                                            |
| 14  | SPP offline                              | BELUM    | Queue offline fokus ujian/absensi; SPP penuh offline belum (roadmap PWA, [prd05] G-54)                                                                                      |
| 15  | Notifikasi                               | SELESAI  | Notifikasi realtime 5 domain + badge (`notification-events.spec.ts`)                                                                                                        |
| 16  | Metadata SEO                             | SEBAGIAN | Meta/og di layout; audit SEO menyeluruh belum                                                                                                                               |
| 17  | State management                         | SELESAI  | Data fetching via `useApi`/`useAsyncData` (`lib/use-api.ts`); client state via React Context/local; **tanpa** TanStack Query & Zustand (dikoreksi — lihat catatan di bawah) |
| 18  | 2.000+ test                              | SEBAGIAN | Estimasi ±2.000+ (API ±1.900 + web 94); verifikasi akhir pipeline dijalankan paralel (Rv4-15)                                                                               |
| 19  | Rebranding openlms → opensis             | SELESAI  | Prefix `opensis`; referensi `openlms` historis di docs lama dipertahankan per README                                                                                        |
| 20  | Dokumen review berkala (riview04 ini)    | SELESAI  | `docs/riview/riview04.md`                                                                                                                                                   |
| 21  | PRD 7 development v3                     | SELESAI  | `docs/prd/prd07.md` (sebelumnya dirujuk sebagai `prd07-development-v3.md`)                                                                                                  |

> **Catatan koreksi (2026-08-09, sinkronisasi dokumentasi):** temuan Rv4-345 (baris 5)
> dan Rv4-357 (baris 17) di atas **telah dikoreksi**. Implementasi nyata memakai hook
> `useApi`/`useAsyncData` + React Context (`apps/web/src/lib/use-api.ts`) dan queue
> offline ujian via **sessionStorage** (`apps/web/src/lib/storage.ts`, key
> `opensis_exam_pending_answers`) — **bukan** TanStack Query, Zustand, maupun
> IndexedDB; scan absensi **belum** punya queue offline di klien (tanpa Service Worker /
> background sync).

---

_End of document — Riview 04, opensis, 8 Agustus 2026._
