# AuthModule — Registrasi (F1: Auth In-house + RBAC)

## Class yang tersedia

| Class                 | Tipe           | Peran                                                                                                                                                                                               |
| --------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthModule`          | Module         | Registrasi controller + provider + **guard global**                                                                                                                                                 |
| `AuthController`      | Controller     | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/reset-password`, `POST /auth/change-password`, `POST /auth/invitations`, `POST /auth/invitations/accept` |
| `AuthService`         | Provider       | Login (Username NIS/NIP + password), refresh, me, reset password, change password, throttle/lockout, AuditLog                                                                                       |
| `InvitationsService`  | Provider       | Kirim undangan (link+role), accept → UserRole ACTIVE                                                                                                                                                |
| `PermissionsResolver` | Provider       | Muat permission set role + UserPermissionOverride; `canAccess()` murni                                                                                                                              |
| `ScopeResolver`       | Provider       | classIds (ClassSubject/Enrollment) + homeroomClassId (Class)                                                                                                                                        |
| `AuthGuard`           | Guard (global) | Verify JWT access, resolve UserRole, build RequestContext; bypass `@Public()` + `/health`                                                                                                           |
| `PermissionsGuard`    | Guard (global) | `@RequirePermission` / `@Roles` → 403                                                                                                                                                               |
| `FeatureFlagGuard`    | Guard (global) | `@Feature` OFF → 403 FEATURE_DISABLED                                                                                                                                                               |

## Import yang dibutuhkan di app.module.ts

```ts
import { AuthModule } from "./modules/auth/auth.module";
// di imports: AuthModule
```

Sudah terpasang sejak Fase 0 (`app.module.ts` baris `AuthModule`). Guard global
didaftarkan di dalam AuthModule via `APP_GUARD`, tidak perlu perubahan app.module.ts.

## Catatan dependency lintas-modul

- Modul lain yang butuh undangan/wizard (mis. `OnboardingModule`) mengimpor `AuthModule`
  untuk memakai `InvitationsService`.
- Provider DB: `{ provide: PrismaClient, useValue: prisma }` — AuthModule menyediakan
  & mengekspornya; modul lain boleh menyediakan sendiri.

## Verifikasi

- Unit: `apps/api/src/modules/auth/auth.service.spec.ts`, `permissions.guard.spec.ts`
- Integrasi: `POST /api/v1/auth/login` → cookie `opensis_access`/`opensis_refresh`;
  `GET /api/v1/auth/me` dengan cookie → profil+roles+scope.
