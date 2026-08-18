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
    exclude: ["node_modules", ".next", "coverage"],
    // QA-007 — coverage gate web. Threshold adalah FLOOR anti-regresi (0
    // agar suite baru tidak langsung mematikan CI), BUKAN target. Roadmap:
    // naikkan bertahap menuju 80% (lines/statements/functions) & 50%
    // (branches) lewat kampanye test, mengikuti pola apps/api/jest.config.js.
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/__tests__/**", "src/**/*.d.ts"],
      thresholds: {
        lines: 0,
        functions: 0,
        statements: 0,
        branches: 0
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@opensis/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@opensis/types": path.resolve(__dirname, "../../packages/types/src")
    }
  }
});
