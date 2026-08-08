import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@opensis/database";
import { QueueModule } from "../queue/queue.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { PayrollController } from "./payroll.controller";
import {
  JobPositionService,
  PayrollComponentService,
  SalaryStructureService
} from "./services/payroll-master.service";
import { PayrollRunService } from "./services/payroll-run.service";
import { PayslipService } from "./services/payslip.service";
import { PayrollReportService } from "./services/payroll-report.service";
import { PrismaPayrollStore } from "./prisma-payroll.store";
import { PAYROLL_STORE } from "./payroll.constants";

/**
 * PayrollModule — kepegawaian & penggajian (prd04 §5.E; 05 W2-PAYROLL).
 *
 * WIRING: modul ini SUDAH di-import app.module.ts (terintegrasi).
 *
 * Catatan persistence: Staff & StaffAttendance memakai PrismaClient langsung;
 * entitas W2 (JobPosition, PayrollComponent, SalaryStructure, PayrollRun,
 * PayrollRunItem, Payslip, PayrollPeriodConfig) memakai PayrollStore —
 * adapter PrismaPayrollStore (W2); InMemoryPayrollStore tetap tersedia untuk
 * unit test (lihat payroll.store.ts & README.registration.md).
 */

@Module({
  imports: [QueueModule, RealtimeModule],
  controllers: [PayrollController],
  providers: [
    JobPositionService,
    PayrollComponentService,
    SalaryStructureService,
    PayrollRunService,
    PayslipService,
    PayrollReportService,
    { provide: PrismaClient, useValue: prisma },
    { provide: PAYROLL_STORE, useClass: PrismaPayrollStore }
  ],
  exports: [
    JobPositionService,
    PayrollComponentService,
    SalaryStructureService,
    PayrollRunService,
    PayslipService,
    PayrollReportService
  ]
})
export class PayrollModule {}
