# README.docs.md — Dokumentasi (docs/)

## Fungsi Folder

Dokumentasi produk & teknis openlms: PRD, arsitektur, ERD, kontrak API, rencana
implementasi, riset, dan desain UX. Dokumen teknis (`02`, `03`, `04`) adalah
acuan implementasi; update saat ada keputusan arsitektur (ADR).

## Indeks Dokumen

| File                           | Isi                                                                        |
| ------------------------------ | -------------------------------------------------------------------------- |
| `01-master-prd.md`             | Master PRD (gabungan)                                                      |
| `02-technical-architecture.md` | Arsitektur teknis (modul, lapisan, RBAC, storage lokal, real-time, backup) |
| `03-database-erd.md`           | ERD & skema database                                                       |
| `04-api-contract.md`           | Kontrak API (format error, endpoint)                                       |
| `05-implementation-plan.md`    | Rencana implementasi bertahap (F0–F2)                                      |
| `06-research-validations.md`   | Riset & validasi keputusan                                                 |
| `07-ux-design.md`              | Desain UX                                                                  |
| `note.md`                      | Catatan tim                                                                |
| `prd/`                         | Dokumen PRD terpisah (`prd04.md`, dsb.)                                    |
| `riview/`                      | Laporan review berkala                                                     |

## Dokumen Lain yang Relevan

| Path                                           | Isi                              |
| ---------------------------------------------- | -------------------------------- |
| `README.md` (root)                             | Ikhtisar repo, quick start, env  |
| `deploy/README.deploy.md`                      | Deployment & Nginx               |
| `apps/api/src/README.api-src.md`               | Struktur & daftar modul API      |
| `apps/api/src/modules/*/README.<modul>.md`     | Kontrak endpoint per modul       |
| `apps/web/src/README.web.md` / `README.app.md` | Struktur frontend & route groups |
| `packages/database/README.database.md`         | Skema, migrasi, seed, RLS        |
