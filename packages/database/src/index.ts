export { PrismaClient } from "@prisma/client";

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var opensisPrisma: PrismaClient | undefined;
}

/**
 * Client singleton (dipakai apps/api saat Fase 1+).
 * Konvensi: id String @id @default(cuid()), created_at/updated_at DateTime
 * (docs/03-database-erd.md §1).
 */
export const prisma =
  globalThis.opensisPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.opensisPrisma = prisma;
}
