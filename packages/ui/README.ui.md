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
