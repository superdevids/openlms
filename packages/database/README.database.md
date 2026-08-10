# README.database.md — Paket Database (packages/database)

## Fungsi Folder

Paket bersama **Prisma + PostgreSQL** untuk seluruh opensis: skema tunggal
(single-school), client singleton, migrasi, seed, dan RLS opsional. Satu-satunya
tempat yang boleh berisi skema/query database; aplikasi lain tidak query Prisma
langsung kecuali `apps/api`.

## Struktur Folder

| Path                   | Isi                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma` | Skema Prisma (**90 model + 62 enum**: akademik, LMS, keuangan, payroll, aset, RBAC, branding, landing, dsb.)   |
| `prisma/migrations/`   | Migrasi database (11 batch; terbaru `20260809000000_audit_fixes` & `20260809010000_exam_attempt_token_dedupe`) |
| `prisma/seed.ts`       | Seed dev idempotent (admin, role, permission, prodi, ekstrakurikuler 8, prestasi 5, user `siswa1`, dsb.)       |
| `prisma/rls/`          | Skrip RLS PostgreSQL **opsional** (defense-in-depth)                                                           |
| `prisma/seed-data/`    | Data seed (permission, kurikulum, dsb.)                                                                        |
| `prisma.config.ts`     | Konfigurasi Prisma (dotenv)                                                                                    |
| `src/index.ts`         | `PrismaClient` singleton (`globalThis.opensisPrisma`)                                                          |

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

- **Migrasi** (11): `20260809000000_audit_fixes` menambah unique `invoice(student_id, type, period)`
  (anti tagihan SPP ganda) + index hot-path exam + unique `exam_attempt(exam_session_id, token_used)`;
  `20260809010000_exam_attempt_token_dedupe` membersihkan duplikat token historis sebelum unique index
  (keep id terkecil, sisanya `EXPIRED`). Keduanya additif/idempotent.
- **Seed** (`npm run db:seed`): selain SUPERADMIN/role/permission, kini juga 8 ekstrakurikuler
  (Basket, Futsal, Pramuka, Paskibra, Rohis, PMR, Seni Tari, Robotik), 5 prestasi (achievement),
  dan user demo **`siswa1`** (password dev `"password"`, role SISWA ACTIVE) — dipakai endpoint `/public/*`.
