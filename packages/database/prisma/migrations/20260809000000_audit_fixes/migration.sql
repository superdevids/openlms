-- Audit fixes 2026-08-09 (REL-003, PERF-01, PERF-05, PERF-04).
--
-- REL-003: unique (student_id, type, period) pada invoice — anti double-fire
--   tagihan SPP bila scheduler dijalankan ulang / paralel. Langkah:
--   1. Dedupe data existing: tandai duplikat (sisanya) CANCELLED, keep satu
--      per (student_id, type, period). Yang dipilih: baris dengan pembayaran
--      PAID lebih dulu, lalu created_at/id terkecil.
--   2. CREATE UNIQUE INDEX (nama sesuai konvensi Prisma agar tidak drift).
-- PERF-01: index hot path exam — question[exam_package_id], question[quiz_id],
--   exam_package[exam_id].
-- PERF-05: unique (exam_session_id, token_used) — token sesi sekali pakai.
-- PERF-04: dicatat di bagian bawah (opsional, komentar) — lihat di bawah.
--
-- Catatan: migrasi additif + idempotent; perlu `npm run db:migrate` untuk
-- menerapkan ke database (prisma migrate dev / migrate deploy).

-- ---------------------------------------------------------------
-- REL-003 langkah 1 — dedupe tagihan ganda (keep satu, tandai sisanya)
-- ---------------------------------------------------------------
WITH ranked AS (
  SELECT i.id,
         row_number() OVER (
           PARTITION BY i.student_id, i.type, i.period
           ORDER BY
             -- preferensi baris yang sudah punya pembayaran PAID (tagihan "asli")
             (EXISTS (SELECT 1 FROM payment p WHERE p.invoice_id = i.id AND p.status = 'PAID')) DESC,
             i.created_at ASC,
             i.id ASC
         ) AS rn
  FROM invoice i
  WHERE i.period IS NOT NULL
)
UPDATE invoice i
SET status = 'CANCELLED',
    carry_over_note = COALESCE(i.carry_over_note, '') || ' [auto-dedupe audit_fixes_20260809: duplikat tagihan ' || i.type || ' ' || i.period || ']'
FROM ranked r
WHERE i.id = r.id AND r.rn > 1;

-- ---------------------------------------------------------------
-- REL-003 langkah 2 — unique (student_id, type, period)
-- Kolom period nullable: Postgres memperlakukan NULL sebagai nilai berbeda,
-- jadi baris ber-period NULL tetap diperbolehkan (tidak mengganggu SPP yang
-- selalu ber-period "YYYY-MM").
-- ---------------------------------------------------------------
CREATE UNIQUE INDEX "invoice_student_id_type_period_key" ON "invoice"("student_id", "type", "period");

-- ---------------------------------------------------------------
-- PERF-01 — index hot path exam
-- ---------------------------------------------------------------
CREATE INDEX "question_exam_package_id_idx" ON "question"("exam_package_id");

CREATE INDEX "question_quiz_id_idx" ON "question"("quiz_id");

CREATE INDEX "exam_package_exam_id_idx" ON "exam_package"("exam_id");

-- ---------------------------------------------------------------
-- PERF-05 — token sesi sekali pakai (unique exam_session_id + token_used)
-- ---------------------------------------------------------------
CREATE UNIQUE INDEX "exam_attempt_exam_session_id_token_used_key" ON "exam_attempt"("exam_session_id", "token_used");

-- ---------------------------------------------------------------
-- PERF-04 — (OPSIONAL, dikomentari) exclusion constraint anti double-booking
-- aset. TIDAK disertakan aktif karena `CREATE EXTENSION` tidak bisa dijalankan
-- di dalam transaksi migrasi Prisma (Postgres), sehingga `prisma migrate
-- deploy` akan gagal. Pertahanan utama race double-booking memakai row lock
-- `SELECT ... FOR UPDATE` pada baris asset di asset-booking.service.ts book().
--
-- Trade-off pendekatan FOR UPDATE:
--   + aman untuk semua jalur Prisma, tanpa prasyarat ekstensi DB.
--   + serialisasi per baris aset pada saat insert (dua book() simultan untuk
--     aset sama tidak bisa sama-sama lolos cek bentrok).
--   - tidak menutup race "approve vs approve" (dua PENDING tumpang tindih
--     di-approve bersamaan) — cek ulang saat approve tetap memakai query biasa.
--     Bila ingin jaminan DB penuh, jalankan SQL di bawah MANUAL di luar Prisma
--     (sekali saja), lalu constraint berlaku untuk semua jalur tulis:
--
--     CREATE EXTENSION IF NOT EXISTS btree_gist;
--     ALTER TABLE asset_booking ADD CONSTRAINT asset_booking_no_overlap
--     EXCLUDE USING gist (asset_id WITH =, tstzrange(start_at, end_at) WITH &&)
--     WHERE (status IN ('PENDING','APPROVED'));
--
--     Service sudah menangkap error constraint (23P01 / P2002 / P2010) menjadi
--     ConflictException(409) "Slot sudah dibooking".
-- ---------------------------------------------------------------
