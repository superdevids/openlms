-- CreateTable
CREATE TABLE "denda_invoice" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "original_invoice_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "delete_reason" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "denda_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "denda_invoice_invoice_no_key" ON "denda_invoice"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "denda_invoice_original_invoice_id_period_key" ON "denda_invoice"("original_invoice_id", "period");

-- CreateIndex
CREATE INDEX "denda_invoice_status_idx" ON "denda_invoice"("status");
