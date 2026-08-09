import { defineConfig, devices } from "@playwright/test";

/**
 * Konfigurasi E2E opensis (apps/web).
 *
 * STACK DIJALANKAN MANUAL/DOCKER — sengaja TIDAK ada webServer di sini
 * (auto-start server bisa konflik dengan stack yang sudah berjalan). Jalankan dulu:
 *
 *   1. Docker (recommended):  docker compose up -d   → web di http://localhost
 *   2. ATAU dev lokal:        npm run dev --workspace=@opensis/api   (http://localhost:3001)
 *                             npm run dev --workspace=@opensis/web   (http://localhost:3000)
 *
 * baseURL default http://localhost:3000; override via env E2E_BASE_URL
 * (mis. E2E_BASE_URL=http://localhost saat memakai Nginx :80).
 */
export default defineConfig({
  testDir: "./e2e",
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
