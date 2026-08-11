/**
 * Jest config apps/api (QA-007 — coverage gate).
 *
 * coverageThreshold adalah FLOOR anti-regresi, BUKAN target. Diukur
 * 2026-08-10 (99 suite, 2136 test, unit tanpa DB):
 *   lines 19.26% | statements 18.57% | functions 17.36% | branches 11.36%
 * Ambang dipasang sedikit DI BAWAH angka terukur agar suite yang belum
 * tercakup TIDAK langsung mematikan CI; naikkan bertahap mengikuti kampanye
 * test. Target akhir: 80% (lines/statements/functions) & 50% (branches) —
 * dicapai lewat penambahan test per modul, bukan dengan menaikkan threshold.
 */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  setupFiles: ["reflect-metadata"],
  testRegex: ".*\\.(spec|e2e-spec)\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  moduleNameMapper: {
    "^@opensis/types$": "<rootDir>/../../packages/types/src",
    "^@opensis/database$": "<rootDir>/../../packages/database/src"
  },
  collectCoverageFrom: ["src/**/*.(t|j)s", "!**/*.spec.ts", "!**/__tests__/**", "!**/*.d.ts"],
  coverageDirectory: "./coverage",
  coverageThreshold: {
    global: {
      lines: 16,
      functions: 15,
      statements: 16,
      branches: 8
    }
  }
};
