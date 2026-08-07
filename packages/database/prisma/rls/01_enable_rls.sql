-- ============================================================
-- openlms RLS — 01: Aktifkan Row Level Security (idempotent)
-- Lapisan kedua defense-in-depth; TANPA dimensi tenant (single-school).
-- Jalankan manual (opsional), bukan bagian migrasi Prisma default.
-- ============================================================

-- Tabel inti dengan data sensitif/user-facing
ALTER TABLE "school_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "counseling_note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ppdb_applicant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parental_consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_attempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_answer_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_export_log" ENABLE ROW LEVEL SECURITY;

-- Tabel lain dapat ditambahkan dengan pola yang sama.
