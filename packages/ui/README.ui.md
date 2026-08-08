# README.ui.md — Paket UI (packages/ui)

## Fungsi Folder

Paket bersama komponen UI berbasis **shadcn/ui** untuk semua workspace.
Saat ini berisi utilitas classname (`cn`) sebagai fondasi; komponen primitives
lengkap ada di `apps/web/src/components/ui/`.

## Struktur Folder

| Path           | Isi                                  |
| -------------- | ------------------------------------ |
| `src/index.ts` | Export publik paket (saat ini: `cn`) |
| `package.json` | Workspace `@opensis/ui` (build tsc)  |

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
  `apps/web/src/components/ui/` — lihat `README.components.md`.
- Komponen stateless; data lewat props.
