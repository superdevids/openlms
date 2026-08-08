-- Additive migration: index performa (P2) - N+1 & filter publik.
--   LandingContent [is_published, section_order] - filter section published pada GET /public/landing.
--   ExamSession    [target_class_id, starts_at] - jadwal sesi per kelas siswa (listForStudent).
--   Grade          [class_subject_id, semester] - rekap nilai per kelas-mapel (recapByClassSubject).
-- Catatan: perlu `npm run db:migrate` untuk menerapkan ke database.

CREATE INDEX "landing_content_is_published_section_order_idx" ON "landing_content"("is_published", "section_order");

CREATE INDEX "exam_session_target_class_id_starts_at_idx" ON "exam_session"("target_class_id", "starts_at");

CREATE INDEX "grade_class_subject_id_semester_idx" ON "grade"("class_subject_id", "semester");
