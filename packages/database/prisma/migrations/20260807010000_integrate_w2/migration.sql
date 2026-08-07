-- AlterEnum
ALTER TYPE "InvoiceType" ADD VALUE 'UANG_OSIS';
ALTER TYPE "InvoiceType" ADD VALUE 'DENDA';

-- AlterEnum
ALTER TYPE "AssetCategory" ADD VALUE 'KENDARAAN';
ALTER TYPE "AssetCategory" ADD VALUE 'PERALATAN_IT';

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('IZIN', 'SAKIT');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CurriculumReferenceType" AS ENUM ('CP', 'TP', 'ATP');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'CALCULATED', 'VALIDATED', 'APPROVED_KEUANGAN', 'REKAP_KEPSEK', 'PAID');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'ISSUED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LateFeeRuleType" AS ENUM ('NOMINAL', 'PERSEN_PER_HARI');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED_KEUANGAN', 'APPROVED_KEPSEK', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('TRANSFER', 'TUNAI');

-- CreateEnum
CREATE TYPE "ReconciliationRowStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CashFlowDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashFlowCategory" AS ENUM ('PAYMENT_VERIFIED', 'REFUND', 'EXPENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetSourceFund" AS ENUM ('BOS', 'APBD', 'SWADANA');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('FISIK', 'BOOK');

-- CreateEnum
CREATE TYPE "AuditResultStatus" AS ENUM ('MATCH', 'SELISIH', 'REKLASIFIKASI_RETIRED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "locked_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "submission" ADD COLUMN "idempotency_key" TEXT;

-- CreateIndex
CREATE INDEX "submission_idempotency_key_idx" ON "submission"("idempotency_key");

-- AlterTable
ALTER TABLE "exam" ADD COLUMN "class_subject_id" TEXT;

-- CreateIndex
CREATE INDEX "exam_class_subject_id_idx" ON "exam"("class_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_answer_log_attempt_id_idempotency_key_key" ON "exam_answer_log"("attempt_id", "idempotency_key");

-- AlterTable
ALTER TABLE "asset" ADD COLUMN "merk" TEXT,
ADD COLUMN "tahun_perolehan" INTEGER,
ADD COLUMN "harga_perolehan" DECIMAL(12,2),
ADD COLUMN "masa_manfaat_bulan" INTEGER,
ADD COLUMN "penanggung_jawab_id" TEXT,
ADD COLUMN "sumber_dana" "AssetSourceFund";

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_subject_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "PermitType" NOT NULL,
    "reason" TEXT NOT NULL,
    "attachment_url" TEXT,
    "status" "PermitStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_reference" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "type" "CurriculumReferenceType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rollover_item" (
    "id" TEXT NOT NULL,
    "rollover_run_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "old_class_id" TEXT,
    "new_class_id" TEXT,
    "old_enrollment_id" TEXT,
    "new_enrollment_id" TEXT,
    "action" "RolloverAction" NOT NULL,
    "reason" TEXT,
    "override_by" TEXT,
    "override_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rollover_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_position" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_jabatan_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_component" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "is_bpjs_applicable" BOOLEAN NOT NULL DEFAULT true,
    "unit" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structure" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "effective_from" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "attendance_allowance_per_day" DECIMAL(12,2),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_period_config" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "umr" DECIMAL(12,2) NOT NULL,
    "ter_monthly" JSONB NOT NULL,
    "ter_daily" JSONB NOT NULL,
    "honor_dpp_percent" DECIMAL(12,2) NOT NULL DEFAULT 50,
    "pns_final_rate_percent" DECIMAL(12,2) NOT NULL DEFAULT 15,
    "bpjs_kesehatan" JSONB NOT NULL,
    "bpjs_jht" JSONB NOT NULL,
    "bpjs_jp" JSONB NOT NULL,
    "pasal17_rate_percent" DECIMAL(12,2) NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_period_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "total_gross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "staff_count" INTEGER NOT NULL DEFAULT 0,
    "approved_by_keuangan" TEXT,
    "approved_by_kepsek" TEXT,
    "paid_at" TIMESTAMP(3),
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_item" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "gross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pph21" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bpjs_kesehatan" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bpjs_jht" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bpjs_jp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "attendance_days" INTEGER NOT NULL DEFAULT 0,
    "below_umr" BOOLEAN NOT NULL DEFAULT false,
    "warnings" JSONB,
    "detail_components" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_run_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PayslipStatus" NOT NULL DEFAULT 'ISSUED',
    "snapshots" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "late_fee_rule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "invoice_type" "InvoiceType" NOT NULL,
    "grace_days" INTEGER NOT NULL DEFAULT 0,
    "fee_type" "LateFeeRuleType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "max_amount" DECIMAL(12,2),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "late_fee_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" TEXT NOT NULL,
    "refund_no" TEXT NOT NULL,
    "payment_id" TEXT,
    "invoice_id" TEXT,
    "student_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "method" "RefundMethod" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "requires_kepsek_approval" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_keuangan" TEXT,
    "approved_by_kepsek" TEXT,
    "paid_at" TIMESTAMP(3),
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_batch" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "imported_by" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "matched_rows" INTEGER NOT NULL DEFAULT 0,
    "unmatched_rows" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reconciliation_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_item" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "tanggal" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "referensi" TEXT,
    "nominal" DECIMAL(12,2) NOT NULL,
    "tipe" TEXT NOT NULL,
    "status" "ReconciliationRowStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matched_payment_id" TEXT,
    "match_confidence" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "resolution_note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_record" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "direction" "CashFlowDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" "CashFlowCategory" NOT NULL,
    "reference_id" TEXT,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_flow_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_audit" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "audit_date" TIMESTAMP(3) NOT NULL,
    "audit_type" "AuditType" NOT NULL,
    "physical_qty" INTEGER,
    "book_qty" INTEGER NOT NULL DEFAULT 0,
    "difference" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "propose_retired" BOOLEAN NOT NULL DEFAULT false,
    "status" "AuditResultStatus" NOT NULL,
    "approved_by_kepsek" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_idx" ON "refresh_token"("user_id");

-- CreateIndex
CREATE INDEX "refresh_token_revoked_at_idx" ON "refresh_token"("revoked_at");

-- CreateIndex
CREATE INDEX "permit_student_id_date_idx" ON "permit"("student_id", "date");

-- CreateIndex
CREATE INDEX "permit_class_subject_id_date_idx" ON "permit"("class_subject_id", "date");

-- CreateIndex
CREATE INDEX "permit_status_verified_at_idx" ON "permit"("status", "verified_at");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_reference_subject_id_type_code_key" ON "curriculum_reference"("subject_id", "type", "code");

-- CreateIndex
CREATE INDEX "curriculum_reference_subject_id_type_idx" ON "curriculum_reference"("subject_id", "type");

-- CreateIndex
CREATE INDEX "rollover_item_rollover_run_id_idx" ON "rollover_item"("rollover_run_id");

-- CreateIndex
CREATE INDEX "rollover_item_student_id_idx" ON "rollover_item"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_position_code_key" ON "job_position"("code");

-- CreateIndex
CREATE INDEX "job_position_active_idx" ON "job_position"("active");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_component_code_key" ON "payroll_component"("code");

-- CreateIndex
CREATE INDEX "payroll_component_active_idx" ON "payroll_component"("active");

-- CreateIndex
CREATE INDEX "salary_structure_staff_id_effective_from_idx" ON "salary_structure"("staff_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_period_config_period_key" ON "payroll_period_config"("period");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_period_key" ON "payroll_run"("period");

-- CreateIndex
CREATE INDEX "payroll_run_status_idx" ON "payroll_run"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_item_run_id_staff_id_key" ON "payroll_run_item"("run_id", "staff_id");

-- CreateIndex
CREATE INDEX "payslip_staff_id_period_idx" ON "payslip"("staff_id", "period");

-- CreateIndex
CREATE INDEX "late_fee_rule_enabled_idx" ON "late_fee_rule"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "refund_refund_no_key" ON "refund"("refund_no");

-- CreateIndex
CREATE INDEX "refund_status_created_at_idx" ON "refund"("status", "created_at");

-- CreateIndex
CREATE INDEX "reconciliation_batch_period_idx" ON "reconciliation_batch"("period");

-- CreateIndex
CREATE INDEX "reconciliation_item_batch_id_idx" ON "reconciliation_item"("batch_id");

-- CreateIndex
CREATE INDEX "cash_flow_record_date_direction_idx" ON "cash_flow_record"("date", "direction");

-- CreateIndex
CREATE INDEX "asset_maintenance_asset_id_scheduled_at_idx" ON "asset_maintenance"("asset_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "asset_audit_asset_id_audit_date_idx" ON "asset_audit"("asset_id", "audit_date");

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit" ADD CONSTRAINT "permit_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit" ADD CONSTRAINT "permit_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit" ADD CONSTRAINT "permit_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_reference" ADD CONSTRAINT "curriculum_reference_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollover_item" ADD CONSTRAINT "rollover_item_rollover_run_id_fkey" FOREIGN KEY ("rollover_run_id") REFERENCES "rollover_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollover_item" ADD CONSTRAINT "rollover_item_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_item" ADD CONSTRAINT "payroll_run_item_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payroll_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip" ADD CONSTRAINT "payslip_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payroll_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_item" ADD CONSTRAINT "reconciliation_item_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "reconciliation_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance" ADD CONSTRAINT "asset_maintenance_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_audit" ADD CONSTRAINT "asset_audit_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
