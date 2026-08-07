# README.landing.md — Modul Landing (apps/api/src/modules/landing)

## Fungsi Folder

Konten **landing page sekolah**: section konten (`LandingContent`) dan berita
(`NewsArticle`). Endpoint publik di-cache in-memory (TTL `CACHE_TTL_MS`, default
30s) dan di-invalidate otomatis saat konten/berita diubah.

## Daftar Fitur

- Publik (tanpa auth): landing aggregate, daftar berita, detail berita per slug.
- Admin (`landing:write:school`): kelola section konten (upsert per slug) dan
  berita (CRUD + publish).

## Endpoint (prefix global `/api/v1`)

| Method | Path                           | Permission             | Deskripsi                          |
| ------ | ------------------------------ | ---------------------- | ---------------------------------- |
| GET    | `/public/landing`              | Publik                 | Landing page aggregate (cache 30s) |
| GET    | `/public/landing/berita`       | Publik                 | Daftar berita (cache 30s)          |
| GET    | `/public/landing/berita/:slug` | Publik                 | Detail berita                      |
| GET    | `/admin/landing`               | `landing:write:school` | Daftar section (admin)             |
| GET    | `/admin/landing/berita`        | `landing:write:school` | Daftar berita (admin)              |
| PUT    | `/admin/landing/:slug`         | `landing:write:school` | Upsert section konten              |
| POST   | `/admin/landing/berita`        | `landing:write:school` | Buat berita                        |
| PATCH  | `/admin/landing/berita/:id`    | `landing:write:school` | Update berita                      |
| DELETE | `/admin/landing/berita/:id`    | `landing:write:school` | Hapus berita                       |

## Struktur File

| File                    | Isi                              |
| ----------------------- | -------------------------------- |
| `landing.controller.ts` | REST endpoint                    |
| `landing.service.ts`    | Publik + admin + cache + slugify |
| `dto/`                  | DTO                              |
