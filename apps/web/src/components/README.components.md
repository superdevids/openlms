# README.components.md — Komponen Web (apps/web/src/components)

## Fungsi Folder

Komponen React bersama untuk aplikasi web: provider autentikasi & branding,
shell layout, dan komponen fitur (landing, dashboard, onboarding, dsb.).
Primitives UI (pola shadcn/ui) **tidak** tinggal di folder ini — semuanya
dipindahkan ke paket bersama `packages/ui/src/components` (25 file) dan
diimpor via `@opensis/ui`.

## Struktur Folder

| Folder         | Isi                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------ |
| `auth/`        | `auth-provider.tsx` (konteks sesi), `login-form.tsx` (form login)                          |
| `branding/`    | `branding-provider.tsx` (muat `/app/branding`, terapkan tema/warna)                        |
| `layout/`      | `app-shell.tsx` (shell aplikasi: nav/sidebar per role), `notification-panel.tsx`           |
| `theme/`       | `theme-provider.tsx`, `theme-toggle.tsx`, `font-size-provider.tsx`, `font-size-toggle.tsx` |
| `landing/`     | `landing-header.tsx`, `landing-footer.tsx`, `motion.tsx`                                   |
| `dashboard/`   | `dashboard-cards.tsx`                                                                      |
| `audit/`       | `change-log-table.tsx`                                                                     |
| `maintenance/` | `maintenance-gate.tsx`                                                                     |
| `onboarding/`  | `onboarding-tour.tsx`                                                                      |

> Primitives shadcn/ui (button, card, dialog, table, toast, dll.) ada di
> **`packages/ui/src/components/`** (25 file, diekspor via `packages/ui/src/index.ts`)
> — lihat `packages/ui/README.ui.md`. Komponen _lanjutan_ aplikasi (App Design
> System v3) tinggal di **`apps/web/src/components/ui/`** (9 file, 12 ekspor) dan
> diimpor via `@/components/ui` — lihat seksi berikut.

## Daftar Komponen ui/ (di packages/ui)

| Komponen                                                                                     | Fungsi                        |
| -------------------------------------------------------------------------------------------- | ----------------------------- |
| `button`                                                                                     | Tombol (variant/size)         |
| `input` / `textarea` / `select` / `checkbox` / `radio` / `switch` / `label`                  | Form primitives               |
| `card` / `badge` / `alert` / `dialog` / `tabs` / `table` / `progress` / `steps` / `skeleton` | Display & layout              |
| `accordion` / `dropdown-menu` / `tooltip`                                                    | Interaksi tambahan            |
| `data-view`                                                                                  | Render data (list/detail)     |
| `empty-state` / `error-state`                                                                | State kosong/error            |
| `icons`                                                                                      | Kumpulan ikon                 |
| `toast`                                                                                      | Notifikasi toast              |
| `index.ts`                                                                                   | Barrel export (`@opensis/ui`) |

## Komponen lanjutan (App Design System v3)

Folder **`apps/web/src/components/ui/`** berisi komponen shared aplikasi (bukan
primitives shadcn/ui — itu tetap di `packages/ui`). 9 file, 12 ekspor via
`apps/web/src/components/ui/index.ts`; diimpor via **`@/components/ui`**
(lihat [docs/app-design-system-v3.md](../../../docs/app-design-system-v3.md)):

| Komponen                                       | Fungsi                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `PageContainer`                                | Wrapper halaman role (layout + spacing konsisten)                  |
| `PageHeader`                                   | Header halaman (judul, deskripsi, aksi) — menggantikan `h1` manual |
| `StatCard` / `StatGrid` / `Sparkline`          | KPI cards + grid + sparkline tanpa dependency                      |
| `StatusBadge`                                  | Badge status dengan tone terstandar (`DEFAULT_STATUS_TONE`)        |
| `DataTable`                                    | Tabel data generik (kolom, pagination, sorting)                    |
| `EmptyStateV3`                                 | State kosong versi v3                                              |
| `FormPage` / `FormSection` / `ValidationAlert` | Halaman & seksi form + alert validasi                              |
| `CommandPalette`                               | Palet perintah (Cmd+K) global                                      |

```tsx
import { PageHeader, StatCard, StatusBadge, DataTable } from "@/components/ui";
```

Shell aplikasi memakai **AppShell v2** (`components/layout/app-shell.tsx`) yang
menggabungkan komponen di atas — lihat README.web.md dan
[docs/app-design-system-v3.md](../../../docs/app-design-system-v3.md).

## Penggunaan

```tsx
import { Button, Card } from "@opensis/ui";
```

Semua primitives stateless — data lewat props. Provider (`auth-provider`,
`branding-provider`) dipasang di root layout.
