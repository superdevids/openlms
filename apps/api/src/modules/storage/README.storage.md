# README.storage.md — Modul Storage (apps/api/src/modules/storage)

## Fungsi Folder

Penyimpanan **file lokal backend** (bukan S3/MinIO): upload multipart via API,
serve file dengan kontrol akses per bucket, dan validasi keamanan (mimetype
allowlist, batas ukuran per bucket 2–50MB, path traversal protection). Direktori
root dari env `STORAGE_LOCAL_DIR` (default `./storage`).

## Daftar Fitur

- Upload multipart ke bucket `branding`/`avatars`/`landing` (public) —
  `app:write:school`/`landing:write:school`.
- Serve file:
  - `branding` / `avatars` / `landing` → publik (pre-login).
  - bucket terproteksi (`materials`, `submissions`, `exports`, `ppdb-*`) → RBAC scope.
- Upload publik TANPA login hanya bucket `ppdb-documents`/`ppdb-consents`
  (wizard PPDB, R-17); bucket lain ditolak 400.
- Kebijakan akses per bucket (`BUCKET_POLICIES`): public / class / exports / ppdb.
- Cache-Control immutable + Content-Type oleh ekstensi; `nosniff`.

## Endpoint (prefix global `/api/v1`)

| Method | Path                            | Permission                                                                                | Deskripsi                                  |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| GET    | `/storage/files/branding/*`     | Publik                                                                                    | Serve file branding                        |
| GET    | `/storage/files/avatars/*`      | Publik                                                                                    | Serve avatar                               |
| GET    | `/storage/files/landing/*`      | Publik                                                                                    | Serve gambar landing + cover berita (R-19) |
| GET    | `/storage/files/:bucket/*`      | `material:read:class`/`export:read:school`/`ppdb:verify:school`                           | Serve file terproteksi                     |
| POST   | `/storage/files/:bucket`        | `material:write:class`/`submission:submit:self`/`app:write:school`/`landing:write:school` | Upload file (multipart, field "file")      |
| POST   | `/storage/files/public/:bucket` | Publik (hanya `ppdb-documents`/`ppdb-consents`)                                           | Upload publik PPDB tanpa login (R-17)      |

## Bucket

| Bucket           | Kebijakan | Batas ukuran (MB) | Mimetype                         |
| ---------------- | --------- | ----------------- | -------------------------------- |
| `branding`       | public    | 2                 | gambar (png/jpg/webp)            |
| `avatars`        | public    | 2                 | gambar (png/jpg/webp)            |
| `landing`        | public    | 5                 | gambar (png/jpg/webp)            |
| `materials`      | class     | 10                | dokumen (gambar/PDF/Office/teks) |
| `submissions`    | class     | 20                | dokumen                          |
| `ppdb-documents` | ppdb      | 5                 | dokumen                          |
| `ppdb-consents`  | ppdb      | 5                 | dokumen                          |
| `exports`        | exports   | 50                | dokumen                          |

> Daftar bucket & ukuran dari `storage.constants.ts` (`BUCKET_SIZE_MB_DEFAULTS`,
> `BUCKET_POLICIES`, `PUBLIC_UPLOAD_BUCKETS`); batas tiap bucket bisa ditimpa env
> `STORAGE_MAX_<BUCKET>_MB`. Upload via `POST /storage/files/:bucket` hanya bucket
> di `UPLOADABLE_BUCKETS`.

## Struktur File

| File                        | Isi                                                           |
| --------------------------- | ------------------------------------------------------------- |
| `storage.controller.ts`     | REST endpoint + streaming                                     |
| `storage.service.ts`        | Simpan/resolve/upload + assertReadAccess                      |
| `local-storage.provider.ts` | Provider penyimpanan lokal                                    |
| `storage.constants.ts`      | `STORAGE_LOCAL_DIR`, batas ukuran, mimetype, kebijakan bucket |
