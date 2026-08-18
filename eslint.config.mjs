import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import path from "node:path";

// Root monorepo — basePath eksplisit agar pola import/no-restricted-paths
// stabil walau turbo menjalankan lint per-workspace (cwd berbeda-beda).
const MONOREPO_ROOT = path.resolve(import.meta.dirname);

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/prisma/generated/**",
      "**/.turbo/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      "import-x": importX
    },
    settings: {
      // Resolver node diperluas dengan ekstensi TS agar import workspace
      // (@opensis/* → main: ./src/index.ts) ter-resolve; tanpa ini
      // no-restricted-paths diam karena import tidak ditemukan.
      // `symlinks: true` = dereference symlink workspace agar path hasil
      // resolve menunjuk ke apps/packages (bukan node_modules/@opensis/*).
      "import-x/resolver-next": [
        importX.createNodeResolver({
          extensions: [".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx", ".json", ".node"],
          symlinks: true
        })
      ],
      // Aturan import hanya untuk kode TS/TSX; abaikan asset non-kode.
      "import-x/ignore": ["\\.(css|scss|sass|less|png|jpg|jpeg|gif|svg|webp)$"]
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      // Batas dependensi monorepo (CONTRIBUTING.md §Standar Kode, docs/02 §3):
      // web → api hanya via HTTP; web → packages/{ui,types};
      // api → packages/{database,types}; packages/database → packages/types.
      "import-x/no-restricted-paths": [
        "error",
        {
          basePath: MONOREPO_ROOT,
          zones: [
            {
              target: "./apps/web/**",
              from: ["./apps/api/**", "./packages/database/**"],
              message:
                "apps/web dilarang import langsung dari apps/api atau packages/database; akses API hanya via HTTP (fetch)."
            },
            {
              target: "./apps/api/**",
              from: ["./apps/web/**", "./packages/ui/**"],
              message:
                "apps/api dilarang import dari apps/web atau packages/ui (komponen UI; batas monorepo)."
            },
            {
              target: "./packages/ui/**",
              from: ["./apps/api/**", "./apps/web/**", "./packages/database/**"],
              message:
                "packages/ui harus stateless (data via props); dilarang import apps/* atau packages/database."
            },
            {
              target: "./packages/database/**",
              from: ["./apps/web/**", "./apps/api/**", "./packages/ui/**"],
              message:
                "packages/database hanya boleh diakses oleh apps/api; dilarang import web/api/ui."
            },
            {
              target: "./packages/types/**",
              from: [
                "./apps/api/**",
                "./apps/web/**",
                "./packages/database/**",
                "./packages/ui/**"
              ],
              message: "packages/types adalah leaf kontrak; dilarang import workspace lain."
            }
          ]
        }
      ]
    }
  }
);
