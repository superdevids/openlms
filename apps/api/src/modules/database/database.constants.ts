/**
 * Token injeksi + tipe klien database untuk modul fitur.
 *
 * Alasan dibuat di sini: app.module.ts/common/** tidak boleh diubah,
 * sementara service modul butuh akses Prisma. Setiap modul fitur menyediakan
 * provider dengan token ini (useFactory: () => new PrismaClient()).
 *
 * Unit test menginjeksi mock yang mengikuti kontrak DatabaseClient.
 */
import { PrismaClient } from "@prisma/client";

export const DATABASE_CLIENT = Symbol("DATABASE_CLIENT");

/** Kontrak minimal PrismaClient yang dipakai service modul. */
export type DatabaseClient = PrismaClient;
