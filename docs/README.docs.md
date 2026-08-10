# Indeks Dokumentasi opensis

Halaman ini adalah **pintu masuk** seluruh dokumentasi repository `opensis`.
Dokumentasi produk & teknis disimpan di folder `docs/`, dokumentasi pengguna
dan kontributor di root repository.

## Dokumen Utama (root)

| File                                        | Isi                                                               |
| ------------------------------------------- | ----------------------------------------------------------------- |
| [README.md](../README.md)                   | Ikhtisar proyek, fitur, quick start, arsitektur, role, deployment |
| [CONTRIBUTING.md](../CONTRIBUTING.md)       | Panduan berkontribusi: branching, commit, standar kode, review    |
| [SECURITY.md](../SECURITY.md)               | Kebijakan keamanan & cara melaporkan kerentanan                   |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Kode etik kontributor (Contributor Covenant 2.1)                  |
| [CHANGELOG.md](../CHANGELOG.md)             | Riwayat perubahan versi (Keep a Changelog)                        |
| [LICENSE](../LICENSE)                       | Lisensi MIT                                                       |

## Dokumen Teknis (docs/)

| File                           | Isi                                                                           | Status       |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------ |
| `01-master-prd.md`             | Master PRD (gabungan)                                                         | Final        |
| `02-technical-architecture.md` | Arsitektur teknis — modul, lapisan, RBAC, storage lokal, real-time, ADR       | Final (v1.1) |
| `03-database-erd.md`           | ERD & skema database                                                          | Final        |
| `04-api-contract.md`           | Kontrak API — format error, endpoint, RBAC matrix                             | Final        |
| `05-implementation-plan.md`    | Rencana implementasi bertahap (F0–F2)                                         | Final        |
| `06-research-validations.md`   | Riset & validasi keputusan (UU PDP, Dapodik, Kurikulum Merdeka, PPh 21, dll.) | Final        |
| `07-ux-design.md`              | Spesifikasi UX/UI                                                             | Final        |
| `08-knowledge-base.md`         | Basis pengetahuan tim (keputusan, pola, pelajaran lintas iterasi)             | Final        |
| `landing-design-v2.md`         | Design system Landing v2 — 10 halaman mandiri, 21 SVG playful, token          | Final        |
| `app-design-system-v3.md`      | Design system FE aplikasi v3 — AppShell v2, `components/ui` 12 ekspor, token  | Final        |

## PRD (docs/prd/)

| File       | Isi                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `prd01.md` | Fondasi SaaS LMS+SIS (9 role, 7 modul) — **[v1]**                                                     |
| `prd02.md` | Fase 2: ujian online, absensi online — **[v2]**                                                       |
| `prd03.md` | Audit 24 gap G1–G24 + prioritisasi — **[v3]**                                                         |
| `prd04.md` | **PRD flagship** (v4.2) — super-app single-school, 12 role, RBAC penuh, modul lengkap                 |
| `prd05.md` | **PRD development** — penutupan gap audit (G-01…G-67), roadmap 3 sprint, DoD terukur                  |
| `prd06.md` | **PRD development v2** — personalisasi (font/ukuran), performa, notifikasi, roadmap                   |
| `prd07.md` | **PRD development v3** — lanjutan gelombang perbaikan, fitur per role (60+ usulan), kesiapan produksi |

## Review (docs/riview/)

| File          | Isi                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `riview01.md` | Laporan review berkala 2026-08-07                                                                                                                     |
| `riview02.md` | Laporan review berkala 2026-08-07 (putaran 2)                                                                                                         |
| `riview03.md` | Laporan review berkala 2026-08-08 (putaran 3 — setelah gelombang perbaikan)                                                                           |
| `riview04.md` | Laporan review berkala 2026-08-08 (putaran 4 — role system, clean code, test stability, ISR/landing, dark mode, dokumentasi)                          |
| `riview05.md` | Laporan review berkala 2026-08-10 (putaran 5 — Landing v2, FE App v3, public-content & metrics, keamanan/reliability, migrasi DB, backup/staging/E2E) |

## Dokumentasi Per Komponen

| Path                                            | Isi                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `deploy/README.deploy.md`                       | Deployment & Nginx                                                                                                                                                                                                                                                                                                                                                                   |
| `apps/api/README.md`                            | Ikhtisar aplikasi API                                                                                                                                                                                                                                                                                                                                                                |
| `apps/api/src/README.api-src.md`                | Struktur & daftar modul API                                                                                                                                                                                                                                                                                                                                                          |
| `apps/api/src/common/README.common.md`          | Guard, middleware, interceptor, filter                                                                                                                                                                                                                                                                                                                                               |
| `apps/api/src/modules/*/README.<modul>.md`      | Kontrak endpoint per modul (auth, lms, quiz, exam, attendance, finance, payroll, asset, ppdb, parent-portal, smk, rollover, alumni, branding, landing, onboarding, maintenance, notifications, communication, rbac-admin, realtime, storage, feature-flags, app-settings, academic, health, queue, jobs, users-admin, dashboard-config, audit, admin-stats, public-content, metrics) |
| `apps/api/src/modules/*/README.registration.md` | Kontrak registrasi modul                                                                                                                                                                                                                                                                                                                                                             |
| `apps/web/src/README.web.md`                    | Struktur frontend                                                                                                                                                                                                                                                                                                                                                                    |
| `apps/web/src/app/README.app.md`                | Route groups & halaman                                                                                                                                                                                                                                                                                                                                                               |
| `apps/web/src/components/README.components.md`  | Komponen shared web                                                                                                                                                                                                                                                                                                                                                                  |
| `packages/database/README.database.md`          | Skema, migrasi, seed, RLS                                                                                                                                                                                                                                                                                                                                                            |
| `packages/ui/README.ui.md`                      | Komponen UI shared                                                                                                                                                                                                                                                                                                                                                                   |
| `packages/types/README.types.md`                | Tipe bersama                                                                                                                                                                                                                                                                                                                                                                         |

## Konvensi Dokumentasi

- **Bahasa**: Bahasa Indonesia (formal) untuk semua konten user-facing; Inggris
  untuk file konvensi OSS (LICENSE, CODE_OF_CONDUCT).
- **Akurasi**: setiap klaim teknis wajib sesuai implementasi nyata; bagian yang
  belum terverifikasi ditandai eksplisit.
- **Perbaruan**: dokumen teknis (`02`, `03`, `04`) adalah acuan implementasi —
  perbarui saat ada keputusan arsitektur (ADR) atau kontrak yang berubah.
- **Modul baru**: setiap modul di `apps/api/src/modules/` wajib memiliki
  `README.<modul>.md` yang memuat daftar endpoint, permission, dan deskripsi.
