# README.public-content.md — Modul Public Content (apps/api/src/modules/public-content)

## Fungsi Folder

Endpoint **publik** untuk halaman landing sekolah (PAGE MANDIRI): setiap halaman
punya data/endpoint sendiri, bukan potongan section dari `GET /public/landing`
(lihat modul `landing`). Seluruh route memakai `@Public()` (tidak butuh login),
menambahkan header `Cache-Control: public, max-age=300`, dan hasilnya di-cache
in-memory (TTL dari env `CACHE_TTL_MS`, default 300s — selaras dengan header).

## Daftar Fitur

- 12 halaman landing publik: program keahlian, ekstrakurikuler, prestasi,
  profil sekolah, fasilitas, galeri, testimoni, FAQ, kontak, struktur organisasi,
  profil tambahan (tentang/visi-misi/piagam), info PPDB.
- Sumber data ganda:
  - **Tabel domain** (Prisma): `Prodi` (program, hanya `is_active`), `Extracurricular`
    (termasuk nama pembina), `Achievement` (termasuk nama siswa & ekstrakurikuler),
    `SchoolProfile` (baris tunggal).
  - **LandingContent** (kolom `extra` JSON, hanya `is_published: true`) untuk
    halaman tanpa tabel domain: fasilitas, galeri, testimoni, FAQ, kontak,
    struktur-organisasi, tentang, visi-misi, piagam, ppdb-cta.
- Program keahlian diperkaya dari LandingContent `program-keahlian`
  (extra.programs) dengan pencocokan `code`/`short_name`/judul ternormalisasi.
- Perilaku 404: `school-profile` 404 bila baris `SchoolProfile` tidak ada;
  halaman berbasis LandingContent 404 bila section tidak ada; daftar lain
  mengembalikan array kosong.

## Endpoint (prefix global `/api/v1`, semua `@Public()` + `Cache-Control: public, max-age=300`)

| Method | Path                           | Deskripsi                                                            |
| ------ | ------------------------------ | -------------------------------------------------------------------- |
| GET    | `/public/programs`             | Daftar program keahlian (`Prodi` aktif + enrichment)                 |
| GET    | `/public/extracurriculars`     | Daftar ekstrakurikuler + nama pembina                                |
| GET    | `/public/achievements`         | Daftar prestasi (terbaru dulu)                                       |
| GET    | `/public/school-profile`       | Profil sekolah (baris tunggal; 404 bila kosong)                      |
| GET    | `/public/facilities`           | Fasilitas dari `LandingContent` slug `fasilitas`                     |
| GET    | `/public/gallery`              | Galeri gambar dari slug `galeri`                                     |
| GET    | `/public/testimonials`         | Testimoni dari slug `testimoni`                                      |
| GET    | `/public/faqs`                 | FAQ dari slug `faq`                                                  |
| GET    | `/public/contact`              | Kontak dari slug `kontak`                                            |
| GET    | `/public/school-structure`     | Struktur organisasi dari slug `struktur-organisasi`                  |
| GET    | `/public/school-profile-extra` | Tentang + visi/misi + piagam (slug `tentang`, `visi-misi`, `piagam`) |
| GET    | `/public/ppdb-info`            | Info PPDB dari slug `ppdb-cta`                                       |

## Struktur File

| File                             | Isi                                                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `public-content.controller.ts`   | 12 route `@Get` + `@Public` + header cache                                                                                         |
| `public-content.service.ts`      | Query Prisma, cache in-memory, normalisasi extra JSON, tipe respons (ProgramPageItem, PageSection, GalleryPage, ContactPage, dll.) |
| `public-content.module.ts`       | Registrasi modul                                                                                                                   |
| `public-content.service.spec.ts` | Unit test service                                                                                                                  |
