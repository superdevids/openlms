-- ============================================================
-- opensis RLS — 02: Session variable `app.user_id` + helper
-- TANPA session var tenant (single-school, docs/03 §7.2).
-- Dipanggil di awal tiap transaksi oleh interceptor Prisma:
--   SELECT set_config('app.user_id', $1, true);
-- ============================================================

-- Helper: kembalikan user_id saat ini (NULL jika belum di-set / RLS off)
-- Catatan: semua PK user_* di Prisma bertipe String (cuid), BUKAN uuid. Fungsi
-- ini sengaja mengembalikan text TANPA cast ::uuid agar policy bisa membandingkan
-- kolom user_id (String) langsung dengan hasil fungsi; cast ::uuid dulu membuat
-- perbandingan selalu never-match (tipe uuid vs text).
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;

-- Helper: cek apakah user punya role ACTIVE (dipakai policy)
CREATE OR REPLACE FUNCTION app.has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "user_role" ur
    WHERE ur.user_id = app.current_user_id()
      AND ur.status = 'ACTIVE'
      AND ur.role = p_role
  )
$$;
