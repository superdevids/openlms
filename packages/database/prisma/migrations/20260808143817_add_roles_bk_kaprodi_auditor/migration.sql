-- Non-destructive migration: sinkronisasi enum "Role" dengan prisma/schema.prisma.
--   1. RENAME VALUE 'GURU_BK' -> 'BK' (rename aman, data existing ikut terpetakan).
--   2. ADD VALUE 'KAPRODI' (role baru: ketua program keahlian).
--   3. ADD VALUE 'AUDITOR' (role baru: audit internal).
-- Catatan: ALTER TYPE ... ADD VALUE tidak dapat memakai nilai baru dalam transaksi yang
--   sama; karena migrasi ini hanya berisi statement ALTER TYPE, aman dalam satu transaksi.
-- Terapkan via `npm run db:migrate` (dev) atau `npm run db:migrate:deploy` (produksi).

ALTER TYPE "Role" RENAME VALUE 'GURU_BK' TO 'BK';

ALTER TYPE "Role" ADD VALUE 'KAPRODI';

ALTER TYPE "Role" ADD VALUE 'AUDITOR';
