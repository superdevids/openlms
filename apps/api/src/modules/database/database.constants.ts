/**
 * Token injeksi + tipe klien database untuk modul fitur.
 *
 * Modul fitur mengimpor DatabaseModule (common/database — GLOBAL) yang
 * menyediakan instance PrismaClient singleton (@opensis/database) dengan
 * dua token: `PrismaClient` (class) dan `DATABASE_CLIENT` (Symbol).
 * Service cukup `@Inject(DATABASE_CLIENT)`. TIDAK ada lagi `new PrismaClient()`
 * per modul — satu koneksi pool untuk seluruh aplikasi.
 *
 * Unit test menginjeksi mock yang mengikuti kontrak DatabaseClient.
 */
import { PrismaClient } from "@prisma/client";

export const DATABASE_CLIENT = Symbol("DATABASE_CLIENT");

/** Kontrak minimal PrismaClient yang dipakai service modul. */
export type DatabaseClient = PrismaClient;
