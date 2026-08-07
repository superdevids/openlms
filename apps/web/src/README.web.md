# README.web.md — Aplikasi Web (apps/web/src)

## Fungsi Folder

Frontend **Next.js 16 (App Router)** untuk openlms: satu aplikasi yang melayani
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

## lib/ (src/lib)

| File                                         | Isi                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `api-client.ts`                              | HTTP client `/api/v1` (cookie httpOnly, ApiError standar, idempotency-key, save-data) |
| `use-api.ts`                                 | Hook React untuk pemanggilan API                                                      |
| `session.ts`                                 | Helper session/cookie                                                                 |
| `feature-flags.ts` + `feature-flags-hook.ts` | Baca & hook feature flags                                                             |
| `idempotency.ts`                             | Generator/helper Idempotency-Key                                                      |
| `roles.ts`                                   | Mapping role → route/permission                                                       |
| `format.ts` / `utils.ts`                     | Format angka/tanggal, util umum                                                       |
| `demo.ts`                                    | Data demo (`NEXT_PUBLIC_DEMO=1`)                                                      |

## Catatan

- Base URL API: `NEXT_PUBLIC_API_BASE` (default `/api/v1` via proxy Next dev/prod).
- Mode demo: `NEXT_PUBLIC_DEMO=1` → semua route bebas akses tanpa backend.
- Env yang dipakai web: `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_DEMO`.
