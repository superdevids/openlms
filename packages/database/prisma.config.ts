import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Konfigurasi Prisma (menggantikan `package.json#prisma` yang deprecated di Prisma 7).
 * - schema: lokasi schema relatif ke file ini (packages/database).
 * - migrations.seed: command seeding setelah migrate (dijalankan via tsx).
 * Env dibaca otomatis dari `.env` di direktori ini (lihat import "dotenv/config").
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts"
  }
});
