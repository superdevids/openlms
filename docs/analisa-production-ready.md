# Analisa % Production Ready — opensis

**Tanggal:** 2026-08-18
**Sumber verifikasi:** source code (komit terkini), `.github/workflows/ci.yml`, `docs/runbook-produksi.md §9`, `docs/08-knowledge-base.md §7`, `docs/riview/riview05.md` (Addendum 1–5).
**Metodologi:** skor 0–100 per dimensi dengan bukti file:line; bobot: **fungsional 25, keamanan 20, data/compliance 15, ops/infra 15, testing/CI 10, UI/UX 10, dokumentasi 5** (total 100). Angka test adalah catatan eksekusi orkestrator (~2.412 API/118 suite, 109 web) — bukan hasil regenerasi CI hari ini (Rv5-14).

---

## 1. Ringkasan (BLUF)

Skor keseluruhan **~82% PRODUCTION READY** — aplikasi **SIAP BERSYARAT**: produk fungsional lengkap & diuji (37 modul API, multi-role, e-Rapor v2, PDP, Dapodik v1), keamanan lapis dasar kuat, namun **9 item go-live checklist masih terbuka** — terutama **migrasi baseline squashed belum di-apply di env produksi**, staging belum live, drill backup belum, coverage ≥ 80% belum, dan review pajak TER/BPJS belum. Tidak ada blocker fungsional; blocker adalah prasyarat operasional/compliance.

## 2. Skor per Dimensi

| #   | Dimensi           | Bobot   | Skor | % (bobot × skor) | Verdict                                          |
| --- | ----------------- | ------- | ---- | ---------------- | ------------------------------------------------ |
| 1   | Fungsional        | 25      | 90   | 22,5             | Sangat baik — lengkap, sisa roadmap kecil        |
| 2   | Keamanan          | 20      | 85   | 17,0             | Baik — lapis dasar kuat, sisa hardening opsional |
| 3   | Data & Compliance | 15      | 78   | 11,7             | Baik — PDP aktif; review pajak & DPIA tersisa    |
| 4   | Ops/Infra         | 15      | 62   | 9,3              | Cukup — blocker utama go-live di sini            |
| 5   | Testing/CI        | 10      | 80   | 8,0              | Baik — volume tinggi; coverage 80% belum         |
| 6   | UI/UX             | 10      | 92   | 9,2              | Sangat baik — design system v3 + landing v2      |
| 7   | Dokumentasi       | 5       | 90   | 4,5              | Sangat baik — komprehensif & sinkron             |
|     | **Total**         | **100** |      | **82,2 ≈ 82%**   | **SIAP BERSYARAT**                               |

## 3. Rincian per Dimensi

### 3.1 Fungsional — 90/100 (bukti)

| Aspek                                                                                                                                   | Status | Bukti                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| 37 modul API (auth, lms, quiz, exam, rapor, pdp, finance, payroll, asset, ppdb, attendance, smk, parent-portal, rollover, export, dll.) | ✓      | `apps/api/src/modules/` (37 dir README modul), `docs/02 §4.1`                                                   |
| Multi-role switcher (rangkap role; peran aktif UI, izin union backend)                                                                  | ✓      | `apps/web/src/lib/active-role.ts:16`, `roles.ts:52-67`, `app-shell.tsx:390`, seed `kepsek1` (`seed.ts:221-255`) |
| Optimasi N+1 (rollover batch, asset, payslip, finance, PDP, import chunk, pagination)                                                   | ✓      | `rollover.service.ts:503-712`, `pdp-anonymize.service.ts:66-110`, `import.service.ts:65,221-283`                |
| e-Rapor v2 (PDF per siswa) — approval KEPSEK (v2.1) **belum**                                                                           | ⚠️     | `rapor-pdf.ts`, roadmap prd05 G-49                                                                              |
| Dapodik v1 (3 CSV) — kolom `nisn/nik/nuptk` (v1.1) **belum**                                                                            | ⚠️     | `dapodik-export.service.ts`, gap dokumentasi v1.1                                                               |
| Landing 10 halaman + berita + JSON-LD + OG + gambar asli                                                                                | ✓      | `app/page.tsx:268-296`, `layout.tsx:66`, `public/landing/school/*.jpg`                                          |

### 3.2 Keamanan — 85/100 (bukti)

| Aspek                                                                                           | Status | Bukti                                                             |
| ----------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| Auth in-house: login username NIS/NIP, Argon2id, JWT httpOnly, refresh rotation                 | ✓      | `auth.service.ts:100-112`, `jwt.util.ts`, `cookie.util.ts`        |
| RBAC fail-closed (AuthGuard → PermissionsGuard → FeatureFlagGuard), scope SENDIRI/KELAS/SEKOLAH | ✓      | `apps/api/src/common/`, `permissions.guard.ts`                    |
| JWT canonical signature + `timingSafeEqual`                                                     | ✓      | `jwt.util.ts:88-96` (riview05 SEC-001)                            |
| Brute-force lockout (5 gagal/15 mnt) + rate limit Nginx & app                                   | ✓      | `auth.constants.ts`, `deploy/nginx.conf:10-12`                    |
| Redis wajib password, port prod hanya 127.0.0.1, gate DEMO_MODE                                 | ✓      | `docker-compose.prod.yml:37,30-64,111`, `main.ts:31`              |
| Anti-IDOR (jurnal PKL, booking aset, payslip, PDP)                                              | ✓      | `internship.service.ts:199`, `asset-booking.service.ts:178-185`   |
| Audit trail + secret scan CI (gitleaks)                                                         | ✓      | `audit-log.service.ts`, ci.yml job `secrets`                      |
| **CSP script nonce**                                                                            | ⚠️     | `script-src 'unsafe-inline'` — roadmap (runbook §9 no.16)         |
| **RLS PostgreSQL** (opsional)                                                                   | ⚠️     | Belum diaktifkan — defense-in-depth tambahan (docs/03 §7)         |
| **Ganti password seed dev** sebelum go-live                                                     | ⚠️     | `admin/password`, `siswa1`, `kepsek1` — dev only (ci.yml:172-175) |

### 3.3 Data & Compliance — 78/100 (bukti)

| Aspek                                                               | Status | Bukti                                                                 |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| Modul PDP UU PDP: akses/ekspor/hapus, consent, retensi, anonimisasi | ✓      | `pdp.service.ts`, `pdp-anonymize.service.ts`, `retention-policies.ts` |
| PPh 21 TER (PMK 168/2023) + BPJS — **review pajak belum**           | ⚠️     | `payroll/calculator/tax.spec.ts`, `bpjs.spec.ts`; runbook §9 no.15    |
| Dapodik v1 best-effort (gap kolom NISN/NIK/NUPTK)                   | ⚠️     | `dapodik-export.service.ts`                                           |
| Single-school (tanpa multi-tenant) — RLS opsional                   | ✓      | ADR-001, docs/02 §2                                                   |
| DPIA / DPO / kontrak pemrosesan (formal) **belum**                  | ⚠️     | roadmap prd04 §6                                                      |

### 3.4 Ops/Infra — 62/100 (bukti) — _blocker utama_

| Aspek                                                      | Status     | Bukti                                                                                                                                                                                             |
| ---------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker Compose PROD full-stack (5 service) + Nginx/TLS     | ✓          | `docker-compose.prod.yml`, `deploy/nginx*.conf`, `deploy/README.deploy.md`                                                                                                                        |
| Backup/restore script + retensi 14 hari                    | ✓          | `deploy/scripts/backup.sh`, `restore.sh`, `deploy/BACKUP.md`                                                                                                                                      |
| **Migrate deploy prod — BASELINE SQUASHED BELUM DI-APPLY** | ❌ BLOCKER | `packages/database/prisma/migrations/20260818000000_init_squashed` — hanya dev di-reset & seed; env prod dengan data lama butuh strategi `migrate resolve`/rebuild (docs/03, riview05 Addendum 5) |
| **Staging live & terverifikasi**                           | ❌ BLOCKER | `docker-compose.staging.yml` ada, belum live (runbook §9 no.12)                                                                                                                                   |
| **Drill backup pertama**                                   | ❌ BLOCKER | runbook §9 no.11                                                                                                                                                                                  |
| **Observability alerting** (metrik dasar ada)              | ❌ BLOCKER | `GET /metrics` ada (`metrics.controller.ts`); slow query & alerting belum (runbook §9 no.14)                                                                                                      |
| Healthcheck + smoke test                                   | ✓          | `health.controller.ts`, runbook §10                                                                                                                                                               |

### 3.5 Testing/CI — 80/100 (bukti)

| Aspek                                                                                              | Status | Bukti                                                                                                     |
| -------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| API ~2.412 test (118 suite) + integration + e2e — catatan eksekusi 2026-08-18                      | ✓*     | 124+ file spec (`apps/api/src/**/*.spec.ts` + `apps/api/test/**`); *angka menunggu regenerasi CI (Rv5-14) |
| Web 109 test (Vitest, 11 file)                                                                     | ✓*     | `apps/web/src/lib/__tests__/` (10) + `e2e/smoke.spec.ts`                                                  |
| CI 10 job (lint, prettier, typecheck, unit, web-test, integration, web-e2e, build, audit, secrets) | ✓      | `.github/workflows/ci.yml`                                                                                |
| E2E Playwright di CI                                                                               | ✓      | ci.yml job `web-e2e`                                                                                      |
| Gate coverage API (floor) aktif; **target ≥ 80% belum**                                            | ⚠️     | ci.yml:60-68, jest.config.js coverageThreshold; runbook §9 no.13                                          |
| Web coverage floor 0 (target 80% roadmap)                                                          | ⚠️     | `apps/web/vitest.config.ts`                                                                               |

### 3.6 UI/UX — 92/100 (bukti)

| Aspek                                                             | Status | Bukti                                                        |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| App Design System v3 (AppShell v2, 12 komponen, 53+ halaman role) | ✓      | `apps/web/src/components/ui/index.ts`, `app-shell.tsx`       |
| Landing v2 + gambar asli JPG + JSON-LD + OG + anti-CLS + tagline  | ✓      | `app/page.tsx`, `layout.tsx:51-66`, `public/landing/school/` |
| Multi-role UX (dropdown "Ganti peran", peran aktif per navigasi)  | ✓      | `app-shell.tsx:390`, `active-role.ts`                        |
| Shadow token + dark mode + a11y dasar                             | ✓      | `globals.css:334-336,457-459`                                |
| Screenshots dokumentasi masih TODO                                | ⚠️     | `README.md` Tangkapan Layar                                  |

### 3.7 Dokumentasi — 90/100 (bukti)

| Aspek                                                   | Status | Bukti                                                 |
| ------------------------------------------------------- | ------ | ----------------------------------------------------- |
| README, docs 01–10, runbook, deploy, BACKUP, staging    | ✓      | `docs/README.docs.md` (indeks lengkap)                |
| README modul per modul (auth, rapor, pdp, export, dll.) | ✓      | `apps/api/src/modules/*/README.*.md`                  |
| Review berkala riview01–05 + Addendum 1–5               | ✓      | `docs/riview/`                                        |
| Beberapa README modul masih bertanda historis           | ⚠️     | `README.registration.md` (banner STATUS: IMPLEMENTED) |

## 4. BLOCKER Sebelum Go-Live (dari runbook §9 + Addendum)

| #   | Blocker                                                                                                 | Dampak                                                                              | Aksi                                                                             |
| --- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | **Migrate deploy prod** — baseline `20260818000000_init_squashed` belum di-apply di env prod (baru dev) | DB prod tidak punya skema final; env dengan data lama butuh strategi migrasi khusus | Bootstrap prod (backup → `prisma migrate resolve`/rebuild) + smoke (runbook §10) |
| 2   | **Staging live**                                                                                        | Tidak ada verifikasi pre-prod di env terisolasi                                     | Up overlay staging, jalankan smoke + E2E                                         |
| 3   | **Drill backup** (RPO ≤ 24 jam / RTO ≤ 4 jam belum diverifikasi)                                        | Risiko kehilangan data belum teruji                                                 | Eksekusi `backup.sh` + restore test + log drill (BACKUP.md §4)                   |
| 4   | **Review pajak TER/BPJS**                                                                               | Nilai bracket PMK 168/2023 & BPJS belum diverifikasi pajak                          | Review dengan konsultan pajak sebelum payroll riil                               |
| 5   | **Coverage ≥ 80%**                                                                                      | Gate coverage belum mencapai target                                                 | Naikkan threshold bertahap; tutup gap area kritikal                              |
| 6   | **Observability/alerting**                                                                              | Tidak ada alert dini (slow query, error rate)                                       | Integrasi Prometheus/Grafana atau minimal alerting log                           |
| 7   | **CSP nonce**                                                                                           | `script-src 'unsafe-inline'`                                                        | Implementasi nonce untuk script di Next.js                                       |
| 8   | **RLS opsional**                                                                                        | Defense-in-depth DB belum aktif                                                     | Aktifkan policy RLS minimal untuk tabel sensitif                                 |
| 9   | **Ganti password seed dev**                                                                             | `admin/password`, `siswa1`, `kepsek1` adalah dev-only                               | Reset password semua user seed sebelum go-live                                   |

## 5. Catatan Verifikasi Angka (2026-08-18)

| Klaim                                                                   | Status verifikasi                                                                                                                                                                      | Bukti                                                                                                               |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 92 model / 65 enum                                                      | ✅ Terverifikasi (grep `^model `/`^enum `)                                                                                                                                             | `schema.prisma` — 92 model, 65 enum                                                                                 |
| 136 index (85 CREATE INDEX + 51 CREATE UNIQUE INDEX)                    | ✅ Terverifikasi (grep `CREATE INDEX` pada baseline migrasi)                                                                                                                           | `20260818000000_init_squashed/migration.sql` — 136 `CREATE INDEX` (51 `UNIQUE`); `schema.prisma` punya 85 `@@index` |
| 133 relasi/FK                                                           | ⚠️ Sebagian — total `@relation` > 100 terkonfirmasi; hitungan presisi tidak dapat dijalankan hari ini (shell dibatasi)                                                                 | `schema.prisma` (grep terpotong > 100)                                                                              |
| Migrasi baseline tunggal                                                | ✅ Terverifikasi                                                                                                                                                                       | `packages/database/prisma/migrations/` — hanya `20260818000000_init_squashed` + `migration_lock.toml`               |
| Multi-role (localStorage `opensis_active_role`, union roles, `kepsek1`) | ✅ Terverifikasi                                                                                                                                                                       | `active-role.ts:16`, `roles.ts:52-67`, `app-shell.tsx:390`, `seed.ts:221-255`                                       |
| Login username (NIS/NIP)                                                | ✅ Terverifikasi                                                                                                                                                                       | `login.dto.ts`, `auth.service.ts:100-112`, test `dto-auth.spec.ts`                                                  |
| 4 index baru PERF-02                                                    | ✅ Terverifikasi                                                                                                                                                                       | `Grade(academic_year)`, `Invoice(status)`, `Enrollment(academic_year_id)`, `Attendance(status)`                     |
| Optimasi N+1 batch                                                      | ✅ Terverifikasi                                                                                                                                                                       | `rollover.service.ts:503-712`, `pdp-anonymize.service.ts:66-110`, `import.service.ts:65,221-283`, dll.              |
| UI v2 (JPG, JSON-LD, OG, tagline, shadow token)                         | ✅ Terverifikasi                                                                                                                                                                       | `public/landing/school/*.jpg` (5 file), `page.tsx:268-296`, `layout.tsx:66`, `globals.css:334-336`                  |
| Dead code cleanup                                                       | ✅ Terverifikasi — `galeri-section.tsx`/`login_*.txt`/deps/seed-data/ekspor FormPage terkonfirmasi hapus; **`api-dev.log` di root sudah dihapus 2026-08-18** (`*.log` di `.gitignore`) | `apps/web/src/components/landing/` (hanya `galeri-grid.tsx`); root tanpa `api-dev.log`                              |
| Test API ~2.412 / 118 suite; web 109                                    | ⚠️ Catatan eksekusi (per tugas); file spec terkonfirmasi 124+ (71 `src` + 49 `test/unit` + 3 `integration` + 1 `e2e`); **regenerasi CI wajib (Rv5-14)**                                | glob `apps/api/**/*.spec.ts`                                                                                        |
| CI 10 job                                                               | ✅ Terverifikasi                                                                                                                                                                       | `.github/workflows/ci.yml` — lint, prettier, typecheck, unit, web-test, integration, web-e2e, build, audit, secrets |

## 6. Kesimpulan

**Verdict: SIAP BERSYARAT (~82%).**

- **Tidak ada blocker fungsional/kualitas kode** — produk lengkap, diuji (2.400+ test), arsitektur rapi (92 model, multi-role, N+1 tuntas), keamanan lapis dasar solid.
- **Blocker 100% berada di ranah operasional/compliance** (item 1–9 di atas). Setelah 9 item ditutup, skor diproyeksikan naik ke **≥ 92% (SIAP)**.
- Estimasi pengerjaan blocker: 1–2 sprint tergantung ketersediaan env staging & review pajak eksternal.

---

_Referensi: [runbook-produksi.md](runbook-produksi.md) §9, [riview05.md](riview/riview05.md) Addendum 5, [08-knowledge-base.md](08-knowledge-base.md) §7._
