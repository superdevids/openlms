import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@openlms/database";
import { LandingController } from "./landing.controller";
import { LandingService } from "./landing.service";

/**
 * LandingModule — konten landing page sekolah (/public/landing, /admin/landing).
 * GET publik (tanpa auth) untuk halaman depan web; PUT/POST/PATCH/DELETE
 * memakai permission landing:write:school (SUPERADMIN + OPERATOR, lihat
 * prisma/seed-data/permissions.ts). Semua mutasi dicatat ke AuditLog.
 */
@Module({
  controllers: [LandingController],
  providers: [LandingService, { provide: PrismaClient, useValue: prisma }],
  exports: [LandingService]
})
export class LandingModule {}
