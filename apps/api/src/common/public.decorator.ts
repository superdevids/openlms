import { SetMetadata } from "@nestjs/common";

/** Kunci metadata untuk route publik (tanpa JWT) — F1-T4 */
export const IS_PUBLIC_KEY = "openlms:public";

/**
 * Menandai endpoint sebagai publik — AuthGuard/PermissionsGuard dilewati.
 * Dipakai pada login, refresh, accept undangan, dan endpoint publik lain (ppdb:register).
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
