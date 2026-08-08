-- Additive migration: RoleDashboardConfig + LandingContent (link_url/link_label/extra)
-- + NewsArticle.category + index AuditLog[action,created_at] + QuizAttempt/ExamAttempt status.

-- AlterTable: LandingContent — CTA fields + structured extra JSON
ALTER TABLE "landing_content" ADD COLUMN "link_url" TEXT,
ADD COLUMN "link_label" TEXT,
ADD COLUMN "extra" JSONB;

-- AlterTable: NewsArticle — kategori berita + index filter
ALTER TABLE "news_article" ADD COLUMN "category" TEXT;
CREATE INDEX "news_article_category_is_published_published_at_idx" ON "news_article"("category", "is_published", "published_at");

-- AlterTable: AuditLog — index rekap aktivitas per aksi
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at");

-- AlterTable: QuizAttempt — index rekap status
CREATE INDEX "quiz_attempt_status_submitted_at_idx" ON "quiz_attempt"("status", "submitted_at");

-- AlterTable: ExamAttempt — index rekap status
CREATE INDEX "exam_attempt_status_submitted_at_idx" ON "exam_attempt"("status", "submitted_at");

-- AlterTable: StaffAttendance — index rekap absensi staf (G-18)
CREATE INDEX "staff_attendance_staff_id_date_idx" ON "staff_attendance"("staff_id", "date");

-- CreateTable: RoleDashboardConfig — kartu dashboard per role
CREATE TABLE "role_dashboard_config" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "feature_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "href" TEXT NOT NULL,
    "section_order" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "required_permission" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_dashboard_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unik per (role, feature_key)
CREATE UNIQUE INDEX "role_dashboard_config_role_feature_key_key" ON "role_dashboard_config"("role", "feature_key");

-- CreateIndex: urutan kartu per role
CREATE INDEX "role_dashboard_config_role_is_enabled_section_order_idx" ON "role_dashboard_config"("role", "is_enabled", "section_order");

-- AddForeignKey: updated_by → User
ALTER TABLE "role_dashboard_config" ADD CONSTRAINT "role_dashboard_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
