# README.web.md — Aplikasi Web (apps/web/src)

## Fungsi Folder

Frontend **Next.js 16 (App Router)** untuk opensis: satu aplikasi yang melayani
semua peran (siswa, guru, admin, superadmin, wali murid) + halaman publik
(landing, PPDB). Otorisasi final di backend (API); web hanya UX-level via
`src/proxy.ts` (pengganti middleware Next 16).

## Struktur Folder

| Path                                          | Isi                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/app/`                                    | Route groups per peran + halaman (lihat `README.app.md`)                     |
| `src/components/`                             | Komponen bersama (auth, branding, layout, ui) — lihat `README.components.md` |
| `src/lib/`                                    | Util & API client                                                            |
| `src/proxy.ts`                                | Auth redirect UX-level (Next 16 `proxy`)                                     |
| `src/globals.css` / `layout.tsx` / `page.tsx` | Styling global & root layout/landing                                         |

## lib/ (src/lib) — 19 file (verifikasi glob, 2026-08-16)

| File                    | Isi                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `api-client.ts`         | HTTP client `/api/v1` (cookie httpOnly, ApiError standar, idempotency-key, save-data) |
| `use-api.ts`            | Hook React untuk pemanggilan API (`useApi`/`useAsyncData`)                            |
| `storage.ts`            | Helper storage key (prefix `opensis_`)                                                |
| `idempotency.ts`        | Generator/helper Idempotency-Key                                                      |
| `use-socket.ts`         | Client Socket.IO `/ws` (singleton, reconnect; URL dari `NEXT_PUBLIC_SOCKET_URL`)      |
| `session.ts`            | Helper session/cookie                                                                 |
| `roles.ts`              | Mapping role → route/permission                                                       |
| `constants.ts`          | Konstanta bersama (app name, dsb.)                                                    |
| `demo.ts`               | Data demo (`NEXT_PUBLIC_DEMO=1`)                                                      |
| `dashboard.ts`          | Helper dashboard/statistik                                                            |
| `feature-flags.ts`      | Baca feature flags                                                                    |
| `feature-flags-hook.ts` | Hook React feature flags                                                              |
| `format.ts`             | Format angka/tanggal                                                                  |
| `safe-url.ts`           | Sanitasi URL / redirect aman                                                          |
| `schedule.ts`           | Helper jadwal (kelas/kalender)                                                        |
| `landing-pages.ts`      | Registrasi halaman landing (content per halaman)                                      |
| `font.ts` / `fonts.ts`  | Konfigurasi font (Next font)                                                          |
| `use-focus-trap.ts`     | Hook focus trap (aksesibilitas)                                                       |

## Catatan

- Base URL API: `NEXT_PUBLIC_API_BASE` (default `/api/v1` via proxy Next dev/prod).
- Socket URL: `NEXT_PUBLIC_SOCKET_URL` (opsional; default diturunkan dari `API_BASE` → origin + `/ws`, dipakai `src/lib/use-socket.ts`).
- Mode demo: `NEXT_PUBLIC_DEMO=1` → semua route bebas akses tanpa backend.
- Env yang dipakai web: `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_DEMO`, `NEXT_PUBLIC_SOCKET_URL`.
