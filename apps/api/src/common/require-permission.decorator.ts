import { SetMetadata } from "@nestjs/common";

/** Kunci metadata permission yang dibutuhkan sebuah handler (F1-T4). */
export const PERMISSIONS_KEY = "openlms:permissions";

/**
 * @RequirePermission("resource:action[:scope]") — prd04 §4, F1-T4.
 * Guard PermissionsGuard mencocokkan permission ini dengan permission set role
 * (RolePermission) + UserPermissionOverride, lalu resolve scope SENDIRI/KELAS/SEKOLAH.
 * Beberapa argumen = "salah satu diizinkan" (OR).
 */
export const RequirePermission = (...permissions: string[]): MethodDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
