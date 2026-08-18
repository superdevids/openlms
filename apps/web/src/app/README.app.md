# README.app.md — Route Groups Web (apps/web/src/app)

## Fungsi Folder

Semua halaman aplikasi memakai route group Next.js App Router. Route group
dalam kurung `(...)` **tidak** menjadi bagian URL; URL aktual ditentukan folder
di dalamnya (mis. `(siswa)/siswa/dashboard` → `/siswa/dashboard`). Proteksi
redirect UX-level diatur `src/proxy.ts`.

## Route Groups

| Group          | URL             | Peran                             | Halaman                                                                                                            |
| -------------- | --------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `(siswa)`      | `/siswa/*`      | SISWA                             | dashboard, kelas (+detail), tugas, kuis (+detail), ujian (+detail/kerjakan), nilai, rapor, absensi, kalender       |
| `(guru)`       | `/guru/*`       | GURU                              | dashboard, kelas (+detail), materi, tugas, bank-soal, ujian, absensi, penilaian, rapor                             |
| `(admin)`      | `/admin/*`      | OPERATOR/KEPSEK/KEUANGAN/WAKEPSEK | dashboard, operator, kepsek (+change-logs), keuangan, wakepsek, rapor, dapodik                                     |
| `(superadmin)` | `/superadmin/*` | SUPERADMIN                        | dashboard, admin-sistem, branding, landing, onboarding, rbac, rollover, maintenance, dashboard-config, change-logs |
| `(ortu)`       | `/ortu/*`       | WALI_MURID                        | dashboard, nilai, absensi, tagihan                                                                                 |
| `(ppdb)`       | `/ppdb/*`       | Publik/CALON_SISWA                | ppdb (beranda), daftar, status                                                                                     |
| `(landing)`    | `/*`            | Publik                            | tentang, kontak, program-keahlian, fasilitas, ekstrakurikuler, prestasi, galeri, testimoni, faq, berita (+detail)  |
| `(auth)`       | `/login`        | Publik                            | halaman login                                                                                                      |
| `(calonsiswa)` | `/calonsiswa/*` | CALON_SISWA                       | dashboard, pengumuman                                                                                              |
| `(pembimbing)` | `/pembimbing/*` | PEMBIMBING_INDUSTRI               | dashboard, siswa (bimbingan)                                                                                       |
| `(penguji)`    | `/penguji/*`    | PENGUJI_EKSTERNAL                 | dashboard, jadwal                                                                                                  |
| `support`      | `/support`      | Publik                            | halaman dukungan                                                                                                   |

> **Total 68 `page.tsx`** (verifikasi glob `apps/web/src/app/**/page.tsx`, 2026-08-16):
> **11 landing** (group `(landing)`) + **57 role/publik** (12 route group lain + `page.tsx`
> root `/` + `support`). Halaman terakhir ditambahkan (Wave 2): `/guru/rapor`,
> `/admin/rapor`, `/admin/dapodik` (e-Rapor v2 + Dapodik v1).

## Detail Route Group

- **Siswa** (`(siswa)/siswa/`): `dashboard`, `kelas` + `kelas/[id]`, `tugas`,
  `kuis` + `kuis/[id]`, `ujian` + `ujian/[id]` + `ujian/[id]/kerjakan`,
  `nilai`, `rapor`, `absensi`, `kalender`.
- **Guru** (`(guru)/guru/`): `dashboard`, `kelas` + `kelas/[id]`, `materi`,
  `tugas`, `bank-soal`, `ujian`, `absensi`, `penilaian`, `rapor`.
- **Admin** (`(admin)/admin/`): `dashboard`, `operator`, `kepsek` +
  `kepsek/change-logs`, `keuangan`, `wakepsek`, `rapor`, `dapodik`.
- **Superadmin** (`(superadmin)/superadmin/`): `dashboard`, `admin-sistem`,
  `branding`, `landing`, `onboarding`, `rbac`, `rollover`, `maintenance`,
  `dashboard-config`, `change-logs`.
- **Ortu** (`(ortu)/ortu/`): `dashboard`, `nilai`, `absensi`, `tagihan`.
- **PPDB** (`(ppdb)/ppdb/`): `ppdb` (informasi & daftar), `daftar`, `status`.
- **Landing** (`(landing)/`): `tentang`, `kontak`, `program-keahlian`,
  `fasilitas`, `ekstrakurikuler`, `prestasi`, `galeri`, `testimoni`, `faq`,
  `berita` + `berita/[slug]` (URL langsung di root, tanpa prefix).
- **Auth** (`(auth)/`): `login`.
- **Calon Siswa** (`(calonsiswa)/calonsiswa/`): `dashboard`, `pengumuman`.
- **Pembimbing** (`(pembimbing)/pembimbing/`): `dashboard`, `siswa`.
- **Penguji** (`(penguji)/penguji/`): `dashboard`, `jadwal`.
- **Support** (`support/`): `support`.

## File Root

| File          | Fungsi                                   |
| ------------- | ---------------------------------------- |
| `layout.tsx`  | Root layout (font, provider branding/UI) |
| `page.tsx`    | Halaman `/` (landing dasar)              |
| `globals.css` | Tailwind v4 + variabel tema              |
| `proxy.ts`    | (di `src/`) redirect auth UX-level       |
