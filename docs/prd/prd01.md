# PRD: openlms — Platform SaaS LMS & School Information System untuk SMA/SMK

**Versi:** 1.0
**Tanggal:** 6 Agustus 2026
**Status:** Draft — tahap perencanaan
**Pemilik Produk:** Aditya

---

## 1. Ringkasan Eksekutif

openlms adalah platform **SaaS multi-tenant** yang menggabungkan **Learning Management System (LMS)** dan **School Information System (SIS)** untuk jenjang SMA/SMK/sederajat di Indonesia. Satu instance aplikasi melayani banyak sekolah sekaligus (multi-tenant), masing-masing dengan data yang terisolasi.

Platform ini mencakup seluruh siklus operasional sekolah: dari pendaftaran siswa baru (PPDB), proses belajar-mengajar (materi, tugas, kuis), penilaian, administrasi (absensi, rapor), hingga keuangan (SPP), dengan akses berjenjang untuk siswa, guru, wali kelas, tata usaha, staf keuangan, wakil kepala sekolah, dan kepala sekolah.

### 1.1 Tujuan Bisnis

- Menyediakan satu platform terpadu yang menggantikan kombinasi Google Classroom + Excel + WhatsApp + sistem SPP manual yang umum dipakai sekolah saat ini.
- Model bisnis SaaS: sekolah berlangganan (per siswa/bulan atau flat fee per sekolah — perlu divalidasi lebih lanjut).
- Skalabel untuk melayani banyak sekolah dari satu codebase & infrastruktur.

### 1.2 Tujuan Produk (MVP)

- Sekolah bisa onboarding mandiri, mengundang guru & siswa, dan mulai memakai LMS inti (materi, tugas, kuis, nilai) dalam hitungan hari, bukan minggu.

---

## 2. Latar Belakang & Masalah

Sekolah SMA/SMK di Indonesia umumnya menggunakan kombinasi tools terpisah (Google Classroom untuk kelas, Excel untuk nilai/administrasi, WhatsApp untuk komunikasi, sistem manual/kertas untuk PPDB dan keuangan) yang menyebabkan:

- Data tersebar dan tidak terhubung antar peran (guru tidak tahu status pembayaran siswa, wali kelas harus rekap manual dari banyak guru mapel).
- Tidak ada satu sumber data (single source of truth) untuk kepala sekolah/waka dalam mengambil keputusan.
- Proses PPDB manual rawan human error dan lambat.

---

## 3. Target Pengguna & Peran (Roles)

| Role                             | Deskripsi Singkat                     | Kebutuhan Utama                                                  |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| **Siswa**                        | Peserta didik aktif                   | Lihat materi, kerjakan tugas/kuis, lihat nilai & jadwal          |
| **Guru (Mapel)**                 | Pengajar mata pelajaran               | Upload materi, buat tugas/kuis, nilai, absen per kelas           |
| **Wali Kelas**                   | Guru penanggung jawab satu kelas      | Rekap nilai & absensi kelas, buat rapor, komunikasi ke orang tua |
| **Tata Usaha (TU)**              | Staf administrasi                     | Kelola data induk siswa/guru, surat-menyurat, arsip              |
| **Keuangan**                     | Staf pengelola SPP/pembayaran         | Catat & verifikasi pembayaran, tagihan, laporan keuangan         |
| **Wakil Kepala Sekolah (Waka)**  | Pengawas bidang (kurikulum/kesiswaan) | Dashboard ringkasan akademik & kedisiplinan                      |
| **Kepala Sekolah**               | Pimpinan sekolah                      | Dashboard eksekutif seluruh sekolah                              |
| **Calon Siswa/Orang Tua (PPDB)** | Pendaftar siswa baru                  | Isi formulir pendaftaran, upload dokumen, cek status seleksi     |
| **Superadmin (penyedia SaaS)**   | Pengelola platform (Aditya/tim)       | Kelola tenant/sekolah, billing, monitoring sistem                |

Catatan: Orang tua siswa aktif (bukan calon siswa) bisa jadi role tambahan di fase lanjutan (lihat §9) untuk melihat nilai & absensi anak.

---

## 4. Ruang Lingkup Produk

### 4.1 Modul Utama

1. **Auth & Manajemen Tenant** — onboarding sekolah, SSO, RBAC
2. **LMS Inti** — materi, tugas, submission, penilaian
3. **Kuis & Penilaian** — bank soal, auto-grade, rekap nilai
4. **Administrasi Akademik** — absensi, jadwal, rapor
5. **Keuangan** — SPP, tagihan, riwayat pembayaran
6. **PPDB** — pendaftaran siswa baru online
7. **Live Class & Notifikasi** — video call terintegrasi, notifikasi real-time

### 4.2 Di Luar Cakupan (Out of Scope) — MVP

- Aplikasi mobile native (fase awal web-only, responsive)
- Payment gateway otomatis untuk SPP (fase awal: pencatatan manual oleh staf keuangan, integrasi payment gateway di fase lanjutan)
- Video conferencing yang dibangun sendiri (pakai integrasi pihak ketiga)
- Fitur akademik SD/SMP (fokus SMA/SMK dulu, kurikulum berbeda)

---

## 5. Spesifikasi Fungsional per Modul

### 5.1 Auth & Manajemen Tenant

- Login via **Supabase Auth SSO** (Google OAuth untuk guru/siswa yang sudah punya akun Google sekolah/pribadi, plus email+password sebagai fallback).
- Satu user bisa punya multi-role di sekolah berbeda (mis. guru honorer di 2 sekolah) — didesain sejak awal walau tidak jadi prioritas UI di MVP.
- Admin sekolah (role TU/Kepsek saat onboarding) mengundang guru & siswa via email/link undangan dengan role sudah ditentukan.
- **RBAC**: setiap endpoint API dan halaman frontend dibatasi berdasarkan role + tenant (school_id).

### 5.2 LMS Inti

- Guru membuat **Kelas** (mapping ke kelas fisik + mapel, mis. "XI IPA 1 — Matematika").
- Guru upload **materi** (dokumen, video, link) per kelas.
- Guru membuat **tugas** dengan deadline, lampiran, dan instruksi.
- Siswa submit tugas (upload file/teks) sebelum deadline; submission terlambat ditandai otomatis.
- Guru menilai submission dengan skor + feedback teks.

### 5.3 Kuis & Penilaian

- Guru membuat **bank soal**: pilihan ganda (auto-grade) dan esai (manual-grade).
- Kuis punya pengaturan waktu (durasi, jadwal buka/tutup), acak urutan soal (opsional).
- Sistem menghitung skor otomatis untuk pilihan ganda; guru menilai esai manual.
- **Rekap nilai** per siswa, per kelas, per mapel — dapat diekspor (CSV/PDF).
- Wali kelas melihat rekap nilai lintas mapel untuk kelasnya.

### 5.4 Administrasi Akademik

- Guru mencatat **absensi** per pertemuan (hadir/izin/sakit/alpa).
- Wali kelas melihat rekap absensi bulanan kelasnya.
- Sistem menyusun **rapor** semi-otomatis dari data nilai + absensi (wali kelas melengkapi catatan/deskripsi).
- Jadwal pelajaran per kelas (input manual oleh TU/kurikulum di awal).

### 5.5 Keuangan

- Staf keuangan membuat **tagihan** (SPP bulanan, uang kegiatan, dll) per siswa/kelas/angkatan.
- Pencatatan pembayaran manual (transfer, tunai) dengan bukti upload.
- Siswa/orang tua melihat status tagihan & riwayat pembayaran.
- Laporan keuangan ringkas untuk kepala sekolah.

### 5.6 PPDB (Penerimaan Peserta Didik Baru)

- Formulir pendaftaran publik (tanpa login) dengan upload dokumen (KK, akta, rapor).
- Panel verifikasi dokumen oleh TU.
- Pengumuman hasil seleksi (bisa manual input hasil dari sistem seleksi eksternal, atau kriteria sederhana di sistem).
- Pendaftar yang lolos otomatis jadi akun siswa aktif.

### 5.7 Live Class & Notifikasi

- Integrasi **Jitsi** (self-host, gratis) sebagai default; opsi konfigurasi Zoom/Google Meet link manual sebagai alternatif.
- Notifikasi real-time (tugas baru, nilai keluar, tagihan jatuh tempo) via **Socket.IO** + in-app notification center.

---

## 6. Arsitektur Teknis

### 6.1 Struktur Monorepo

```
openlms/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/           # Next.js frontend (App Router)
├── packages/
│   ├── database/      # Prisma schema & client (shared)
│   ├── ui/             # Shared UI components (shadcn/ui + Tailwind)
│   └── types/          # Shared TypeScript types/DTOs
├── turbo.json          # atau Nx, untuk task orchestration
└── package.json
```

Rekomendasi tooling monorepo: **Turborepo** (lebih ringan, cocok untuk tim kecil/solo) dibanding Nx.

### 6.2 Backend — NestJS

- Modular per domain: `AuthModule`, `TenantModule`, `AcademicModule`, `LmsModule`, `QuizModule`, `FinanceModule`, `PpdbModule`, `NotificationModule`.
- Prisma sebagai ORM ke PostgreSQL.
- Guard global untuk RBAC + tenant isolation (setiap request tervalidasi `school_id` dari JWT/session Supabase).
- REST API (opsi: tambah GraphQL di fase lanjutan jika kebutuhan query kompleks meningkat).

### 6.3 Frontend — Next.js App Router

- Route groups per role: `app/(siswa)`, `app/(guru)`, `app/(admin)`, `app/(ppdb)` — memisahkan layout & navigasi per peran.
- Server Components untuk data-fetching awal, Client Components untuk interaktivitas (form tugas, kuis timer, dsb).
- Tailwind CSS v4 + shadcn/ui untuk konsistensi desain.

### 6.4 Autentikasi — Supabase SSO

- Supabase Auth sebagai identity provider: Google OAuth (PKCE flow) + email/password.
- JWT dari Supabase divalidasi di NestJS via middleware; klaim custom (`school_id`, `role`) disisipkan lewat Supabase custom claims atau tabel mapping user↔role↔school di database aplikasi (lebih fleksibel untuk multi-role/multi-tenant daripada mengandalkan claim JWT saja).

### 6.5 Database — PostgreSQL

- **Strategi multi-tenancy: shared database, shared schema, dengan kolom `school_id`** di setiap tabel milik tenant (bukan database-per-tenant) — lebih murah dioperasikan dan lebih mudah untuk maintenance/migrasi saat jumlah sekolah bertambah.
- **Row-Level Security (RLS)** PostgreSQL diaktifkan sebagai lapisan proteksi tambahan di level database, melengkapi guard RBAC di NestJS (defense in depth).
- Entitas inti (ringkas, detail penuh di dokumen ERD terpisah): `School`, `User`, `UserSchoolRole`, `Class`, `Subject`, `Enrollment`, `Material`, `Assignment`, `Submission`, `Quiz`, `Question`, `QuizAttempt`, `Attendance`, `Grade`, `Invoice`, `Payment`, `PpdbApplicant`.

### 6.6 Real-time & Integrasi Eksternal

- **Socket.IO** untuk notifikasi live (namespace per sekolah untuk isolasi event).
- **Jitsi Meet API** untuk live class (self-hosted atau Jitsi as a Service).
- Storage file (materi, submission, dokumen PPDB): **Supabase Storage** (selaras dengan Supabase Auth yang sudah dipakai) dengan bucket terpisah per jenis dokumen dan access policy berbasis RLS.

---

## 7. Kebutuhan Non-Fungsional

| Aspek              | Kebutuhan                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Isolasi Data**   | Data satu sekolah tidak boleh bisa diakses sekolah lain, baik lewat bug aplikasi maupun query langsung (RLS sebagai pengaman lapis kedua)                                |
| **Skalabilitas**   | Arsitektur harus mendukung penambahan sekolah baru tanpa perubahan skema/deploy ulang                                                                                    |
| **Keamanan**       | Password/token tidak pernah di-log; dokumen PPDB & data siswa (PII) dienkripsi at-rest via Supabase Storage; audit log untuk aksi sensitif (perubahan nilai, pembayaran) |
| **Ketersediaan**   | Target uptime 99% untuk MVP (bukan mission-critical 24/7 di tahap awal)                                                                                                  |
| **Performa**       | Halaman dashboard utama load < 2 detik pada koneksi 4G rata-rata Indonesia                                                                                               |
| **Aksesibilitas**  | Kontras warna & struktur HTML semantik minimal WCAG AA untuk halaman publik (PPDB)                                                                                       |
| **Kepatuhan Data** | Selaras prinsip UU PDP (Pelindungan Data Pribadi) untuk data siswa & PPDB                                                                                                |

---

## 8. Roadmap & Fase Pengembangan

| Fase  | Fokus                             | Output                                          |
| ----- | --------------------------------- | ----------------------------------------------- |
| **0** | Desain data model & multi-tenancy | Skema Prisma final, strategi RLS                |
| **1** | Auth & manajemen tenant           | Onboarding sekolah, SSO Supabase, RBAC berjalan |
| **2** | LMS inti                          | Materi, tugas, submission, penilaian dasar      |
| **3** | Kuis & penilaian                  | Bank soal, auto-grade, rekap nilai              |
| **4** | Modul administratif               | Absensi, rapor, keuangan (SPP manual)           |
| **5** | PPDB                              | Formulir pendaftaran publik & verifikasi        |
| **6** | Live class & real-time            | Integrasi Jitsi, notifikasi Socket.IO           |

MVP yang bisa didemo ke sekolah pertama: **Fase 0–2** selesai (auth multi-role + LMS inti berjalan).

---

## 9. Kemungkinan Pengembangan Lanjutan (Post-MVP)

- Role orang tua siswa aktif (bukan hanya PPDB) untuk memantau nilai/absensi/tagihan anak.
- Payment gateway otomatis (Midtrans/Xendit) untuk SPP.
- Aplikasi mobile (React Native, reuse `packages/types`).
- Analitik prediktif (siswa berisiko drop-out berdasarkan pola absensi/nilai).
- Integrasi dengan Dapodik/sistem kemdikbud jika relevan secara regulasi.

---

## 10. Risiko & Mitigasi

| Risiko                                    | Dampak                                  | Mitigasi                                                                                                                |
| ----------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Scope terlalu besar untuk dikerjakan solo | Proyek tidak pernah selesai/diluncurkan | Ikuti roadmap fase ketat, MVP dulu (Fase 0–2), jangan mulai fase baru sebelum fase sebelumnya stabil                    |
| Kesalahan desain multi-tenancy di awal    | Migrasi besar-besaran di kemudian hari  | Finalisasi skema `school_id` + RLS di Fase 0 sebelum fitur lain dibangun                                                |
| Sekolah enggan pindah dari WhatsApp/Excel | Adopsi rendah                           | Fokus MVP pada fitur yang jelas menghemat waktu guru (penilaian, rekap otomatis), bukan replikasi semua fitur sekaligus |
| Kompleksitas RBAC multi-role              | Bug akses data lintas role/tenant       | Test matrix eksplisit per kombinasi role×aksi, RLS sebagai pengaman tambahan                                            |

---

## 11. Metrik Keberhasilan (MVP)

- Minimal 1 sekolah pilot aktif menggunakan LMS inti (Fase 0–2) selama 1 semester penuh.
- ≥ 70% guru di sekolah pilot rutin menggunakan platform untuk tugas/nilai (bukan hanya login sekali).
- Waktu rekap nilai wali kelas berkurang signifikan dibanding proses manual sebelumnya (diukur via survei kualitatif ke sekolah pilot).

---

_Dokumen ini adalah draft awal dan akan berkembang seiring proses desain teknis (ERD detail, API contract, wireframe) di tahap berikutnya._
