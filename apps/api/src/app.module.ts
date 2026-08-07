import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { MaintenanceMiddleware } from "./common/middleware/maintenance.middleware";
import { RateLimitMiddleware } from "./common/middleware/rate-limit.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { FeatureFlagsModule } from "./modules/feature-flags/feature-flags.module";
import { AppSettingsModule } from "./modules/app-settings/app-settings.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module";
import { LmsModule } from "./modules/lms/lms.module";
import { QuizModule } from "./modules/quiz/quiz.module";
import { ExamModule } from "./modules/exam/exam.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { AssetModule } from "./modules/asset/asset.module";
import { AcademicModule } from "./modules/academic/academic.module";
import { RolloverModule } from "./modules/rollover/rollover.module";
import { PpdbModule } from "./modules/ppdb/ppdb.module";
import { CommunicationModule } from "./modules/communication/communication.module";
import { ParentPortalModule } from "./modules/parent-portal/parent-portal.module";
import { AlumniModule } from "./modules/alumni/alumni.module";
import { SmkModule } from "./modules/smk/smk.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { StorageModule } from "./modules/storage/storage.module";
import { BrandingModule } from "./modules/branding/branding.module";
import { LandingModule } from "./modules/landing/landing.module";
import { RbacAdminModule } from "./modules/rbac-admin/rbac-admin.module";
import { QueueModule } from "./modules/queue/queue.module";
import { JobsModule } from "./modules/jobs/jobs.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        // requestId di-echo ke response oleh RequestIdMiddleware; pino memakai req.id
        genReqId: (req, res) => {
          const incoming = (req.headers["x-request-id"] as string) ?? "";
          const id =
            incoming.length > 0 ? incoming : `req_${Math.random().toString(36).slice(2, 12)}`;
          res.setHeader("x-request-id", id);
          return id;
        },
        level: process.env.LOG_LEVEL ?? "info",
        redact: {
          // Tanpa PII: jangan pernah log header (token/cookie), body, atau password
          paths: ["req.headers", "res.headers", "req.remoteAddress"],
          remove: true
        },
        customProps: (req) => {
          const typed = req as RequestWithRequestId;
          return {
            requestId: typed.id,
            module: "api"
          };
        }
      }
    }),
    // Infrastruktur inti
    HealthModule,
    AuthModule, // menempel APP_GUARD global (AuthGuard → PermissionsGuard → FeatureFlagGuard)
    RealtimeModule,
    NotificationsModule,
    StorageModule, // penyimpanan file lokal + signed URL (Fase 2)
    BrandingModule, // identitas visual aplikasi (/app/branding, Socket.IO branding:changed)
    LandingModule, // konten landing page publik (/public/landing, /admin/landing)
    RbacAdminModule, // CRUD RBAC SUPERADMIN (/rbac/*) — controller menyusul
    QueueModule, // antrean job opsional (BullMQ bila REDIS_URL, else in-process)
    JobsModule, // processor job + cron SPP bulanan (@nestjs/schedule)
    // Pengaturan & onboarding
    FeatureFlagsModule,
    AppSettingsModule,
    OnboardingModule,
    MaintenanceModule, // status sistem global + maintenance middleware (global dev mode)
    // Akademik & LMS
    AcademicModule,
    LmsModule, // menempel APP_PIPE global (ValidationPipe whitelist+transform)
    QuizModule,
    ExamModule,
    AttendanceModule,
    // Keuangan, payroll, aset (W2)
    FinanceModule,
    PayrollModule,
    AssetModule,
    // Siklus akademik & admisi
    RolloverModule,
    PpdbModule,
    // Komunikasi & portal
    CommunicationModule,
    ParentPortalModule,
    AlumniModule,
    SmkModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Urutan penting: RequestId dahulu (echo x-request-id), lalu maintenance
    // (global dev mode — allowlist /health, /public/system-status, /public/landing*,
    // /admin/system/maintenance), lalu rate limit per-IP.
    consumer.apply(RequestIdMiddleware).forRoutes("*");
    consumer.apply(MaintenanceMiddleware).forRoutes("*");
    consumer.apply(RateLimitMiddleware).forRoutes("*");
  }
}

interface RequestWithRequestId {
  id: string;
}
