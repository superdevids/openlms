# README.database.md — Paket Database (packages/database)

## Fungsi Folder

Paket bersama **Prisma + PostgreSQL** untuk seluruh opensis: skema tunggal
(single-school), client singleton, migrasi, seed, dan RLS opsional. Satu-satunya
tempat yang boleh berisi skema/query database; aplikasi lain tidak query Prisma
langsung kecuali `apps/api`.

## Struktur Folder

| Path                   | Isi                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma` | Skema Prisma (**92 model + 65 enum** — verifikasi 2026-08-16; akademik, LMS, rapor, PDP, keuangan, payroll, aset, RBAC, branding, landing, dsb.)            |
| `prisma/migrations/`   | Migrasi database (**16**; terbaru `20260816030000_add_pdp_module` — tabel `pdp_request` + enum `PdpRequestType`/`PdpRequestStatus` + `ExportType.PERSONAL`) |
| `prisma/seed.ts`       | Seed dev idempotent (admin, role, permission, prodi, ekstrakurikuler 8, prestasi 5, user `siswa1`, dsb.)                                                    |
| `prisma/rls/`          | Skrip RLS PostgreSQL **opsional** (defense-in-depth)                                                                                                        |
| `prisma/seed-data/`    | Data seed (permission, kurikulum, dsb.)                                                                                                                     |
| `prisma.config.ts`     | Konfigurasi Prisma (dotenv)                                                                                                                                 |
| `src/index.ts`         | `PrismaClient` singleton (`globalThis.opensisPrisma`)                                                                                                       |

## Perintah

| Perintah                    | Fungsi                             |
| --------------------------- | ---------------------------------- |
| `npm run db:generate`       | Generate Prisma client             |
| `npm run db:migrate`        | Migrasi dev (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | Migrasi production                 |
| `npm run db:seed`           | Seed idempotent                    |
| `npm run db:validate`       | Validasi skema                     |
| `npm run db:studio`         | Prisma Studio                      |

## Konvensi

- `id String @id @default(cuid())`; `created_at`/`updated_at` DateTime.
- Enum dipakai dari `@prisma/client` (API) dan `@opensis/types` (web).
- `DATABASE_URL` dari env (root `.env` atau `packages/database/.env`).
- Client singleton: dev memakai `globalThis` agar tidak bocor koneksi (hot reload).

## Catatan Migrasi & Seed Terbaru

- **Migrasi** (16, verifikasi 2026-08-16), terbaru → terlama:
  - `20260816030000_add_pdp_module` — modul PDP (UU PDP): tabel `pdp_request`
    (permintaan hapus/ekspor data pribadi; index `(user_id, status)` non-unique —
    dedupe di service), enum `PdpRequestType` (`DELETE`/`EXPORT`) +
    `PdpRequestStatus` (`PENDING`/`APPROVED`/`REJECTED`/`EXECUTED`), nilai
    `PERSONAL` pada enum `ExportType`.
  - `20260816020000_add_rapor_p5` — tabel `rapor_p5` (track proyek P5 manual,
    G-49 e-Rapor v1): unique `(student_id, semester, academic_year, project_name)`;
    komputasi nilai mapel tetap on-the-fly dari `grade`.
  - `20260816010000_payment_idempotency` — `Payment.idempotency_key` (TEXT,
    unique) + `Payment.allocations` (JSONB): idempotensi pencatatan pembayaran
    (replay `Idempotency-Key` klien aman; alokasi lintas invoice disimpan utuh).
  - `20260816000000_staff_ter_category` — kolom `Staff.ter_category` (TEXT,
    default `'A'`): kategori TER PPh21 bulanan PMK 168/2023 per pegawai (nilai
    bracket perlu review pajak sebelum produksi).
  - `20260810000000_parent_link_approval` — kolom `status ParentLinkStatus`
    (PENDING/APPROVED/REJECTED, default PENDING) pada `parent_student_link`
    untuk alur persetujuan tautan wali murid-anak oleh OPERATOR (Rv5-17;
    endpoint approve/reject di `apps/api/src/modules/parent-portal`).
  - Sebelumnya: `20260809000000_audit_fixes` menambah unique `invoice(student_id, type, period)`
    (anti tagihan SPP ganda) + index hot-path exam + unique `exam_attempt(exam_session_id, token_used)`;
    `20260808235959_exam_attempt_token_dedupe` (folder **di-rename dari
    `20260809010000`**) membersihkan duplikat token historis sebelum unique index
    (keep id terkecil, sisanya `EXPIRED`). Keduanya additif/idempotent.
  - **Model**: 90 → **92** (tambah `RaporP5`, lalu `PdpRequest` di Wave 2);
    **enum 63 → 65** (tambah `PdpRequestType`, `PdpRequestStatus`; nilai
    `PERSONAL` pada `ExportType`). **Permission seed 141 → 146**
    (`rapor:p5:write:class`, `rapor:p5:write:school`, `rapor:write:school`,
    lalu `pdp:data:self`, `pdp:export:self`, `pdp:delete-request:self`,
    `pdp:review:school`, `report:export:self`).
- **Seed** (`npm run db:seed`): selain SUPERADMIN/role/permission, kini juga 8 ekstrakurikuler
  (Basket, Futsal, Pramuka, Paskibra, Rohis, PMR, Seni Tari, Robotik), 5 prestasi (achievement),
  dan user demo **`siswa1`** (password dev `"password"`, role SISWA ACTIVE) — dipakai endpoint `/public/*`.
