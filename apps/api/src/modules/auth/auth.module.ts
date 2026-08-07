import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaClient } from "@openlms/database";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { InvitationsService } from "./invitations.service";
import { PermissionsResolver } from "./permissions-resolver";
import { ScopeResolver } from "../../common/scope-resolver";
import { AuthGuard } from "../../common/auth.guard";
import { PermissionsGuard } from "../../common/permissions.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { prisma } from "@openlms/database";

/**
 * AuthModule — F1 (auth in-house + RBAC + feature flags).
 * Mendaftarkan guard global (APP_GUARD) di sini sehingga seluruh route di API
 * dilindungi: AuthGuard → PermissionsGuard → FeatureFlagGuard.
 * Urutan penting: AuthGuard harus dijalankan pertama (membangun RequestContext).
 */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    InvitationsService,
    PermissionsResolver,
    ScopeResolver,
    { provide: PrismaClient, useValue: prisma },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: FeatureFlagGuard }
  ],
  exports: [AuthService, InvitationsService, PermissionsResolver, ScopeResolver, PrismaClient]
})
export class AuthModule {}
