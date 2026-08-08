import { Global, Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@openlms/database";
import { DATABASE_CLIENT } from "../../modules/database/database.constants";

/**
 * DatabaseModule — GLOBAL provider PrismaClient tunggal (singleton dari
 * @openlms/database, packages/database/src/index.ts).
 *
 * Menyediakan dua token yang menunjuk ke instance yang sama:
 * - `PrismaClient` (token class) — pola modul lama (auth, landing, branding, ...).
 * - `DATABASE_CLIENT` (Symbol) — pola modul fitur (academic, parent-portal, ...).
 *
 * Modul fitur TIDAK lagi membuat `new PrismaClient()` sendiri; cukup
 * `imports: [DatabaseModule]` lalu inject token yang dipakai service-nya.
 * Keunggulan: satu koneksi pool, log konsisten, shutdown terkendali.
 */
@Global()
@Module({
  providers: [
    { provide: PrismaClient, useValue: prisma },
    { provide: DATABASE_CLIENT, useValue: prisma }
  ],
  exports: [PrismaClient, DATABASE_CLIENT]
})
export class DatabaseModule {}
