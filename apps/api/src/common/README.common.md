# README.common.md — Infrastruktur Bersama (apps/api/src/common)

## Fungsi Folder

`apps/api/src/common/` berisi infrastruktur lintas-modul: guard otorisasi global,
decorator, filter exception, middleware HTTP, serta util cache in-memory. Kode di
folder ini dipakai oleh seluruh controller di `modules/`.

## Komponen

| File                                  | Tipe                       | Fungsi                                                                                                                                                                                                   |
| ------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.guard.ts`                       | Guard global (`APP_GUARD`) | Verifikasi JWT access (cookie httpOnly / Bearer) → resolve role dari `UserRole` → bangun `RequestContext` (userId, roles, classIds, homeroomClassId, requestId). Bypass untuk `@Public()` dan `/health`. |
| `permissions.guard.ts`                | Guard global               | Evaluasi `@RequirePermission(...)` / `@Roles(...)` → 403 bila ditolak (fail-closed).                                                                                                                     |
| `feature-flag.guard.ts`               | Guard global               | Endpoint ber-`@Feature('KEY')` ditolak 403 `FEATURE_DISABLED` saat flag OFF. Memakai cache in-memory per key (TTL `CACHE_TTL_MS`, default 30s); `invalidate(key)` dipanggil saat flag diubah.            |
| `scope-resolver.ts`                   | Provider                   | Resolve scope RBAC user: classIds (ClassSubject guru + Enrollment siswa) + homeroomClassId (wali kelas). **Di-cache per userId (TTL 60s)** karena dipanggil AuthGuard di setiap request terautentikasi.  |
| `public.decorator.ts`                 | Decorator                  | `@Public()` — lewati AuthGuard.                                                                                                                                                                          |
| `require-permission.decorator.ts`     | Decorator                  | `@RequirePermission("res:act:scope", ...)` — daftar permission yang diizinkan (OR).                                                                                                                      |
| `roles.decorator.ts`                  | Decorator                  | `@Roles(Role.SUPERADMIN)` — batasi role.                                                                                                                                                                 |
| `feature-flag.decorator.ts`           | Decorator                  | `@Feature('KEY')` — gating fitur.                                                                                                                                                                        |
| `current-user.decorator.ts`           | Decorator                  | `@CurrentUser()` — injeksi `AuthUser` ke handler.                                                                                                                                                        |
| `constants.ts`                        | Konstanta                  | `GLOBAL_PREFIX` (`api/v1`).                                                                                                                                                                              |
| `cache.util.ts`                       | Util                       | `readCacheTtlMs(defaultMs)` membaca `CACHE_TTL_MS`, `cacheEnabled`, `pruneExpiredCache`.                                                                                                                 |
| `filters/all-exceptions.filter.ts`    | Filter                     | Pemetaan exception → respons JSON terstruktur.                                                                                                                                                           |
| `middleware/request-id.middleware.ts` | Middleware                 | Set/echo `x-request-id` untuk tracing (terpasang `*`).                                                                                                                                                   |
| `middleware/rate-limit.middleware.ts` | Middleware                 | Rate limit per-IP in-memory (env `RATE_LIMIT_*`, `LOGIN_RATE_LIMIT_MAX`, `REFRESH_RATE_LIMIT_MAX`).                                                                                                      |

## Alur Request Terautentikasi

```
Request → RequestIdMiddleware → RateLimitMiddleware
       → AuthGuard (JWT → UserRole → ScopeResolver[+cache])
       → PermissionsGuard (@RequirePermission)
       → FeatureFlagGuard (@Feature)
       → Controller → Service → Prisma
```

## Catatan

- **Cache scope**: `ScopeResolver.invalidateScope(userId)` dipanggil otomatis saat
  enrollment / guru pengampu berubah (`lms/classes/enrollments.service.ts`,
  `lms/classes/class-subjects.service.ts`).
- **Cache permission**: `PermissionsResolver` (modul auth) memakai TTL 60s untuk
  permission role & user override; `invalidate()` dipanggil saat RBAC diubah
  (`modules/rbac-admin/rbac-admin.service.ts`).
- Semua cache in-memory per-instance; untuk multi-instance ganti dengan cache
  terdistribusi (mis. Redis) tanpa mengubah kontrak service.
