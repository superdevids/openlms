# README.components.md — Komponen Web (apps/web/src/components)

## Fungsi Folder

Komponen React bersama untuk aplikasi web: provider autentikasi & branding,
shell layout, dan kumpulan primitives UI (pola shadcn/ui). Komponen dasar
`ui/*` mengikuti design system shadcn + Tailwind.

## Struktur Folder

| Folder      | Isi                                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/`     | `auth-provider.tsx` (konteks sesi), `login-form.tsx` (form login)                                                                                                                                  |
| `branding/` | `branding-provider.tsx` (muat `/app/branding`, terapkan tema/warna)                                                                                                                                |
| `layout/`   | `app-shell.tsx` (shell aplikasi: nav/sidebar per role)                                                                                                                                             |
| `ui/`       | Primitives: alert, badge, button, card, checkbox, data-view, dialog, empty-state, error-state, icons, input, label, progress, radio, select, skeleton, steps, switch, table, tabs, textarea, toast |

## Daftar Komponen ui/

| Komponen                                                                                     | Fungsi                    |
| -------------------------------------------------------------------------------------------- | ------------------------- |
| `button`                                                                                     | Tombol (variant/size)     |
| `input` / `textarea` / `select` / `checkbox` / `radio` / `switch` / `label`                  | Form primitives           |
| `card` / `badge` / `alert` / `dialog` / `tabs` / `table` / `progress` / `steps` / `skeleton` | Display & layout          |
| `data-view`                                                                                  | Render data (list/detail) |
| `empty-state` / `error-state`                                                                | State kosong/error        |
| `icons`                                                                                      | Kumpulan ikon             |
| `toast`                                                                                      | Notifikasi toast          |
| `index.ts`                                                                                   | Barrel export             |

## Penggunaan

```tsx
import { Button, Card } from "@/components/ui";
```

Semua primitives stateless — data lewat props. Provider (`auth-provider`,
`branding-provider`) dipasang di root layout.
