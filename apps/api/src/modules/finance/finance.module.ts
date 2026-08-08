import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@openlms/database";
import { QueueModule } from "../queue/queue.module";
import { FinanceController } from "./finance.controller";
import { FinanceConfigService } from "./services/finance-config.service";
import { InvoiceService } from "./services/invoice.service";
import { PaymentService } from "./services/payment.service";
import { SppSchedulerService } from "./services/spp-scheduler.service";
import { LateFeeService } from "./services/late-fee.service";
import { RefundService } from "./services/refund.service";
import { ReconciliationService } from "./services/reconciliation.service";
import { CashFlowService } from "./services/cash-flow.service";
import { FinanceJobsService } from "./services/finance-jobs.service";
import { PrismaFinanceStore } from "./prisma-finance.store";
import { FINANCE_STORE } from "./finance.constants";

/**
 * FinanceModule — keuangan & pembayaran (prd04 §5.F; 05 W2-PAYMENT).
 *
 * WIRING: modul ini TIDAK di-import app.module.ts (dilarang diubah — task).
 * Integration coder menambahkan FinanceModule ke app.module.ts.
 *
 * Catatan persistence: entitas yang sudah ada di schema (Invoice, Payment)
 * memakai PrismaClient langsung. Entitas W2 (LateFeeRule, denda invoice,
 * Refund, ReconciliationBatch/Item, CashFlowRecord) memakai FinanceStore —
 * adapter PrismaFinanceStore (W2); InMemoryFinanceStore tetap tersedia untuk
 * unit test (lihat finance.store.ts & README.registration.md).
 */

@Module({
  imports: [QueueModule],
  controllers: [FinanceController],
  providers: [
    FinanceConfigService,
    InvoiceService,
    PaymentService,
    SppSchedulerService,
    LateFeeService,
    RefundService,
    ReconciliationService,
    CashFlowService,
    FinanceJobsService,
    { provide: PrismaClient, useValue: prisma },
    { provide: FINANCE_STORE, useClass: PrismaFinanceStore }
  ],
  exports: [
    InvoiceService,
    PaymentService,
    SppSchedulerService,
    LateFeeService,
    RefundService,
    ReconciliationService,
    CashFlowService
  ]
})
export class FinanceModule {}
