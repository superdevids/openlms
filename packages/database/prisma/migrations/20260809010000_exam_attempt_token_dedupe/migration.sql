-- Pre-dedupe PERF-05: exam_attempt (exam_session_id, token_used) — 2026-08-09.
--
-- Latar: migrasi 20260809000000_audit_fixes membuat unique index
--   exam_attempt_exam_session_id_token_used_key (token sesi sekali pakai).
--   Bila tabel sudah berisi duplikat historis (exam_session_id, token_used),
--   CREATE UNIQUE INDEX di migrasi tersebut GAGAL saat `migrate deploy`.
--
-- Strategi (mengikuti pola dedupe REL-003 di migrasi audit_fixes):
--   1. Deteksi duplikat: GROUP BY exam_session_id, token_used HAVING COUNT(*) > 1.
--   2. Keep SATU baris per grup — id terkecil (baris pertama dibuat).
--   3. Sisanya ditandai dengan cara aman TANPA menghapus data:
--        status -> 'EXPIRED' (token tidak dapat dipakai lagi; enggak lagi IN_PROGRESS)
--        submitted_at -> diisi (COALESCE nilai lama; konsisten dgn status final;
--          answer_logs tetap utuh untuk audit).
--
-- PENTING (urutan eksekusi): Prisma menerapkan migrasi sesuai urutan nama folder
-- (lexicographic). Pada environment yang batch 20260809000000 BELUM diterapkan,
-- pastikan file ini diterapkan SEBELUM 20260809000000 (mis. pindahkan timestamp
-- atau jalankan manual lebih dulu) agar pre-dedupe benar-benar mencegah kegagalan
-- CREATE UNIQUE INDEX. Bila 20260809000000 SUDAH diterapkan, query di bawah
-- no-op (unique index sudah mencegah duplikat; HAVING COUNT(*) > 1 = 0 baris).
--
-- Idempotent: bila tidak ada duplikat, CTE menghasilkan 0 baris dan UPDATE
-- tidak mengubah apa pun. Additif + aman; tidak perlu db:migrate pada env baru
-- yang tabelnya masih kosong.

WITH dupes AS (
  SELECT exam_session_id, token_used
  FROM exam_attempt
  GROUP BY exam_session_id, token_used
  HAVING COUNT(*) > 1
)
UPDATE exam_attempt e
SET status = 'EXPIRED',
    submitted_at = COALESCE(e.submitted_at, e.updated_at, e.created_at)
FROM dupes d
WHERE e.exam_session_id = d.exam_session_id
  AND e.token_used = d.token_used
  AND e.id > (
    SELECT MIN(e2.id)
    FROM exam_attempt e2
    WHERE e2.exam_session_id = d.exam_session_id
      AND e2.token_used = d.token_used
  );
