-- Parent link approval — allowlist OPERATOR (Rv5-17 / SEC-001 lanjutan).
-- ---------------------------------------------------------------------
-- Tautan wali murid-anak kini berstatus PENDING/APPROVED/REJECTED:
--   - linkChild (WALI_MURID) membuat PENDING;
--   - OPERATOR/SUPERADMIN approve/reject lewat endpoint
--     POST /parent-portal/links/:id/approve | /reject;
--   - WALI_MURID HANYA membaca data anak bila tautannya APPROVED.
--
-- Langkah (additif, idempotent per skema):
--   1. Enum ParentLinkStatus — nama type mengikuti konvensi Prisma
--      (tanpa @@map, jadi type PostgreSQL = "ParentLinkStatus").
--   2. Kolom status NOT NULL default PENDING.
--   3. Backfill: seluruh tautan yang ADA SEBELUM fitur ini dianggap APPROVED
--      (grandfather) agar akses wali yang sudah berjalan tidak terputus.
-- ---------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "ParentLinkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "parent_student_link" ADD COLUMN "status" "ParentLinkStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill grandfather: tautan existing = APPROVED
UPDATE "parent_student_link" SET "status" = 'APPROVED';
