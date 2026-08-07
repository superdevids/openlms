# README.app.md — Route Groups Web (apps/web/src/app)

## Fungsi Folder

Semua halaman aplikasi memakai route group Next.js App Router. Route group
dalam kurung `(...)` **tidak** menjadi bagian URL; URL aktual ditentukan folder
di dalamnya (mis. `(siswa)/siswa/dashboard` → `/siswa/dashboard`). Proteksi
redirect UX-level diatur `src/proxy.ts`.

## Route Groups

| Group          | URL             | Peran                             | Halaman                                                                                               |
| -------------- | --------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `(siswa)`      | `/siswa/*`      | SISWA                             | dashboard, kelas (+detail), tugas, kuis (+detail), ujian (+detail/kerjakan), nilai, absensi, kalender |
| `(guru)`       | `/guru/*`       | GURU                              | dashboard, kelas (+detail), materi, tugas, bank-soal, ujian, absensi, penilaian                       |
| `(admin)`      | `/admin/*`      | OPERATOR/KEPSEK/KEUANGAN/WAKEPSEK | dashboard, operator, kepsek, keuangan, wakepsek                                                       |
| `(superadmin)` | `/superadmin/*` | SUPERADMIN                        | dashboard, admin-sistem, branding, landing, onboarding, rbac, rollover                                |
| `(ortu)`       | `/ortu/*`       | WALI_MURID                        | dashboard, nilai, absensi, tagihan                                                                    |
| `(ppdb)`       | `/ppdb/*`       | Publik/CALON_SISWA                | ppdb (beranda), daftar, status                                                                        |
| `(landing)`    | `/berita/*`     | Publik                            | berita (+detail)                                                                                      |
| `(auth)`       | `/login`        | Publik                            | halaman login                                                                                         |
| `support`      | `/support`      | Publik                            | halaman dukungan                                                                                      |

## Detail Route Group

- **Siswa** (`(siswa)/siswa/`): `dashboard`, `kelas` + `kelas/[id]`, `tugas`,
  `kuis` + `kuis/[id]`, `ujian` + `ujian/[id]` + `ujian/[id]/kerjakan`,
  `nilai`, `absensi`, `kalender`.
- **Guru** (`(guru)/guru/`): `dashboard`, `kelas` + `kelas/[id]`, `materi`,
  `tugas`, `bank-soal`, `ujian`, `absensi`, `penilaian`.
- **Admin** (`(admin)/admin/`): `dashboard`, `operator`, `kepsek`, `keuangan`,
  `wakepsek`.
- **Superadmin** (`(superadmin)/superadmin/`): `dashboard`, `admin-sistem`,
  `branding`, `landing`, `onboarding`, `rbac`, `rollover`.
- **Ortu** (`(ortu)/ortu/`): `dashboard`, `nilai`, `absensi`, `tagihan`.
- **PPDB** (`(ppdb)/ppdb/`): `ppdb` (informasi & daftar), `daftar`, `status`.
- **Landing** (`(landing)/`): `berita` + `berita/[slug]`.
- **Auth** (`(auth)/`): `login`.
- **Support** (`support/`): `support`.

## File Root

| File          | Fungsi                                   |
| ------------- | ---------------------------------------- |
| `layout.tsx`  | Root layout (font, provider branding/UI) |
| `page.tsx`    | Halaman `/` (landing dasar)              |
| `globals.css` | Tailwind v4 + variabel tema              |
| `proxy.ts`    | (di `src/`) redirect auth UX-level       |
