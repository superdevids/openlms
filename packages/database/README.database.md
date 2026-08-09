# README.database.md — Paket Database (packages/database)

## Fungsi Folder

Paket bersama **Prisma + PostgreSQL** untuk seluruh opensis: skema tunggal
(single-school), client singleton, migrasi, seed, dan RLS opsional. Satu-satunya
tempat yang boleh berisi skema/query database; aplikasi lain tidak query Prisma
langsung kecuali `apps/api`.

## Struktur Folder

| Path                   | Isi                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `prisma/schema.prisma` | Skema Prisma (**90 model + 62 enum**: akademik, LMS, keuangan, payroll, aset, RBAC, branding, landing, dsb.) |
| `prisma/migrations/`   | Migrasi database (6 batch)                                                                                   |
| `prisma/seed.ts`       | Seed dev idempotent (admin, role, permission, prodi, dsb.)                                                   |
| `prisma/rls/`          | Skrip RLS PostgreSQL **opsional** (defense-in-depth)                                                         |
| `prisma/seed-data/`    | Data seed (permission, kurikulum, dsb.)                                                                      |
| `prisma.config.ts`     | Konfigurasi Prisma (dotenv)                                                                                  |
| `src/index.ts`         | `PrismaClient` singleton (`globalThis.opensisPrisma`)                                                        |

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
