-- ============================================================
-- openlms RLS — 03: Contoh policy role/scope (deskriptif)
-- Sumber: docs/03-database-erd.md §7.3 + docs/02 §8.3.
-- Policy di bawah adalah CONTOH — sesuaikan saat module service dibangun (F2+).
-- ============================================================

-- (1) assignment: role pengajar/admin boleh baca
CREATE POLICY assignment_role_scope ON "assignment"
  FOR SELECT
  USING (app.has_role('GURU')
      OR app.has_role('OPERATOR')
      OR app.has_role('WAKEPSEK')
      OR app.has_role('KEPSEK')
      OR app.has_role('SUPERADMIN'));

-- (2) counseling_note: hanya role BK terbatas (field-level access, G14)
CREATE POLICY counseling_limited_roles ON "counseling_note"
  USING (app.has_role('GURU_BK')
      OR app.has_role('WAKEPSEK')
      OR app.has_role('KEPSEK'));

-- (3) "user": hanya diri sendiri (kecuali role admin — guard service tetap utama)
CREATE POLICY user_self_read ON "user"
  FOR SELECT
  USING (id = app.current_user_id()
      OR app.has_role('OPERATOR')
      OR app.has_role('WAKEPSEK')
      OR app.has_role('KEPSEK')
      OR app.has_role('SUPERADMIN'));

-- (4) user_role: resolve role sendiri (dipakai helper app.has_role)
CREATE POLICY user_role_self ON "user_role"
  FOR SELECT
  USING (user_id = app.current_user_id()
      OR app.has_role('SUPERADMIN'));

-- (5) submission: siswa hanya submission miliknya; guru/admin baca kelas
CREATE POLICY submission_owner_or_staff ON "submission"
  USING (student_id = app.current_user_id()
      OR app.has_role('GURU')
      OR app.has_role('OPERATOR')
      OR app.has_role('WAKEPSEK')
      OR app.has_role('KEPSEK')
      OR app.has_role('SUPERADMIN'));

-- (6) storage (opsional, bucket self-managed): policy per bucket via path
--     {module}/{entity_id}/{file} — tanpa school_id (docs/02 §8.3).
-- CREATE POLICY materials_read_owner_class ON storage.objects FOR SELECT
--   USING (bucket_id = 'materials' AND ...);

-- Catatan: SUPERADMIN & role migrasi memakai role DB yang bisa bypass RLS
-- dengan audit; guard NestJS @RequirePermission tetap lapis utama.
