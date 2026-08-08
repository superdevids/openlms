/**
 * Integration smoke — verifikasi koneksi PostgreSQL + migrasi Prisma terpasang.
 * Dijalankan di CI job `integration` (service postgres) dan lokal dengan DATABASE_URL.
 * Di-skip otomatis bila DATABASE_URL tidak tersedia (dev tanpa DB).
 */

import { prisma } from "@opensis/database";

const hasDb = typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;

const describeDb = hasDb ? describe : describe.skip;

describeDb("DB integration (skipped bila DATABASE_URL tidak ada)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("SELECT 1 berhasil via Prisma", async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ "?column?": number }>>("SELECT 1");
    expect(rows[0]?.["?column?"]).toBe(1);
  });

  it("tabel user_role ada (migrasi sudah deploy)", async () => {
    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_role'"
    );
    expect(tables.length).toBe(1);
  });
});
