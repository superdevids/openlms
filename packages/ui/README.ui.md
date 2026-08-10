# README.ui.md — Paket UI (packages/ui)

## Fungsi Folder

Paket bersama komponen UI berbasis **shadcn/ui** untuk semua workspace.
Berisi utilitas classname (`cn`) plus **seluruh primitives UI** (25 file di
`src/components/`) yang diekspor via `@opensis/ui` — dipakai `apps/web` dan
seluruh workspace.

## Struktur Folder

| Path              | Isi                                                              |
| ----------------- | ---------------------------------------------------------------- |
| `src/index.ts`    | Barrel export publik (cn + seluruh primitives)                   |
| `src/components/` | 25 file primitives shadcn/ui (button, card, dialog, table, dll.) |
| `package.json`    | Workspace `@opensis/ui` (build tsc)                              |

## Ekspor

| Ekspor          | Fungsi                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| `cn(...inputs)` | Gabung className Tailwind (`clsx` + `tailwind-merge`, konvensi shadcn/ui) |

## Penggunaan

```tsx
import { cn } from "@opensis/ui";

<div className={cn("p-4", active && "bg-primary")} />;
```

## Design System

- Basis: **Tailwind CSS v4** + pola shadcn/ui.
- Komponen primitives (button, card, dialog, dsb.) hidup di
  `src/components/` paket ini dan diekspor via `@opensis/ui` — lihat
  `apps/web/src/components/README.components.md`.
- Komponen stateless; data lewat props.

## Design System v3 (komponen lanjutan di apps/web)

Frontend memakai **App Design System v3** (dok: `docs/app-design-system-v3.md`):
primitives di paket ini sebagai fondasi, lalu komponen lanjutan yang hidup di
**`apps/web/src/components/ui/`** (spesifik aplikasi, bukan shared package):
`PageHeader`, `PageContainer`, `StatCard`, `StatusBadge`, `DataTable`,
`FormPage`, `EmptyStateV3`, `CommandPalette` (Cmd+K), dst.

| Lapisan                   | Lokasi                                        | Contoh                                                                                                        |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Primitives shadcn/ui (25) | `packages/ui/src/components/` (`@opensis/ui`) | button, card, dialog, table, toast, tabs, dsb.                                                                |
| Komponen lanjutan v3 (9)  | `apps/web/src/components/ui/`                 | PageHeader, StatCard, StatusBadge, DataTable, EmptyStateV3, FormPage, CommandPalette, PageContainer, index.ts |

Konvensi v3: setiap halaman memakai `AppShell v2` + `PageHeader` (hilangkan h1
manual), KPI via `StatCard` (bukan `Kpi` lokal), daftar ≥4 kolom via `DataTable`,
status via `StatusBadge`, dan state kosong via `EmptyStateV3`.
