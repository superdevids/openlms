import { SetMetadata } from "@nestjs/common";
import type { Role } from "@prisma/client";

/** Kunci metadata role yang diizinkan (F1-T4, gula sintaks di atas permission). */
export const ROLES_KEY = "openlms:roles";

/**
 * @Roles("SUPERADMIN", "OPERATOR") — gula sintaks; memeriksa UserRole aktif
 * (satu-satunya otoritas role, prd04 §4.3). Bisa dikombinasikan dengan
 * @RequirePermission (keduanya OR dalam satu handler).
 */
export const Roles = (...roles: Role[]): MethodDecorator => SetMetadata(ROLES_KEY, roles);
