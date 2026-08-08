import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest config apps/web (R-39) — jsdom + alias agar sejalan tsconfig/web.
 * Unit test pertama untuk pure utils (lib/format, lib/storage); kampanye
 * penuh testing web adalah Unit F.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "coverage"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@openlms/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@openlms/types": path.resolve(__dirname, "../../packages/types/src")
    }
  }
});
