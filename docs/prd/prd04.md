# PRD 4.2: openlms Super-App — LMS + SIS Terpadu untuk SMA/SMK/sederajat Indonesia

**Versi:** 4.2 (Single-School — satu sekolah, tanpa multi-tenant)
**Tanggal:** 6 Agustus 2026
**Status:** Final — dokumen flagship; menggantikan prd01–03 sebagai acuan produk utama
**Pemilik Produk:** Aditya
**Dokumen Sumber:**
- prd01.md (v1.0) — fondasi SaaS LMS+SIS, 9 role, 7 modul, arsitektur — disebut **[v1]**
- prd02.md (v2.0) — Fase 2: ujian online, absensi online, peta modul menyeluruh — disebut **[v2]**
- prd03.md (v3.0) — audit 24 gap G1–G24 + prioritisasi — disebut **[v3]**
- 01-master-prd.md — master terpadu (MVP final, roadmap, NFR) — disebut **[master]**
- 02-technical-architecture.md / 03-database-erd.md / 04-api-contract.md / 05-implementation-plan.md — rujukan teknis — disebut **[tek-02/03/04/05]**
- 06-research-validations.md — riset UU PDP, Dapodik, Kurikulum Merdeka, payroll (PPh 21 TER/BPJS), payment gateway (QRIS/VA), aset & depresiasi, performa (CWV/PWA), regulasi pungutan (Permen 44/2012 & 75/2016), TER PMK 168/2023, KYC gateway, penyusutan fiskal (PMK 72/2023), MA (Kemenag), konkurensi ujian & rate-limit (OWASP) — Topik 1–16 — disebut **[riset-06]**
- 07-ux-design.md — spesifikasi UX/UI — disebut **[ux-07]**
- Arahan Pemilik Produk v4.1 — feature flags, satu metode login, no third-party API, mudah dipakai semua kalangan, fokus keamanan — disebut **[owner-v4.1]**
- Arahan Pemilik Produk v4.2 — aplikasi untuk SATU sekolah; tanpa multi-sekolah / multi-tenant / 1 user di banyak sekolah — disebut **[owner-v4.2]**

> Sifat dokumen: PRD (produk). Tidak berisi kode aplikasi; diagram ASCII hanya untuk memperjelas alur. Tidak mengubah isi dokumen lain; perbedaan penafsiran dengan dokumen sumber diselesaikan di sini dan dicatat di §14.

---

## 1. Ringkasan Eksekutif (BLUF)

**openlms adalah SUPER-APP untuk SMA/SMK/sederajat Indonesia: satu platform, satu akun, satu sumber data untuk seluruh operasional sekolah — dengan fokus inti yang tidak bisa ditawar: BELAJAR & MENGAJAR (LMS).**

- **Inti = LMS.** Kelas, materi, tugas, submission, kuis, bank soal, ujian online, penilaian, e-Rapor, absensi, kalender, dan live class adalah jantung produk. Modul lain (kepegawaian & payroll, aset, pembayaran, kesiswaan, sarpras, perpustakaan, alumni, PPDB, komunikasi) adalah **penunjang** yang dirancang agar tidak pernah mengalahkan kecepatan, kualitas, dan fokus LMS (keputusan posisi §2.2, prinsip §5.0).
- **Super-app, bukan kumpulan modul.** Satu login, satu navigasi per peran, satu sumber data yang saling terhubung (nilai → rapor → portal wali murid → keuangan → payroll), menggantikan kombinasi Google Classroom + Excel + WhatsApp + sistem manual yang dipakai sekolah saat ini [v1 §1.1][v2 §1].
- **Satu sekolah (single-school):** aplikasi dijalankan untuk SATU sekolah — tanpa multi-tenant, tanpa pemisahan data antar-sekolah, tanpa login lintas sekolah, tanpa billing lintas sekolah [owner-v4.2] (§2, §3, §4, §6, §8).
- **RBAC penuh (permission-based + hierarki + scope).** 12 role standar termasuk OPERATOR (menggantikan TATA_USAHA), WAKEPSEK, KEUANGAN, GURU_BK, WALI_MURID (menggantikan ORANG_TUA), CALON_SISWA, PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL, dengan format izin `resource:action[:scope]` (keputusan RBAC §4).
- **Tiga modul baru bernilai tinggi** dituntaskan desainnya di dokumen ini dan dijadwalkan sebagai gelombang 2 (pasca-MVP): **penggajian/payroll** (prd04 **mencabut** penundaan prd02 §4.4 dan [master] §4 — payroll kini wajib dirancang penuh, bukan "di luar cakupan"), **manajemen aset penuh** (inventaris + depresiasi garis lurus + pemeliharaan + audit/opname), dan **pembayaran lengkap** (tagihan multi-jenis, jadwal otomatis, cicilan, denda, refund, rekonsiliasi, arus kas, roadmap payment gateway QRIS/VA).
- **Ringan, cepat, efisien untuk kondisi sekolah Indonesia.** Target Core Web Vitals eksplisit (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1), dashboard < 2 detik di 4G, offline-first minimal (queue absensi QR + cache materi dasar = MVP), kapasitas 500–3.000 user/sekolah, dan arsitektur monolith modular yang cukup dan mudah di-deploy (keputusan performa §7, infrastruktur §8).
- **Mudah setup.** Wizard onboarding 5 langkah + template impor Excel + seed default + dokumentasi non-teknis untuk admin, guru, dan wali murid (§9).
- **Selaras regulasi Indonesia.** Kurikulum Merdeka (CP/ATP/P5), e-Rapor dua-track (mapel + P5) sesuai aplikasi resmi Kemdikbud [riset-06 Topik 3], UU PDP (retensi per kategori, consent data anak, audit trail penuh) [riset-06 Topik 1], PPh 21 skema TER dan BPJS sebagai nilai terkonfigurasi per periode [riset-06 Topik 7], dan ekspor Dapodik berbasis file [riset-06 Topik 2].
- **Kustomisasi fitur (feature flags):** setiap modul & sub-fitur punya saklar on/off aplikasi yang dikendalikan SUPERADMIN; sekolah yang hanya ingin LMS bisa mematikan semua modul lain [owner-v4.1][owner-v4.2] (§5.N).
- **Satu metode login:** Email/Username + Password (self-hosted, Argon2id, JWT httpOnly cookie). Tanpa Google OAuth — paling sederhana untuk semua kalangan & tanpa ketergantungan pihak ketiga [owner-v4.1] (§5.P).
- **Kebijakan Ekosistem Penuh (No Third-Party Feature API):** seluruh fitur diimplementasikan in-house; tidak ada dependensi API/layanan pihak ketiga untuk fitur; infrastruktur (DB, Redis, CDN) boleh managed dan swappable [owner-v4.1] (§5.O).
- **Mudah dipakai semua kalangan:** UI Bahasa Indonesia sederhana, font ≥16px, satu aksi utama per layar, cetak kredensial, panduan pemula (§5.Q, §9).
- **Keamanan & data:** Argon2id, cookie aman, throttle login, RLS, field-level access, enkripsi at-rest, audit — dan feature flag TIDAK pernah melemahkan keamanan (OFF = tolak di API) (§6, §8.3).

Dokumen ini menuntaskan **30 gap** audit prd01–03 dalam 4 kategori (A1 belum ada, A2 struktur, A3 inkonsistensi, A4 NFR) — daftar lengkap dan penanganannya di §14.1.

---

## 2. Visi, Positioning & Diferensiasi

### 2.1 Visi

Satu platform terpadu yang mencakup **seluruh siklus operasional sekolah** — dari PPDB, proses belajar-mengajar (materi, tugas, kuis, ujian), penilaian & rapor, administrasi (absensi, kepegawaian, aset), keuangan (pembayaran), hingga alumni — melayani **SATU sekolah** dari satu codebase; seluruh data milik sekolah tersebut [v1 §1][master §2.1][owner-v4.2].

### 2.2 Positioning (keputusan — menjawab gap A2-2)

- **openlms = Super-App pendidikan jenjang menengah Indonesia.** "Super-app" berarti: satu titik masuk bagi semua peran (siswa, guru, wali kelas/homeroom, operator, keuangan, wakepsek, kepsek, wali murid, calon siswa, mitra industri, admin sistem sekolah) untuk menyelesaikan pekerjaan harian tanpa pindah aplikasi.
- **Fokus inti LMS.** Pernyataan posisi resmi: *"openlms adalah LMS terbaik untuk sekolah Indonesia, yang kebetulan juga menangani administrasi sekolah."* Setiap keputusan scope, roadmap, dan alokasi sumber daya memakai tes ini: *"apakah fitur ini mempercepat/memperkuat belajar-mengajar?"* Jika tidak, fitur penunjang harus ditunda atau dibuat minimal sampai inti LMS stabil (menjawab gap A2-1).
- **Konteks Indonesia sebagai diferensiasi.** Berbeda dari Google Classroom/Moodle, openlms menyatukan LMS dengan modul yang selaras regulasi & operasional lokal: Dapodik (ekspor file), e-Rapor Kurikulum Merdeka dua-track, P5, UU PDP untuk data anak, pembayaran SPP/iuran, payroll guru dengan PPh 21 TER & BPJS, dan aset sekolah [riset-06 Topik 5 — kelemahan kompetitor: tidak ada modul SIS/keuangan/e-Rapor/Dapodik selaras regulasi].
- **Ringan, cepat, hemat kuota.** Dirancang untuk koneksi 4G/sinyal lemah dan kuota terbatas siswa (§7, §8).

### 2.3 Diferensiasi terhadap kompetitor

| Aspek | Google Classroom | Moodle | openlms (prd04) |
|-------|------------------|--------|----------------|
| LMS inti (materi/tugas/kuis/ujian) | Ada | Ada | Ada (inti) |
| SIS (nilai, absensi, rapor, jadwal) | Tidak | Parsial | Ada, terpadu |
| e-Rapor Kurikulum Merdeka dua-track (mapel + P5) | Tidak | Tidak | Ada [riset-06 Topik 3] |
| Keuangan sekolah (SPP/iuran, denda, rekonsiliasi) | Tidak | Tidak | Ada (gelombang 2) |
| Payroll guru (PPh 21 TER, BPJS) | Tidak | Tidak | Ada (gelombang 2) |
| Aset & depresiasi | Tidak | Tidak | Ada (gelombang 2) |
| PPDB + consent data anak | Tidak | Tidak | Ada [v1 §5.6][riset-06 Topik 1] |
| Ekspor Dapodik/ANBK (file) | Tidak | Tidak | Ada [v3 G4][riset-06 Topik 2] |
| Aksesibilitas | Tidak ada klaim WCAG eksplisit | WCAG 2.1 AA | WCAG AA bertahap seluruh halaman [riset-06 Topik 5] |
| Hemat kuota (data-saver) | Parsial | Tidak | Ada [v3 G16][ux-07 §8] |
| Model layanan | Gratis/berbayar per edisi | Self-host (beban sekolah) | **Aplikasi 1 sekolah (single-school)** [owner-v4.2] |

Diferensiasi dikemas sebagai narasi tunggal: **"LMS + SIS + regulasi lokal dalam SATU aplikasi sekolah"** [riset-06 §4].

### 2.4 Target pasar

- **Jenjang:** SMA/SMK/sederajat Indonesia (keputusan: SMA dulu, SMK kondisional — §13 Q2; fondasi LMS berlaku untuk keduanya).
- **Skala:** satu sekolah dengan 500–3.000 user (siswa + guru + staf + wali murid) (keputusan kapasitas — menjawab gap A2-6; dasar [riset-06 Topik 10]) — aplikasi melayani SATU sekolah (bukan banyak sekolah) [owner-v4.2].

---

## 3. Target Pengguna & Role

### 3.1 Dua belas role standar (keputusan RBAC)

Role adalah **kumpulan permission** (bukan sekadar label); wali kelas bukan role tersendiri melainkan **scope override** lewat `Class.homeroom_teacher_id` (keputusan RBAC — menjawab gap A3-4).

| # | Role (kode) | Deskripsi | Kebutuhan utama | Scope default utama |
|---|-------------|-----------|-----------------|---------------------|
| 1 | **SUPERADMIN** | Admin sistem aplikasi sekolah (bukan penyedia SaaS) — pengaturan aplikasi, feature flags, manajemen user, audit, backup [owner-v4.2] | Konfigurasi aplikasi, feature flags, manajemen user, audit, backup | SEKOLAH |
| 2 | **KEPSEK** | Kepala sekolah | Dashboard eksekutif, laporan, rekap payroll, akses BK terbatas [v1 §3][v2 §4.2] | SEKOLAH |
| 3 | **WAKEPSEK** | Wakil kepala sekolah (kurikulum/kesiswaan) | Pengawasan akademik & ujian, jadwal, kedisiplinan [v1 §3][v2 §2.2b] | SEKOLAH |
| 4 | **OPERATOR** | Staf administrasi/TU | Data induk siswa/guru/staf, impor, undangan, verifikasi PPDB, surat [v1 §3][v3 G9] | SEKOLAH |
| 5 | **KEUANGAN** | Staf keuangan | Tagihan & pembayaran, denda, refund, rekonsiliasi, arus kas, payroll run & slip [v1 §3] | SEKOLAH |
| 6 | **GURU** | Pengajar mata pelajaran | Materi, tugas, kuis, ujian, absensi, penilaian; menjadi homeroom (wali kelas) via scope [v1 §3][v2 §3] | KELAS (kelas yang diajar) |
| 7 | **GURU_BK** | Guru bimbingan konseling | Catatan konseling (field-level), kedisiplinan, izin/sakit [v2 §4.2][v3 G14] | SEKOLAH (konseling: KELAS terkait) |
| 8 | **SISWA** | Peserta didik aktif | Materi, tugas, kuis, ujian, absensi, nilai, jadwal, kalender [v1 §3][v2 §2] | SENDIRI + KELAS (kelasnya) |
| 9 | **WALI_MURID** | Orang tua/wali siswa aktif | Portal read-only: nilai, absensi, tagihan anak (tampil saat modul keuangan live); izin anak [v1 §9][v2 §4.9][master §5.2] | SENDIRI (data anak terhubung) |
| 10 | **CALON_SISWA** | Pendaftar PPDB | Formulir, upload dokumen, cek status [v1 §3][v1 §5.6] | SENDIRI (data pendaftaran) |
| 11 | **PEMBIMBING_INDUSTRI** | Pembimbing PKL dari DUDI | Jurnal PKL siswa bimbingan, penilaian [v3 §4.3][03-database-erd §4.1–4.4] | SENDIRI (siswa bimbingannya) |
| 12 | **PENGUJI_EKSTERNAL** | Penguji UKK dari industri | Penilaian rubrik kompetensi [v3 §4.3] | SENDIRI (ujian ditugaskan) |

### 3.2 Mapping role lama → baru (migrasi eksplisit — menjawab gap A3-4)

| Role lama (prd01/02/03 & ERD 03) | Role baru (prd04) | Catatan migrasi |
|----------------------------------|-------------------|-----------------|
| SUPERADMIN | SUPERADMIN | Tanpa perubahan |
| KEPALA_SEKOLAH | KEPSEK | Rename + permission set |
| WAKA | WAKEPSEK | Rename + permission set |
| TATA_USAHA | OPERATOR | Rename + permission set (termasuk import G9, verifikasi PPDB) |
| KEUANGAN | KEUANGAN | Diperluas: denda, refund, rekonsiliasi, payroll |
| GURU | GURU | Tanpa perubahan; **WALI_KELAS dihapus sebagai role** |
| WALI_KELAS (role) | — (hapus) | Diganti `Class.homeroom_teacher_id` (scope override) |
| GURU_BK | GURU_BK | Tanpa perubahan; akses konseling: GURU_BK/WAKEPSEK/KEPSEK (keputusan A3-5) |
| SISWA | SISWA | Tanpa perubahan |
| ORANG_TUA | WALI_MURID | Rename; status portal: **FINAL = MVP read-only** (keputusan A3-1) |
| CALON_SISWA | CALON_SISWA | Tanpa perubahan |
| PEMBIMBING_INDUSTRI | PEMBIMBING_INDUSTRI | Tanpa perubahan |
| PENGUJI_EKSTERNAL | PENGUJI_EKSTERNAL | Tanpa perubahan |

Migrasi data: job migrasi eksplisit memetakan `user_role.role` lama → baru di seed (migrasi TU→OPERATOR, WAKA→WAKEPSEK, KEPALA_SEKOLAH→KEPSEK, ORANG_TUA→WALI_MURID); baris role WALI_KELAS dipindah ke `Class.homeroom_teacher_id` lalu role dihapus. Detail di §4.6.

### 3.3 Hierarki role

Hierarki menentukan **pewarisan permission** dan alur approval, bukan sekadar "lebih tinggi lebih berkuasa" — permission tetap dicek eksplisit per aksi.

```
SUPERADMIN (admin sistem SATU sekolah — konfigurasi penuh, feature flags, audit, backup)
└── dalam satu sekolah:
    KEPSEK (SEKOLAH; inherits read hampir semua modul, rekap payroll, akses BK)
    ├── WAKEPSEK (SEKOLAH; inherits GURU + pengawasan akademik/ujian)
    │   └── GURU (KELAS diajar; homeroom = scope KELAS penuh untuk kelas tsb)
    ├── OPERATOR (SEKOLAH; data induk, impor, undangan, PPDB, surat)
    ├── KEUANGAN (SEKOLAH; keuangan + payroll; KEPSEK hanya rekap)
    └── GURU_BK (SEKOLAH; konseling + kedisiplinan; field-level)
    SISWA (SENDIRI + kelasnya)
    WALI_MURID (SENDIRI: data anak terhubung; read-only)
    CALON_SISWA (SENDIRI: data pendaftaran)
    PEMBIMBING_INDUSTRI (SENDIRI: bimbingan)
    PENGUJI_EKSTERNAL (SENDIRI: penugasan uji)
```

Aturan: hierarki hanya **menambah** permission turunan; permission DENY override (UserPermissionOverride) selalu menang. Approval berlapis (mis. payroll KEUANGAN → rekap KEPSEK; refund KEUANGAN → approval KEPSEK untuk nominal di atas ambang) didefinisikan per alur di §5.E/§5.F.

---

## 4. RBAC Penuh (Permission-Based + Hierarki + Scope)

### 4.1 Model

Tiga dimensi kontrol akses, diterapkan di setiap request (menjawab gap A1-4):

1. **Permission-based**: aksi dikendalikan izin `resource:action[:scope]`, bukan label role. Contoh: `payroll:read:school`, `grade:write:class`, `payslip:read:self`.
2. **Role hierarchy**: role mewarisi permission dari hierarki (§3.3); permission tambahan/dibatalkan via RolePermission.
3. **Scope**: batas data yang boleh diakses — **SENDIRI** (hanya data sendiri/anak/kelas bimbingan), **KELAS** (kelas yang diajar/diampu/diikuti), **SEKOLAH** (seluruh data sekolah).

Format izin: `resource:action:scope`, contoh konkret:

| Permission | Arti | Scope yang valid |
|-----------|------|------------------|
| `grade:write:class` | Menulis nilai di kelas | KELAS, SEKOLAH |
| `payroll:read:school` | Membaca data payroll sekolah | SEKOLAH |
| `payslip:read:self` | Membaca slip gaji sendiri | SENDIRI saja |
| `invoice:write:school` | Membuat/mengubah tagihan sekolah | SEKOLAH |
| `attendance:scan:self` | Scan absensi diri | SENDIRI |
| `exam:token:class` | Generate token ujian per kelas (oleh GURU) | KELAS, SEKOLAH |
| `exam:token:school` | Generate token sesi ujian sekolah PTS/PAS (oleh WAKEPSEK/OPERATOR) | SEKOLAH |
| `asset:audit:school` | Menjalankan opname aset | SEKOLAH |
| `system:write:school` | Mengubah pengaturan aplikasi sekolah | SEKOLAH |

Prinsip scope: jika permission tidak menyebut scope, scope default mengikuti konteks request (siswa → SENDIRI/KELAS; guru → KELAS; staf → SEKOLAH). Seluruh data adalah milik SATU sekolah; scope mengontrol akses per data (SENDIRI/KELAS/SEKOLAH) [owner-v4.2].

### 4.2 Kategori permission (13 kategori, seed)

| # | Kategori | Contoh permission + scope default |
|---|----------|-----------------------------------|
| 1 | Identitas | `user:read:self`, `user:write:self`, `auth:login`, `auth:invitation:accept:self` |
| 2 | Pengaturan & data induk | `app:read:school`, `app:write:school`, `import:run:school`, `invitation:send:school`, `retention:run:school` |
| 3 | Akademik | `class:read:class`, `class:write:school`, `subject:write:school`, `schedule:write:school`, `report:read:class` |
| 4 | LMS | `material:write:class`, `material:read:class`, `assignment:write:class`, `submission:submit:self`, `submission:grade:class` |
| 5 | Ujian | `exam:write:school`, `exam:session:write:school`, `exam:token:class`, `exam:token:school`, `exam:attempt:self`, `exam:grade-esai:class` |
| 6 | Absensi | `attendance:session:write:class`, `attendance:scan:self`, `attendance:record:class`, `permit:request:self`, `permit:verify:class` |
| 7 | Kesiswaan | `counseling:read:class`, `counseling:write:school`, `discipline:record:class`, `extracurricular:write:school` |
| 8 | Keuangan | `invoice:write:school`, `invoice:read:school`, `payment:record:school`, `payment:verify:school`, `refund:approve:school`, `reconciliation:run:school`, `cashflow:read:school` |
| 9 | Aset | `asset:write:school`, `asset:read:school`, `asset:book:self`, `asset:maintenance:write:school`, `asset:audit:school` |
| 10 | Payroll | `payroll:read:school`, `payroll:write:school`, `payroll:run:school`, `payroll:approve:school`, `payslip:read:self`, `payroll:component:write:school` |
| 11 | PPDB | `ppdb:verify:school`, `ppdb:select:school`, `ppdb:enroll:school`, `ppdb:register:public` |
| 12 | SMK | `internship:write:school`, `internship:journal:self`, `competency:grade:school`, `partner:write:school` |
| 13 | Sistem | `audit:read:school`, `monitor:read:school`, `featureflag:write:school`, `rollover:preview:school`, `rollover:execute:school`, `rollover:rollback:school`, `rollover:history:read:school` |

Seed default berisi ~120 permission untuk 12 role (data teknis di 03-database-erd & 04-api-contract §4; prd04 menetapkan model & kategori, angka pasti seed di implementasi).

### 4.3 Data model RBAC (implikasi data)

- **Permission** (global): `id`, `code` (resource:action), `category`, `description`, `is_system`. Di-seed, tidak dihapus dari UI.
- **RolePermission** (global): `role`, `permission_id`, `effect` (ALLOW/DENY), `scope_default`. Sumber kebenaran izin per role.
- **UserRole** (pengganti `UserSchoolRole` — lama, dihapus single-school): `user_id`, `role`, `status`, `invited_by`, `joined_at` — satu-satunya otoritas role; TANPA `active_school`; JWT hanya identitas [owner-v4.2].
- **UserPermissionOverride** (opsional): `user_id`, `permission_id`, `effect` (ALLOW/DENY), `reason`, `expires_at` — pengecualian individual yang tercatat di AuditLog (mis. guru tertentu diberi akses sementara ke modul aset).
- **Guard @RequirePermission('resource:action[:scope]')**: dibaca dari metadata handler; scope di-resolve dari RequestContext (userId, classIds milik user, homeroomClassId). Role-based guard `@Roles(...)` dipertahankan sebagai gula sintaks yang memetakan ke permission set (menjaga kompatibilitas [tek-02 §4.3] dan 04-api-contract).

Alur resolusi permission per request (diagram ASCII):

```
Request → JWT verify → resolve UserRole (cache Redis TTL 60 s [tek-02 §6.2])
  → muat permission set role (cache) → terapkan UserPermissionOverride
  → cocokkan @RequirePermission('resource:action') + scope resolver
  → GAGAL → 403 (format error standar [tek-04 §1.6]) | LULUS → Controller
```

### 4.4 Guard & integrasi teknis

- Guard RBAC diterapkan di setiap query repository [tek-02 §4.2]; RLS PostgreSQL opsional sebagai lapisan kedua (tanpa dimensi tenant) [tek-03 §7].
- Dekorator baru `@RequirePermission` menambahkan pengecekan izin spesifik di atas `@Roles`; endpoint publik ditandai `@Public()` (login, PPDB register) [tek-02 §4.3].
- Field-level access (mis. `CounselingNote.note`, `Payslip.amount`): diimplementasikan sebagai permission `counseling:read:class` + pemfilteran field di service layer, bukan hanya module-level [v2 §6][v3 G14].
- Test matrix role × aksi diperluas menjadi permission × scope × aksi di CI (G6) [master §8 risiko 4].

### 4.5 Hak akses lintas modul (ringkasan RBAC matrix)

Matrix penuh tetap di 04-api-contract §4 (REST) — prd04 mengadopsinya dengan penyesuaian penamaan role (OPERATOR menggantikan TU, WAKEPSEK menggantikan WAKA, WALI_MURID menggantikan ORANG_TUA) dan penambahan baris payroll/aset/refund/rekonsiliasi. Ringkasan keputusan akses:

| Area | OPERATOR | KEUANGAN | GURU | WALI_MURID | KEPSEK | SUPERADMIN |
|------|:--------:|:--------:|:----:|:----------:|:------:|:----------:|
| Data induk & impor | ✓ | ✗ | △ (diri) | ✗ | ✓ (lihat) | ✓ |
| Keuangan & pembayaran | △ (lihat) | ✓ penuh | ✗ | △ (anak, read-only) | △ (rekap) | △ (audit) |
| Payroll | ✗ | ✓ penuh | △ (slip sendiri) | ✗ | △ (rekap) | △ (audit-only) |
| Aset | ✓ kelola | △ (lihat) | △ (booking) | ✗ | ✓ (lihat) | ✓ |
| BK | ✗ | ✗ | ✗ | ✗ | △ (terbatas, audit) | ✗ |
| Audit log | ✗ | ✗ | ✗ | ✗ | ✓ (lihat) | ✓ (lihat) |
| Rollover (tutup tahun ajaran) | △ (preview) | △ (dampak keuangan) | ✗ | ✗ | ✓ | ✓ (execute) |

✓ penuh, △ terbatas (read/scope), ✗ dilarang — semua tetap diawasi RBAC.

### 4.6 Migrasi role eksplisit (data)

Job migrasi di seed/CLI: (1) `TATA_USAHA → OPERATOR`, `WAKA → WAKEPSEK`, `KEPALA_SEKOLAH → KEPSEK`, `ORANG_TUA → WALI_MURID`; (2) baris `WALI_KELAS` → set `Class.homeroom_teacher_id` untuk kelas yang diampu → hapus role; (3) validasi tidak ada role lama tersisa; (4) tulis AuditLog migrasi. Skema ERD 03 tetap berlaku (enum Role diperbarui sesuai §3.1).

---

## 5. Ruang Lingkup Modul (Peta Super-App)

### 5.0 Legenda status & prinsip prioritas (menjawab gap A2-1, A2-2)

| Status | Arti |
|--------|------|
| **[WAJIB MVP]** | Harus selesai sebelum sekolah pilot memegang data sungguhan |
| **[SANGAT DIREKOMENDASIKAN]** | Setelah Fase 2 stabil; sangat menambah nilai adopsi |
| **[DIREKOMENDASIKAN]** | Murah (reuse data) — masuk jika kapasitas tim cukup |
| **[GELOMBANG 2]** | Pasca-MVP; modul penunjang bernilai tinggi (payroll, aset, pembayaran) |
| **[GELOMBANG 3]** | Pasca-MVP lanjutan; kondisional/backlog terpandu pilot |
| **[DITUNDA]** | Definitif ditunda; wajib validasi sebelum dibangun |

Prinsip ringan (dari B-5): satu codebase; **feature flag** per modul (modul penunjang bisa off sesuai kebutuhan sekolah); **reuse data** antar modul (nilai → rapor → portal; absensi → payroll); **bundle frontend di-split per role/route group** agar siswa/guru tidak mengunduh kode modul keuangan [tek-02 §5.1][ux-07 §3]. Tabel ringkasan modul:

| # | Modul | Seksi | Status inti |
|---|-------|-------|-------------|
| M1 | INTI LMS (kelas, materi, tugas, penilaian, kuis/bank soal, ujian online, absensi, e-Rapor, kalender dasar, live class — DITUNDA, §5.A.10) | 5.A | WAJIB MVP + SANGAT DIREKOMENDASIKAN (lihat detail) |
| M2 | Akademik & Kurikulum | 5.B | GELOMBANG 2–3 |
| M3 | Kesiswaan | 5.C | GELOMBANG 3 |
| M4 | Data Induk & Operator | 5.D | WAJIB MVP |
| M5 | Kepegawaian & Penggajian (PAYROLL) | 5.E | GELOMBANG 2 (wajib didesain; prd04 mencabut penundaan) |
| M6 | Keuangan & Pembayaran | 5.F | GELOMBANG 2 (wajib didesain) |
| M7 | Manajemen Aset | 5.G | GELOMBANG 2 (wajib didesain) |
| M8 | Sarpras & Perpustakaan | 5.H | GELOMBANG 3 |
| M9 | PPDB | 5.I | GELOMBANG 3 (sebelum musim PPDB pilot) |
| M10 | Komunikasi & Portal Wali Murid | 5.J | Portal: WAJIB MVP; komunikasi: GELOMBANG 3 |
| M11 | Alumni | 5.K | GELOMBANG 3 |
| M12 | SMK (PKL, UKK, DUDI) | 5.L | GELOMBANG 3 (kondisional SMK) |
| M13 | Platform (auth, pengaturan aplikasi, superadmin, notifikasi, integrasi) | 5.M | WAJIB MVP (dasar) |

### 5.A INTI LMS — BELAJAR & MENGAJAR

Pernyataan posisi: seluruh submodul di bawah adalah **inti produk**. Submodul berstatus WAJIB MVP dan SANGAT DIREKOMENDASIKAN dikerjakan lebih dulu; sisanya ditunda agar fokus & kecepatan LMS terjaga (menjawab gap A2-1).

#### 5.A.1 Kelas (WAJIB MVP)

- **Tujuan:** wadah belajar per kelas fisik + mapel, dengan keanggotaan jelas.
- Fitur: CRUD kelas (rombongan belajar: nama, grade_level, tahun ajaran) [03-database-erd §2.4]; mapel (WAJIB/PILIHAN/KEJURUAN) [§2.5]; `ClassSubject` guru pengampu per kelas-mapel-semester [§2.6]; enrollment siswa per kelas (bulk, validasi duplikat) [§2.8][tek-05 F2-T1/T2]; wali kelas via `homeroom_teacher_id` (scope override, §4) [keputusan RBAC].

#### 5.A.2 Materi (WAJIB MVP)

- **Tujuan:** guru membagikan materi (dokumen, video, link) ke kelas.
- Fitur: upload via signed URL (bucket `materials`) [tek-02 §8]; publish/unpublish; kompresi gambar server-side (data-saver) [v3 G16][tek-02 §10.2]; cache offline materi yang sudah dibuka (PWA minimal) [master §5.2 Grup C]; ukuran file besar diberi peringatan + rekomendasi link eksternal [ux-07 §4.3].

#### 5.A.3 Tugas & Submission (WAJIB MVP)

- **Tujuan:** alur tugas → submit → nilai, inti siklus belajar.
- Fitur: tugas dengan deadline, lampiran, instruksi, `allow_late`, status DRAFT/PUBLISHED/CLOSED [03-database-erd §2.10]; submission siswa (idempotent, `Idempotency-Key`), deteksi terlambat, batalkan-ganti sebelum deadline [tek-04 §1.7][ux-07 §4.3]; penilaian skor + feedback + AuditLog [tek-05 F2-T8].

#### 5.A.4 Penilaian (WAJIB MVP)

- **Tujuan:** satu sumber nilai per siswa-kelas-mapel-semester.
- Fitur: `Grade` dengan type TUGAS/KUIS/UJIAN/PRAKTIK/SIKAP/SUMATIF [03-database-erd §2.16]; rekap nilai per siswa/kelas/mapel; ekspor CSV/PDF [v1 §5.3]; notifikasi nilai keluar (Socket.IO) [tek-02 §7.2].

#### 5.A.5 Kuis & Bank Soal (WAJIB MVP — fondasi ujian)

- **Tujuan:** asesmen formatif harian + gudang soal.
- Fitur: bank soal (PG auto-grade, esai manual, isian singkat, menjodohkan; tag bab/kesukaran) [v1 §5.3][03-database-erd §2.13]; kuis dengan durasi, jadwal buka/tutup, acak urutan [§2.12]; auto-grade instan + manual grade; hasil masuk `Grade`; import soal massal Excel [tek-05 M-EXAM-T1].

#### 5.A.6 Ujian Online (SANGAT DIREKOMENDASIKAN — dasar; keputusan scope B-5)

- **Tujuan:** asesmen sumatif resmi (PTS/PAS/PAT/Ujian Sekolah) berskala besar [v2 §2.1].
- Fitur MVP ujian dasar: bank soal + paket A/B/C + randomisasi soal & opsi per siswa; jadwal sesi (buka/tutup otomatis, sesi ganda/shift); token sesi 6 karakter (tanpa 0/O/1/I, hash SHA-256, sekali pakai per attempt) [03-database-erd §3.3][tek-04 §2.4]; satu akun satu sesi; autosave idempotent (15 detik) + auto-submit server-side; log aktivitas (tab switch, IP, device); auto-grade PG/isian + manual-grade esai side-by-side; analisis butir soal; hasil → `Grade` sumatif → e-Rapor [v2 §2.2][tek-02 §15.1][tek-05 M-EXAM-T1..T12].
- **DITUNDA (definitif):** lock-browser penuh (MVP cukup log-only), **proctoring webcam** — data biometrik adalah data pribadi spesifik UU PDP; butuh consent eksplisit & DPIA [riset-06 Topik 1 & 6][master §10 Q5]. Keputusan dipertahankan dari prd02 §2.2d.
- Wajib lulus load test k6 (p95 < 3 s) sebelum dipakai ujian sungguhan [tek-02 §14][tek-05 M-EXAM-T11].

#### 5.A.7 Absensi (manual WAJIB MVP; QR SANGAT DIREKOMENDASIKAN)

- **Tujuan:** kehadiran akurat per pertemuan/harian, masuk rekap & rapor, menjadi input payroll staf (di §5.E).
- Fitur manual (MVP): guru catat HADIR/IZIN/SAKIT/ALPA/TERLAMBAT per kelas [v1 §5.4][03-database-erd §2.15].
- Fitur QR (SANGAT DIREKOMENDASIKAN): sesi absensi per mapel; QR single-use token, expired 5–10 menit (default 7) [v2 §3][03-database-erd §3.6/3.7]; scan siswa via HP (idempotent, anti-titip: sekali pakai + validasi waktu server; geofencing opsional sebagai lapisan sinyal, bisa di-spoof) [riset-06 Topik 6]; izin/sakit online + upload surat + verifikasi homeroom [v2 §3.2][tek-04 §2.5]; rekap otomatis per siswa/mapel/semester; notifikasi alpa ke homeroom & BK [tek-02 §7.2]; dashboard kedisiplinan (ambang alpa konfigurasi, default 3/bulan) [v2 §3.2]; **offline queue absensi QR = MVP** (IndexedDB + background sync) [master §5.2 Grup C][tek-02 §10].
- DITUNDA: RFID/barcode (butuh hardware); geofencing sebagai kontrol utama; **absensi harian gerbang pagi (geofencing) — opsional per sekolah / DITUNDA (gap dari prd02 §3.1)** [v2 §3.1][riset-06 Topik 6].

#### 5.A.8 e-Rapor dua-track (SANGAT DIREKOMENDASIKAN; format final = keputusan A3-3)

- **Tujuan:** rapor Kurikulum Merdeka yang meniru aplikasi e-Rapor resmi Kemdikbud — **dua produk terpisah**: rapor mapel dan rapor P5 [riset-06 Topik 3].
- Track 1 (mapel): nilai TP/sumatif per mapel, deskripsi, ekskul, prestasi, catatan wali kelas [riset-06 Topik 3].
- Track 2 (P5): tema, dimensi, elemen, sub-elemen, target capaian — di MVP disiapkan sebagai wadah (isi manual); modul penilaian P5 penuh ditunda (G2) [tek-05 M-RAPOR-T2].
- Konsolidasi otomatis dari `Grade` (TUGAS/KUIS/UJIAN) + absensi [tek-05 M-RAPOR-T1]; template + ekspor PDF (bucket `exports`, `DataExportLog`) [03-database-erd §4.7]; **validasi format dengan sekolah pilot sebelum ekspor massal** [tek-05 M-RAPOR-T4]; dukungan ekspor/impor nilai dengan aplikasi e-Rapor resmi (file), bukan pengganti aplikasi tersebut [riset-06 Topik 3].

#### 5.A.9 Kalender (dasar per-modul = MVP; terpadu = GELOMBANG 2 — keputusan A1-6/G24)

- **Tujuan:** satu tampilan jadwal per user.
- MVP: kalender dasar per modul (jadwal pelajaran, deadline tugas, sesi ujian) digabung dalam satu tampilan read-only [v3 G24].
- GELOMBANG 2: kalender terpadu lintas modul penuh (SPP jatuh tempo, ekskul, PKL, pembayaran) — dibangun setelah modul penunjang live (keputusan A1-6/G24), sejalan dengan W2-KALENDER (§10) dan disposisi G24 (§14.4).

#### 5.A.10 Live Class (DITUNDA — keputusan owner-v4.1)

- **Tujuan:** kelas tatap muka virtual.
- **Status & isi:** **DITUNDA (keputusan owner-v4.1 — no third-party):** video conference TIDAK menggunakan Jitsi/Google Meet/Zoom (third-party API). Jika dibangun di masa depan: WebRTC self-hosted (signaling in-house, mesh untuk grup kecil) sebagai fitur flag; hingga saat itu live class = tautan manual yang diisi sekolah (bukan integrasi API). [owner-v4.1]

### 5.B Akademik & Kurikulum

- **Tujuan:** struktur kurikulum & jadwal.
- Jadwal pelajaran (GELOMBANG 2): `ScheduleEntry` + validasi bentrok guru/ruang [03-database-erd §2.7][tek-05 F2-T3].
- Kurikulum Merdeka (GELOMBANG 2): dukungan CP per fase (E-F untuk SMA/SMK), TP, ATP sebagai referensi mapel [riset-06 Topik 3].
- P5 (GELOMBANG 3 — G2): perencanaan projek, penilaian dimensi/elemen, rapor P5 terpisah; bukan mapel; alokasi waktu terpisah sekitar 20–30% JP [riset-06 Topik 3].
- Asesmen diagnostik (GELOMBANG 3 — G3): kognitif (pemetaan kemampuan awal) & non-kognitif (psikologis/sosial), output kelompok belajar, bukan nilai akhir [riset-06 Topik 3].
- Bimbingan karir/SNBP-SNBT (GELOMBANG 3 — G5): tracking nilai rapor untuk syarat SNBP.

### 5.C Kesiswaan

- BK (GELOMBANG 3): `CounselingNote` — akses field-level GURU_BK/WAKEPSEK/KEPSEK (keputusan A3-5), audit log akses [v2 §4.2][v3 G14][03-database-erd §3.9].
- Tata tertib & poin (GELOMBANG 3): `DisciplinePoint`/`DisciplineRecord`, akumulasi poin, notifikasi wali murid [v2 §4.2][03-database-erd §3.10/3.11].
- Ekskul & OSIS (GELOMBANG 3): pendaftaran, presensi, prestasi/piagam; OSIS prioritas rendah [v2 §4.2].

### 5.D Data Induk & Operator

- **Tujuan:** satu sumber data induk (siswa, guru/staf, kelas, rombel) + impor migrasi (WAJIB MVP — G9).
- Fitur: CRUD data siswa (NISN), guru/staf (NUPTK), kelas & rombel; wizard impor Excel + validasi + preview + deteksi duplikat (`ImportBatch`/`ImportError`) [03-database-erd §4.10/4.11][tek-05 F1-T5]; undangan guru/siswa/staf [tek-04 §2.1]; pengaturan sekolah (tahun ajaran, ambang alpa, toggle fitur) [ux-07 §3.4].

### 5.E Kepegawaian & Penggajian (PAYROLL) — [GELOMBANG 2, wajib didesain]

> **Pencabutan penundaan (keputusan A3-2):** prd02 §4.4 dan [master] §4 menyatakan payroll "di luar cakupan" karena kompleksitas PPh 21/BPJS. prd04 **mencabut** pernyataan itu: payroll adalah modul resmi dengan desain penuh di bawah, dijadwalkan sebagai gelombang 2 pasca-MVP dengan prioritas tinggi. Seluruh angka pajak/BPJS adalah **nilai terkonfigurasi per periode** (bukan hardcode) dan divalidasi sebelum build (open items §13) [riset-06 Topik 7].

#### 5.E.1 Master kepegawaian & komponen gaji

- **Data induk:** `Staff` (NIP/NUPTK, jabatan, pendidikan, sertifikasi, status) [03-database-erd §3.15]; `JobPosition` (jabatan: GURU, OPERATOR, KEUANGAN, BK, WAKEPSEK, KEPSEK, LAINNYA; definisi tunjangan jabatan default).
- **PayrollComponent** (master komponen gaji; kategori & kode standar):

| Kategori | Kode standar | Catatan |
|----------|--------------|---------|
| Tunjangan tetap | GAJI_POKOK, TUNJANGAN_TETAP, TUNJANGAN_JABATAN, TRANSPORT, MAKAN | Dasar penghitungan BPJS Kesehatan & PPh |
| Potongan | PPH21-TER, BPJS_KESEHATAN, BPJS_JHT, BPJS_JP, IURAN, PINJAMAN | Dipotong dari pendapatan kotor |
| Variabel | HONOR_MENGAJAR (per jam/JTM), LEMBUR | Dihitung per bulan dari data kehadiran/kinerja |

- **SalaryStructure** per pegawai: komponen + besaran/rumus + `effective_from`; riwayat revisi gaji tercatat.

#### 5.E.2 Payroll run bulanan

Alur state machine (semua perubahan dicatat AuditLog):

```
PayrollRun DRAFT
  → tarik kehadiran StaffAttendance bulan berjalan
  → hitung komponen variabel (HONOR_MENGAJAR × JTM, LEMBUR)
  → hitung potongan & pajak (PPh 21 TER, BPJS) — nilai terkonfigurasi
  → validasi aturan (gaji net ≥ UMP regional — nilai konfigurasi; peringatan bila di bawah)
  → approval 1: KEUANGAN
  → approval 2: rekap KEPSEK (ringkasan, bukan detail per pegawai)
  → status PAID → generate Payslip digital → notifikasi pegawai
```

Entitas: `PayrollRun` (periode, status, total), `PayrollRunItem` (per pegawai: pendapatan, potongan, net), `Payslip` (slip digital per pegawai, versi/riwayat, field-level access). Idempotensi: job payroll run memakai kunci periode (satu run per bulan per sekolah); regenerate hanya untuk item yang diubah via revisi.

#### 5.E.3 PPh 21 skema TER & BPJS (nilai terkonfigurasi — kutipan riset-06 Topik 7)

Semua tarif/ceiling di bawah disimpan sebagai **konfigurasi per periode** (tabel konfigurasi pajak/BPJS dengan periode berlaku), bukan hardcode. Contoh nilai per 2026 (sumber: riset-06 Topik 7; **nilai contoh per 2026 — wajib diverifikasi saat build, lihat open items §13**):

- **PPh 21 TER** (PP 58/2023 + PMK 168/2023, berlaku 2026): TER harian — 0% untuk penghasilan ≤ Rp450.000/hari; 0,5% untuk > Rp450.000 s.d. Rp2.500.000/hari; > Rp2.500.000/hari → tarif Pasal 17 × 50%. TER bulanan kategori A/B/C untuk pegawai tetap + **rekonsiliasi Desember** (tabel lengkap di PDF PMK 168/2023 — open item §13 Q15). **Struktur TER kategori A/B/C + TER harian + DPP 50% untuk bukan pegawai (honorarium) + PNS final 15% — lihat riset-06 Topik 12; tabel penuh dari PDF PMK 168/2023 saat build.** Tarif & ceiling wajib terkonfigurasi per periode [riset-06 Topik 7].
- **BPJS Kesehatan PPU**: 5% (4% pemberi kerja + 1% pekerja); ceiling upah Rp12.000.000; dasar = gaji pokok + tunjangan tetap (**lembur/tunjangan tidak tetap tidak termasuk**); tidak ada kenaikan Apr–Agu 2026 [riset-06 Topik 7].
- **BPJS Ketenagakerjaan** (sumber resmi BPJamsostek Des 2025): JHT 3,7% pemberi kerja + 2% pekerja; JKK 0,24%–1,74% sesuai tingkat risiko (PP 6/2025); JKM 0,3%; JP 2% pemberi kerja + 1% pekerja (ceiling Rp10.547.000); JKP 0,22% pemerintah + rekomposisi JKK 0,14% + JKM 0,10% [riset-06 Topik 7].

#### 5.E.4 Slip gaji digital (format standar)

Struktur slip (contoh per riset-06 Topik 7; **nilai contoh per 2026 — wajib diverifikasi saat build, lihat open items §13**):

| Blok | Isi |
|------|-----|
| Pendapatan | Gaji pokok, tunjangan tetap, tunjangan tidak tetap (honor mengajar, lembur) |
| Potongan | PPh 21 (TER), BPJS Kesehatan 1%, JHT 2%, JP 1%, iuran, pinjaman |
| Beban pemberi kerja (informatif) | BPJS Kes 4%, JHT 3,7%, JKK, JKM, JP 2% |
| Total | Kotor, total potongan, **net diterima** |

Slip dapat diunduh PDF (bucket ekspor atau bucket payroll khusus) dan dilihat pegawai (scope `payslip:read:self`).

#### 5.E.5 Batas akses & laporan payroll

- **KEUANGAN**: penuh (master, run, slip semua pegawai, laporan).
- **SUPERADMIN**: audit-only (tidak mengubah data sekolah).
- **KEPSEK**: rekap/ringkasan (total beban gaji, komparasi per bulan), bukan detail per pegawai (privasi gaji).
- **Pegawai**: slip sendiri (field-level; tidak melihat slip rekan).
- Laporan: rekap gaji per unit/jabatan, beban gaji per periode, komparasi bulanan, rekap potongan PPh 21 & BPJS (untuk pelaporan), arsip slip; AuditLog seluruh perubahan master & run.

### 5.F Keuangan & Pembayaran — [GELOMBANG 2, wajib didesain]

#### 5.F.1 Tagihan multi-jenis & penjadwalan otomatis

- `InvoiceType` diperluas: **SPP, UANG_KEGIATAN, UANG_DAFTAR, UANG_SERAGAM, UANG_OSIS, DENDA, LAINNYA** (keputusan B-4; perluasan dari 03-database-erd §2.17).
- **Penjadwalan SPP bulanan otomatis**: job idempotent per periode (generate invoice per siswa aktif per bulan dari template tagihan; kunci periode bulan-tahun; tidak menduplikasi bila dijalankan ulang) [B-4][tek-02 §11 async queue].
- Tagihan massal per kelas/angkatan; diskon; jatuh tempo; `invoice_no` unik per sekolah [03-database-erd §2.17][tek-04 §2.7].
- **Posisi sekolah negeri (keputusan):** sesuai Permendikbud 44/2012 (pungutan) & 75/2016 (komite) yang isi batang tubuhnya **belum diverifikasi** [riset-06 Topik 8], untuk sekolah negeri modul diposisikan sebagai **"pencatatan iuran komite/transparansi"**, bukan janji "SPP". SPP dominan untuk sekolah swasta. (Open item §13 Q14.)

#### 5.F.2 Pembayaran parsial/cicilan & alokasi

- Pembayaran bisa **parsial/cicilan**: `Payment` per transaksi; **payment allocation** memetakan pembayaran ke invoice (sebagian/bayar muka), outstanding = amount − alokasi; status invoice PENDING/PARTIAL/PAID/OVERDUE [03-database-erd §2.18 diperluas].
- Pencatatan manual + upload bukti (bucket `payment-proofs`) + verifikasi oleh KEUANGAN; idempotent (`Idempotency-Key`) [tek-04 §1.7][tek-02 §7.2 event `payment:confirmed`].

#### 5.F.3 Denda keterlambatan otomatis

- **LateFeeRule** (per sekolah/per jenis tagihan): grace period (hari setelah jatuh tempo), tipe denda (NOMINAL tetap / PERSEN per hari dari sisa tagihan), nilai, denda maksimum opsional; bisa **dihapus manual** oleh KEUANGAN dengan alasan (AuditLog).
- Job harian menghitung denda untuk invoice OVERDUE; denda menjadi invoice tipe DENDA terpisah (agar transparan), bukan mengubah pokok.

#### 5.F.4 Refund

- Alur: alasan refund (kelebihan bayar, pembatalan, mutasi), approval berlapis (KEUANGAN; KEPSEK untuk nominal di atas ambang konfigurasi), metode (transfer/tunai), status refund, pencatatan di arus kas keluar; idempotent; AuditLog.

#### 5.F.5 Bukti, verifikasi & rekonsiliasi

- Bukti & verifikasi: upload bukti, verifikasi manual KEUANGAN, status pembayaran.
- **Rekonsiliasi**: import mutasi bank (CSV dari bank/VA), cocokkan otomatis dengan `Payment` (referensi/no. invoice, nominal, tanggal) → status **MATCHED / UNMATCHED** → resolusi manual; laporan rekonsiliasi per periode; entitas baru `ReconciliationBatch`/`ReconciliationItem` (gelombang 2).

#### 5.F.6 Arus kas

- Kas masuk (pembayaran terverifikasi), kas keluar (refund, pengeluaran), outstanding per periode; laporan per periode/kelas; **keputusan A3-8:** fokus laporan **arus kas** (bukan RAB/anggaran multi-approval yang kompleks — prd02 §4.7 prioritas rendah; RAB bisa menyusul di gelombang 3).

#### 5.F.7 Roadmap payment gateway (QRIS/VA)

**Keputusan owner-v4.1:** pembayaran **manual-first** (tunai/transfer/bank + bukti upload + rekonsiliasi file CSV) adalah jalur DEFAULT dan TIDAK bergantung gateway. Payment gateway (QRIS/VA) adalah **fitur opsional (feature flag, OFF default)** yang hanya diaktifkan jika sekolah meminta — bukan dependensi aplikasi. Nama Midtrans/Xendit pada tabel di bawah adalah **penyedia contoh untuk fitur opsional — BUKAN dependensi**; provider final dipilih saat fitur diaktifkan oleh sekolah. [owner-v4.1] (§5.O)

| Item | Nilai terkonfigurasi / keputusan | Sumber |
|------|----------------------------------|--------|
| QRIS MDR kategori pendidikan | 0,6% (reguler 0,7%) | riset-06 Topik 8 |
| VA | Midtrans sekitar Rp4.000/transaksi vs Xendit sekitar Rp13.000/transaksi; keduanya punya recurring/subscription | riset-06 Topik 8 |
| KYC merchant | Checklist KYC di konsol SUPERADMIN: akta + SK Kemenkumham/AHU + NPWP + NIB + rekening atas nama sekolah/yayasan + URL aplikasi aktif [riset-06 Topik 13] | riset-06 Topik 8, 13 |
| Model fee | **Open decision §13 Q13**: (a) sekolah tanggung, (b) ditambahkan nominal ke tagihan, (c) hibrida | riset-06 Topik 8 |
| Timing | GELOMBANG 2 akhir / GELOMBANG 3; pencatatan manual tetap tersedia (tidak wajib gateway) | v1 §4.2, diperbarui |

> Nilai di atas adalah **contoh per 2026** — wajib diverifikasi saat build (lihat open items §13). Sumber utama: riset-06 Topik 8.

### 5.G Manajemen Aset — [GELOMBANG 2, wajib didesain]

#### 5.G.1 Inventaris & kategori

- `AssetCategory`: **RUANG, LAB, ALAT, KENDARAAN, PERALATAN_IT, LAINNYA** (perluasan dari 03-database-erd §3.17 — keputusan A3-6).
- `Asset`: kode unik, nama, **merk**, **tahun_perolehan**, **harga_perolehan**, lokasi, **penanggung_jawab_id**, **masa_manfaat_bulan**, **sumber_dana** (BOS/APBD/SWADANA), kondisi (BAIK/RUSAK_RINGAN/RUSAK_BERAT/MAINTENANCE), status (AVAILABLE/BOOKED/MAINTENANCE/RETIRED).

#### 5.G.2 Depresiasi garis lurus (PSAK 16; dihitung saat laporan — efisien)

- Rumus: `nilai_buku = harga_perolehan − (harga_perolehan / masa_manfaat_bulan × bulan_berjalan)` (nilai sisa default 0, konfigurasi).
- **Tidak disimpan per bulan**; dihitung saat laporan untuk bulan berjalan — efisien dan bebas drift (keputusan B-3).
- Umur manfaat default (nilai konfigurasi per kategori; contoh riset-06 Topik 9 / PSAK 16 — **nilai contoh per 2026; wajib diverifikasi saat build, lihat open items §13 Q17**): gedung 20–50 tahun, kendaraan 8–10, komputer 3–4, meubelair 5–10, alat lab 5–10.
- Untuk laporan fiskal (opsional): kelompok harta PMK 72/2023 (1: 4 th, 2: 8 th, 3: 16 th, 4: 20 th; bangunan 20/10 th; default Kelompok 3) — riset-06 Topik 14.
- Laporan: daftar aset + nilai buku, rekap depresiasi per periode/kategori.

#### 5.G.3 Peminjaman/booking, pemeliharaan, audit/opname

- `AssetBooking` (integrasi prd02 §4.5): booking ruang/alat dengan status PENDING/APPROVED/REJECTED/CANCELLED/COMPLETED; bentrok jadwal dicek [03-database-erd §3.18].
- `AssetMaintenance` (entitas baru): jadwal perawatan, biaya, status MAINTENANCE, riwayat.
- `AssetAudit` (entitas baru): **opname berkala** — daftar aset yang dicocokkan fisik vs buku, catat **selisih** (hilang/rusak/kelebihan), reklasifikasi RETIRED, approval KEPSEK; AuditLog.

### 5.H Sarpras & Perpustakaan

- Perpustakaan (GELOMBANG 3): katalog buku, peminjaman/pengembalian, reminder jatuh tempo [v2 §4.6][03-database-erd §3.19/3.20].
- Sarpras lain (GELOMBANG 3): sesuai kebutuhan pilot [v2 §8 #6].

### 5.I PPDB

- GELOMBANG 3 (jadwal-dependent; sebelum musim PPDB sekolah pilot) [master §5.3]: formulir publik 4 langkah (data calon → data ortu → dokumen → consent & konfirmasi) [v1 §5.6][ux-07 §4.8]; verifikasi dokumen oleh OPERATOR; seleksi & pengumuman; lolos → akun siswa aktif + enroll; **consent data anak wajib + timestamp + bukti** (Pasal 22/24 UU PDP) [riset-06 Topik 1][03-database-erd §4.9]; tracking token; arsip sesuai retensi [riset-06 Topik 1].

### 5.J Komunikasi & Portal Wali Murid

- **Portal Wali Murid = WAJIB MVP (read-only)** — keputusan FINAL (A3-1, selaras §13 Q8): **nilai + absensi anak read-only di MVP**; **tagihan anak tampil saat modul keuangan live (gelombang 2)**; izin/sakit anak; notifikasi [v2 §4.9][master §5.2 Grup C][tek-05 M-PORTAL-T1..T3][ux-07 §3.10/5.19]. Perubahan status 3× di dokumen lama diselesaikan: FINAL = MVP.
- Komunikasi umum (GELOMBANG 3): pengumuman broadcast per role, surat-menyurat digital + approval; **tanda tangan digital sederhana (approval flow) — DITUNDA** (dicatat di sini agar tidak hilang tanpa jejak; diprioritaskan ulang bila pilot membutuhkan) [v2 §4.9][03-database-erd §3.21/3.22].

### 5.K Alumni

- GELOMBANG 3: direktori alumni, tracking studi lanjut/karier (akreditasi & networking) [v2 §4.8]; data lulusan diarsipkan sesuai retensi [riset-06 Topik 1].

### 5.L SMK (PKL, UKK, DUDI)

- GELOMBANG 3, **kondisional: hanya jika target pasar mencakup SMK** dan wajib validasi ke sekolah SMK riil sebelum desain [v3 §8 #3][master §10 Q2].
- PKL/Prakerin: penempatan di DUDI, jurnal harian dari HP, penilaian pembimbing industri (role PEMBIMBING_INDUSTRI, akses hanya siswa bimbingan) + guru pembimbing [v3 §4.3][03-database-erd §4.1–4.4].
- UKK: rubrik checklist kompetensi, penguji eksternal (PENGUJI_EKSTERNAL) [v3 §4.3][03-database-erd §4.5/4.6].
- Direktori mitra DUDI + riwayat kerja sama [v3 §4.3].

### 5.M Platform

- **Auth (WAJIB MVP):** satu metode login — Email/Username + Password self-hosted (§5.P); `UserRole` sebagai otoritas role; tidak ada multi-sekolah; seluruh user berada di SATU sekolah [owner-v4.2].
- **Feature flags (WAJIB MVP):** saklar fitur aplikasi dikendalikan SUPERADMIN (§5.N).
- **Konsol admin sistem sekolah (GELOMBANG 2):** pengaturan aplikasi, feature flags, manajemen user, audit log, monitoring teknis & statistik adopsi fitur dalam sekolah [owner-v4.2]. Di MVP: monitoring dasar teknis + statistik adopsi.
- **Notifikasi & real-time (WAJIB MVP dasar):** Socket.IO namespace tunggal (siap multi-instance), event terstandar (assignment:new, exam:start, attendance:alpa, invoice:due, payment:confirmed, dsb.) [v1 §5.7][tek-02 §7]; notification center.
- **Integrasi eksternal:** ekspor Dapodik/ANBK via file (GELOMBANG 2 — mulai file Excel/CSV terformat, bukan API langsung; `DataExportLog`) [v3 G4][riset-06 Topik 2]; Live class ditunda; jika dibangun = WebRTC self-hosted (tidak ada Jitsi/third-party) (§5.A.10, §5.O); payment gateway opsional, OFF default (§5.F.7, §5.O); import migrasi (WAJIB MVP) [v3 G9].

### 5.N Feature Flags — Global untuk 1 Sekolah (keputusan owner-v4.1; disederhanakan [owner-v4.2])

- **Tujuan:** setiap fitur dapat diaktifkan/nonaktifkan secara global oleh **SUPERADMIN** (admin sistem sekolah) — kustomisasi sesuai kebutuhan (mis. sekolah yang hanya ingin LMS → seluruh modul penunjang OFF). Keputusan [owner-v4.1], disederhanakan [owner-v4.2].
- **Data model:** `FeatureFlag` (global: `key`, `kategori`, `deskripsi`, `default_enabled`, `config_schema` Json, `locked` Boolean, `is_system`); **`AppFeatureSetting`** (`feature_key`, `enabled`, `config` Json, `updated_by`, `updated_at`, `AuditLog`) — pengganti toggle per sekolah (tanpa dimensi sekolah). SUPERADMIN dapat **mengunci** fitur (`locked = true` → fitur tidak bisa diubah; berlaku untuk fitur DITUNDA agar tidak diaktifkan sebelum dibangun).
- **Daftar key fitur (default mengikuti status prd04):**

| Kategori | Key | Default |
|----------|-----|---------|
| LMS (inti, system) | LMS_BASE | ON (system, locked) |
| LMS | LMS_MATERIAL | ON |
| LMS | LMS_ASSIGNMENT | ON |
| LMS | LMS_QUIZ | ON |
| LMS | LMS_BANK_SOAL | ON |
| LMS | LMS_EXAM | ON |
| LMS | LMS_EXAM_TOKEN | ON |
| LMS | LMS_EXAM_RANDOMIZE | ON |
| LMS | LMS_ABSENSI_MANUAL | ON |
| LMS | LMS_ABSENSI_QR | ON |
| LMS | LMS_ABSENSI_GEOFENCE | OFF (config: radius, enabled_by_school) |
| LMS | LMS_ERAPOR | ON |
| LMS | LMS_KALENDER | ON |
| LMS | LMS_LIVE_CLASS | OFF (locked — DITUNDA) |
| Akademik | ACADEMIC_SCHEDULE | OFF |
| Akademik | KURIKULUM_MERDEKA | OFF |
| Akademik | P5 | OFF |
| Akademik | ASESMEN_DIAGNOSTIK | OFF |
| Kesiswaan | BK | OFF |
| Kesiswaan | TATA_TERTIB | OFF |
| Kesiswaan | EKSKUL | OFF |
| Kesiswaan | OSIS | OFF |
| Kepegawaian | STAFF_ABSENSI | OFF |
| Payroll | PAYROLL | OFF |
| Keuangan | FINANCE_INVOICE | OFF |
| Keuangan | FINANCE_PAYMENT | OFF |
| Keuangan | FINANCE_CICILAN | OFF |
| Keuangan | FINANCE_DENDA | OFF |
| Keuangan | FINANCE_REFUND | OFF |
| Keuangan | FINANCE_REKONSILIASI | OFF |
| Keuangan | FINANCE_GATEWAY | OFF (opsional; aktif hanya atas permintaan sekolah) |
| Aset | ASSET_INVENTARIS | OFF |
| Aset | ASSET_DEPRESIASI | OFF |
| Aset | ASSET_BOOKING | OFF |
| Aset | ASSET_MAINTENANCE | OFF |
| Aset | ASSET_AUDIT | OFF |
| Sarpras & Perpustakaan | LIBRARY | OFF |
| PPDB | PPDB | OFF |
| Komunikasi | ANNOUNCEMENT | OFF |
| Komunikasi | SURAT | OFF |
| Komunikasi | PARENT_PORTAL | ON |
| Platform | NOTIFICATION | ON |
| Alumni | ALUMNI | OFF |
| SMK | SMK_PKL | OFF |
| SMK | SMK_UKK | OFF |
| SMK | SMK_DUDI | OFF |
| Platform | DATA_SAVER | ON |
| Engagement | GAMIFIKASI | OFF (locked — DITUNDA) |
| LMS (analisis) | PLAGIARISM_CHECK | OFF (locked — DITUNDA) |
| Analisis | LEARNING_ANALYTICS | OFF (locked — DITUNDA) |
| Platform | OFFLINE_PWA | OFF (locked — DITUNDA) |
| Platform | SUPERVISOR_CONSOLE | ON (konsol flag MVP; monitoring/statistik tetap gelombang 2) |
| Platform | ACADEMIC_ROLLOVER | ON (rollover tahun ajaran; OFF = wizard disembunyikan, API tolak FEATURE_DISABLED) |

> Aturan default: **WAJIB MVP = ON**; **SANGAT DIREKOMENDASIKAN = ON**; **GELOMBANG 2/3 = OFF**; **DITUNDA = OFF locked**. `LMS_BASE` adalah flag system (tidak bisa dimatikan). Pengecualian: flag pengelolaan flag (SUPERVISOR_CONSOLE) dan flag inti platform wajib ON di MVP. Daftar di atas adalah kunci awal; key baru ditambahkan saat fitur dibangun.

- **Perilaku saat OFF:** UI/menu disembunyikan; route diblokir (redirect/404); **API menolak dengan kode `FEATURE_DISABLED` (403)**; data tetap tersimpan & tidak dihapus; job terjadwal (SPP bulanan, payroll) dilewati; RBAC/security tetap berlaku — **flag tidak pernah melewati keamanan**.
- **Konsol:** daftar saklar fitur aplikasi; toggle; lock; audit log semua perubahan (`AuditLog`).
- **Config per flag (contoh):** `LMS_ABSENSI_GEOFENCE` (radius, enabled_by_school), `FINANCE_GATEWAY` (provider: none), `LMS_EXAM` (proctoring: log-only), `PAYROLL` (periode, ambang approval).
- **Use case:** "Sekolah hanya LMS" → SUPERADMIN mematikan semua modul penunjang sehingga aplikasi berperilaku sebagai LMS murni; "Sekolah ingin payroll" → ON `PAYROLL` + `STAFF_ABSENSI`.

### 5.O Kebijakan Ekosistem Penuh (No Third-Party Feature API) — keputusan owner-v4.1

- **Definisi:** aplikasi TIDAK boleh bergantung pada API/layanan pihak ketiga untuk menjalankan fitur. Seluruh logika fitur diimplementasikan **in-house** (auth, storage, live class, payment, email/SMS, maps, search, notifikasi, observability). Keputusan [owner-v4.1].
- **Implikasi (dihapus vs baru):**

| Domain | Sebelumnya (dihapus) | Baru |
|--------|----------------------|------|
| Auth | Google OAuth / Supabase Auth | Email/Username + Password self-hosted (§5.P) |
| Storage | Supabase Storage | Object storage self-managed (MinIO-compatible / local disk + backup) atau managed infra S3 — akses via signed URL dari API kita |
| Live class | Jitsi / Zoom / Google Meet | DITUNDA; jika dibangun = WebRTC self-hosted (§5.A.10) |
| Payment | Midtrans / Xendit | Manual-first + rekonsiliasi file CSV; gateway opsional flag OFF (§5.F.7) |
| Email/SMS | (tidak pernah ada — konfirmasi) | Tidak digunakan; reset password via OPERATOR |
| Maps | Google Maps | Native Geolocation API browser + hitung radius in-house |
| Search | API eksternal | PostgreSQL full-text (`pg_trgm`) |
| Notifikasi | FCM / WhatsApp API | Socket.IO + notification center in-house |
| Observability | Sentry (opsional) | Structured log + Prometheus/Grafana self-hosted; Sentry = opsional non-dependensi (hanya jika diaktifkan; default mati; tidak pernah menghalangi fitur) |

- **Yang BOLEH managed (infrastruktur, bukan API fitur; tetap swappable):** managed PostgreSQL, Redis, object storage, CDN. Pemilihan infra harus mendukung fallback self-host agar "ekosistem penuh" tidak terkunci vendor.

### 5.P Autentikasi — Satu Metode (Email/Username + Password) — keputusan owner-v4.1

- **Satu metode login:** kolom "Email atau Username" + password. Username bisa email/NISN/telepon; **Username/email login wajib unik dalam aplikasi** (satu sekolah — tanpa duplikat lintas sekolah); dicatat untuk sinkronisasi 04-api-contract. Tanpa Google OAuth, tanpa SMS OTP (no third-party) [owner-v4.1].
- **Keamanan:** hash **Argon2id** (rekomendasi OWASP); JWT access (15–60 mnt) di **httpOnly + Secure + SameSite=Lax cookie**; refresh token rotating (di-hash saat simpan), revoke saat logout/peristiwa keamanan.
- **Login throttle:** per username+IP; 5 gagal → lockout 15 menit (konfigurasi); audit log upaya login.
- **Kredensial awal:** OPERATOR membuat user + password default (generate), dapat dicetak/diekspor; ubah password wajib saat login pertama (opsional).
- **Reset password:** oleh OPERATOR/admin sekolah (in-app) — tanpa email/SMS eksternal; password sementara sekali pakai.
- **Tanpa multi-sekolah:** seluruh user terdaftar di SATU sekolah; tidak ada school switcher; username/email unik dalam aplikasi.

### 5.Q Usability untuk Semua Kalangan + Fokus Keamanan (keputusan owner-v4.1)

- **UI:** Bahasa Indonesia sederhana (tanpa jargon); font ≥16px; target sentuh ≥44px; satu aksi utama per layar; pesan error jelas & membimbing; form toleran (validasi lembut).
- **Pemula/kudet:** panduan langkah demi langkah; cetak kredensial & kartu login untuk siswa/ortu; tur interaktif 3 langkah; tombol bantuan kontekstual.
- **Perangkat:** responsif mobile-first; ringan di HP low-end & 4G (data-saver, kompresi, lazy load) [§7].
- **Keamanan (ringkasan):** Argon2id, cookie aman, throttle, RLS (opsional), field-level access, enkripsi at-rest, minimisasi PII, AuditLog, UU PDP [§6]; **flag OFF = tolak API** (tidak pernah melemahkan keamanan) [§5.N].

### 5.R Siklus Tahun Ajaran (Rollover) — menutup gap Q21 [keputusan]

**1. Tujuan & konsep**

Menutup tahun ajaran berjalan dan menyiapkan tahun berikut secara terkendali — naik kelas, tinggal kelas, kelulusan, rombel baru, PPDB, template akademik & keuangan — tanpa kehilangan data historis.

- **Tahun ajaran = entitas kelas satu** (`AcademicYear`); data akademik & operasional mengacu ke tahun ajaran.
- **Data tahun lama = arsip historis read-only**; tidak bisa diubah lewat UI/API biasa.
- **Promosi = keputusan sekolah**: sistem memberi default + kandidat, override per siswa ber-alasan (AuditLog).

**2. Alur wizard "Tutup Tahun Ajaran" (state machine)**

| Tahap | Status RolloverRun | Keterangan |
|-------|--------------------|------------|
| 1 | DRAFT | Wizard dibuat, belum ada aksi |
| 2 | PRE-CHECK | Pemeriksaan prasyarat (§5.R.3); bloker dilewati hanya SUPERADMIN ber-alasan |
| 3 | DRY-RUN PREVIEW | Hitung hasil tanpa menulis (§5.R.4); wajib sebelum konfirmasi |
| 4 | KONFIRMASI | Disetujui SUPERADMIN/KEPSEK |
| 5 | EKSEKUSI | Job async (BullMQ, idempoten, resume-able, `step_state`) |
| 6 | DONE | Selesai; jendela rollback default 7 hari |
| 7 | ROLLED_BACK | Pengembalian dari DONE dalam jendela rollback |
| 8 | FAILED | Gagal; bisa di-resume dari step terakhir |

> **Catatan:** PRE-CHECK dan KONFIRMASI adalah sub-state dari DRAFT (bukan nilai enum RolloverRunStatus); RUNNING dimulai setelah konfirmasi.

- **Satu run per tahun ajaran** (`@@unique academic_year_id`) — mencegah rollover ganda.
- **Transisi hanya lewat service state machine**; seluruh perubahan tercatat AuditLog.

**3. PRE-CHECK (prasyarat; bloker bisa dilewati hanya SUPERADMIN ber-alasan)**

| # | Prasyarat | Sifat |
|---|-----------|-------|
| 1 | Nilai final & rapor selesai | Bloker |
| 2 | Rekap absensi final | Bloker |
| 3 | Tidak ada attempt/ujian/tugas aktif — attempt IN_PROGRESS = BLOK; submission belum dinilai = PERINGATAN | Bloker/peringatan |
| 4 | Invoice SPP ditutup/di-roll (bila FINANCE ON) | Bloker |
| 5 | Payroll periode terakhir selesai (bila PAYROLL ON) | Bloker |
| 6 | Backup terverifikasi — tidak ada backup segar = tolak | Bloker |
| 7 | PPDB tahun lama tidak menggantung (bila PPDB ON) | Bloker |

**4. DRY-RUN**

Hitung tanpa menulis; hasil wajib ditampilkan sebelum konfirmasi:

- Hasil promosi per siswa: PROMOTED / REPEATED / GRADUATED / TRANSFERRED / DROPPED.
- Kelas tujuan & rombel baru; daftar alumni baru.
- Dampak keuangan (carry-over invoice) bila FINANCE ON.
- OPERATOR bisa preview tapi tidak execute.

**5. Aturan promosi (konfigurasi `settings.rollover`)**

| Kondisi | Hasil default |
|---------|---------------|
| ACTIVE, grade 10/11 | Naik (grade+1) |
| ACTIVE, grade 12 | LULUS |
| non-ACTIVE | Dikonfirmasi (kandidat) |

- Override per siswa (alasan wajib): TINGGAL_KELAS / LULUS / PINDAH / DROP.
- Ambang: rapor lengkap + ACTIVE = naik; rapor tidak lengkap = kandidat tinggal (nilai pasti disepakati sekolah).

**6. Kelulusan**

- Grade 12 → GRADUATED.
- Catatan `Alumni` minimal: student_id, tahun kelulusan, NISN final, tanggal.
- Ekspor rapor/ijazah final (bucket exports, DataExportLog).
- Akun tidak dihapus otomatis — akses sesuai kebijakan; retensi 60 bulan default.

**7. Tahun baru**

- Buat `AcademicYear` baru (DRAFT → OPEN).
- Struktur kelas baru (label rombel bergeser; grade 10 baru).
- Enroll siswa naik (unique student+class+year; retry aman).
- Salin `ClassSubject`/`ScheduleEntry` template + validasi bentrok.
- Homeroom default mengikuti kelas.
- PPDB grade 10 enroll (bila flag PPDB ON).
- Set tahun aktif; notifikasi tahun baru.

**8. Arsip & query**

- Filter `academic_year` pada semua query utama (default tahun aktif; parameter untuk tahun lain).
- Tahun lama read-only — endpoint tulis menolak dengan kode error `ARCHIVED_YEAR`.
- Retensi via DataRetentionPolicy.
- Ekspor arsip via DataExportLog.

**9. Keuangan carry-over (gelombang 2)**

- Invoice belum lunas → default CARRIED_OVER + `original_invoice_id` + catatan piutang tahun lama (muncul di tahun baru; pembayaran dialokasikan ke invoice asli).
- Opsi B tetap di tahun lama.
- Template tagihan tahun baru disalin.
- Denda lanjut setelah grace window.
- Bila FINANCE OFF, rollover tidak memproses keuangan.

**10. Data model (ringkas; detail di 03)**

| Entitas / Enum | Keterangan |
|----------------|------------|
| `AcademicYear` | Tahun ajaran; AcademicYearStatus DRAFT/OPEN/CLOSING/CLOSED |
| `RolloverRun` | Run wizard; RolloverRunStatus DRAFT/PREVIEW/RUNNING/DONE/ROLLED_BACK/FAILED |
| `RolloverItem` | Opsional — item per siswa |
| `Alumni` | Minimal: student_id, tahun kelulusan, NISN final, tanggal |
| `RolloverAction` | PROMOTED/REPEATED/GRADUATED/TRANSFERRED/DROPPED |
| `EnrollmentStatus` | Diperluas: PROMOTED/REPEATED |
| `PaymentStatus` | Diperluas: CARRIED_OVER |
| Kolom `academic_year` | Konsisten di Class/Enrollment/Grade/ScheduleEntry/Invoice |

**11. RBAC & keamanan**

| Permission | Role |
|------------|------|
| `rollover:preview:school` | SUPERADMIN, KEPSEK; OPERATOR preview tanpa override |
| `rollover:execute:school` | SUPERADMIN, KEPSEK |
| `rollover:rollback:school` | SUPERADMIN, KEPSEK |
| `rollover:history:read:school` | Sesuai kebijakan sekolah |

- Dry-run wajib sebelum eksekusi.
- Semua aksi dicatat AuditLog.
- Feature flag `ACADEMIC_ROLLOVER` (default ON) — OFF = wizard disembunyikan + API tolak `FEATURE_DISABLED`.
- Backup terverifikasi sebelum eksekusi.
- Tahun lama masuk mode CLOSING selama proses.

**12. Prioritas**

- Desain **WAJIB sebelum gelombang 2** (payroll/aset/pembayaran bergantung tahun ajaran).
- Implementasi MVP = wizard dasar + arsip read-only — **DIREKOMENDASIKAN setelah Fase 2 stabil**.
- Task: M-ROLLOVER-T1..T6 (lihat 05-implementation-plan §3.8b).

---

## 6. Kebutuhan Non-Fungsional

Konsolidasi [v1 §7], [v2 §6], [v3 §6], [master §7] + penambahan prd04 (menjawab gap A4). Semua SLO/angka di bawah adalah target produk; nilai teknis final ditetapkan di implementasi [master §10 Q4].

| Aspek | Kebutuhan / Target | Sumber / Keputusan |
|-------|---------------------|--------------------|
| **Keamanan Data (single-school)** | Data milik SATU sekolah; tidak ada isolasi antar-sekolah; RLS opsional untuk defense-in-depth RBAC; otorisasi akses dikontrol permission + scope di aplikasi [owner-v4.2] | [tek-02 §2 P1][tek-03 §7][riset-06 Topik 4] |
| **Skalabilitas** | Kapasitas **500–3.000 user dalam satu sekolah**; arsitektur monolith modular; penambahan user tanpa perubahan skema [owner-v4.2][riset-06 Topik 10] | [riset-06 Topik 10] |
| **Keamanan** | **Argon2id; JWT httpOnly cookie; refresh rotation; login throttle & lockout.** Password/token tidak pernah di-log; PII dienkripsi at-rest; rate limiting per endpoint (login 5 gagal/15 mnt per akun + throttle IP 20/mnt tanpa lockout permanen IP — OWASP; submit ujian 30/mnt; scan QR 30/mnt; global 1000/mnt/IP kalibrasi NAT sekolah; WebSocket 60/mnt — **nilai awal DITETAPKAN §13 Q4 [riset-06 Topik 16]; dikalibrasi ulang via load test**); brute-force lockout; CSRF; CSP; helmet; dependency scan (npm audit fail on high); SQL injection aman via Prisma | [v1 §7][v3 G11][tek-02 §13][master §7][owner-v4.1] |
| **Ketersediaan / SLO** | **Uptime ≥ 99%** (bulanan); **p95 < 3 detik** saat jam ujian; **error rate < 1%** (5 menit) → alert; SLO kuantitatif dipantau Prometheus/Grafana (menjawab A4-4) | [v1 §7][v3 G7][tek-02 §11][B-7] |
| **Performa (CWV)** | **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1** pada p75 mobile+desktop; dashboard utama < 2 detik di 4G rata-rata Indonesia (perkuat [v1 §7]) | [B-6][web.dev][riset-06 Topik 10][v1 §7] |
| **Aksesibilitas** | **WCAG AA bertahap seluruh halaman** (bukan hanya PPDB) — keputusan A4-1: halaman publik & inti LMS/portal di MVP; penuh di gelombang 2–3; ikuti ux-07 §7 | [v3 G15][riset-06 Topik 5][ux-07 §7] |
| **Offline-first** | **MVP = queue absensi QR + cache materi dasar** (IndexedDB + background sync); **PWA penuh ditunda** — keputusan A4-2; validasi waktu di server, bukan client; kompresi upload server-side (data-saver) | [v3 G10/G16][master §5.2 Grup C][tek-02 §10][riset-06 Topik 10] |
| **Kepatuhan UU PDP** | **Jadwal retensi per kategori data** (entity → bulan → ARCHIVE/DELETE/ANONYMIZE; `DataRetentionPolicy`; default 60 bulan, konfigurasi aplikasi — bukan klaim UU) [riset-06 Topik 1]; **bukti consent data anak** (timestamp, versi dokumen, salinan — bukan checkbox saja) [Pasal 22/24]; **AuditLog penuh** semua pemrosesan data sensitif [Pasal 31]; notifikasi pelanggaran data ≤ 3×24 jam [Pasal 46]; DPIA untuk pemrosesan berisiko tinggi (mis. data spesifik skala besar) [Pasal 34] | [v3 G12–G14][riset-06 Topik 1][03-database-erd §4.8/4.9/4.12] |
| **Privasi data sensitif** | Catatan BK & payroll: field-level access; role terbatas (BK: GURU_BK/WAKEPSEK/KEPSEK; payroll: §5.E.5); audit log akses | [v2 §6][v3 G14][A3-5] |
| **RPO / RTO** | **RPO ≤ 24 jam (target operasional 15 menit), RTO ≤ 4 jam**; backup harian + PITR; backup off-region; restore drill bulanan; backup dengan `row_security=off` | [v3 G8][tek-02 §12][riset-06 Topik 4] |
| **Beban puncak ujian** | Tahan ratusan siswa submit dalam window 5 menit terakhir; autosave idempotent; rate limit & caching khusus; load test k6 wajib sebelum ujian sungguhan (target p95 < 3 s) | [v2 §2.3][v2 §7][tek-02 §14] |
| **Keandalan data** | Decimal(12,2) untuk uang (hindari float); transaksi untuk operasi multi-langkah; idempotency key untuk alur kritis (autosave, scan QR, pembayaran, submission, payroll run) | [tek-03 §9][tek-02 §2 P6] |
| **Auditability** | `AuditLog` generik (actor, entity, before/after, timestamp, IP); jejak jawaban ujian append-only; ekspor tercatat `DataExportLog` | [v2 §2.3][v3 G14][03-database-erd §4.12] |
| **Bahasa & budaya** | Bahasa Indonesia sebagai bahasa utama UI; terminologi sekolah Indonesia; target sentuh ≥ 44×44 px [ux-07 §6] | [master §10 Q11][ux-07] |
| **Usability semua kalangan** | Bahasa Indonesia sederhana, font ≥16px, target sentuh ≥44px, satu aksi utama per layar, panduan pemula, cetak kredensial, responsif mobile-first | [owner-v4.1][ux-07] |
| **Model pengelolaan** | Aplikasi SATU sekolah; deployment tunggal; tanpa mekanisme billing lintas sekolah | [owner-v4.2] |

---

## 7. Performa, Algoritma & Efisiensi

### 7.1 Target performa (menjawab gap A2-3; keputusan B-6)

| Metrik | Target (p75) | Konteks |
|--------|--------------|---------|
| LCP | ≤ 2,5 detik | mobile + desktop, 4G |
| INP | ≤ 200 ms | mobile + desktop |
| CLS | ≤ 0,1 | mobile + desktop |
| Dashboard utama | < 2 detik | 4G rata-rata Indonesia [v1 §7] |
| API p95 jam ujian | < 3 detik | SLO §6 |
| Gambar materi (terkompresi) | ≤ 200 KB | data-saver [ux-07 §8] |

### 7.2 Pola performa & efisiensi (keputusan B-6)

- **Index hotspot**: index strategis per query panas (03-database-erd §6): submission per assignment, rekap absensi per siswa+hari, attempt per sesi, invoice per siswa+status+due_date, notification inbox, grade per siswa-kelas-mapel-semester.
- **Cache Redis**: UserRole TTL 60 s [tek-02 §6.2 ADR-005]; rekap nilai yang sering dibuka; session/rate-limit.
- **Async queue (BullMQ/Redis)**: payroll run (§5.E.2), rekap/ekspor berat (rapor, Dapodik), notifikasi massal, generate invoice SPP bulanan (job idempotent per periode) [B-6][tek-02 §11].
- **Idempotency key**: autosave ujian, scan QR, pembayaran, submission, payroll run [tek-04 §1.7][tek-02 §2 P6].
- **Pagination cursor** untuk daftar besar (nilai, submission, invoice) — menggantikan offset untuk data > 100 baris [tek-04 §1.3 diperkuat].
- **Kompresi aset server-side**: gambar materi/submission dikompresi (WebP/AVIF, ≤ 200 KB) sebelum disimpan [v3 G16][ux-07 §8].
- **Frontend**: lazy load + code split per route group/role; image optimizer (`srcset`/`sizes`); mode hemat data (`Save-Data` header → versi kecil) [tek-02 §10.2][ux-07 §8].
- **PWA offline queue**: IndexedDB `queue.absensi`, `queue.autosave`, `cache.materi` + background sync (MVP minimal) [tek-02 §10].

### 7.3 Strategi algoritma per domain (menjawab kebutuhan pemilik #7; keputusan A2-4)

| Domain | Algoritma / pendekatan | Efisiensi & kemudahan debug |
|--------|------------------------|-----------------------------|
| Penilaian & rapor | Konsolidasi dari `Grade` (TUGAS/KUIS/UJIAN) dengan bobot; rekap inkremental di cache; dua-track rapor (mapel + P5) | Tidak menghitung ulang semua nilai per request; hasil deterministik & teruji unit |
| Depresiasi aset | Garis lurus dihitung **saat laporan**: `nilai_buku = harga − (harga/masa_manfaat × bulan)` | Tanpa job bulanan; satu fungsi murni mudah di-unit-test [B-3] |
| Payroll run | Tarik kehadiran → hitung variabel → potongan (TER/BPJS) → validasi → approval → PAID; seluruh tarif dari konfigurasi | Async queue; setiap tahap loggable; kalkulator pajak terisolasi & teruji [B-2] |
| Denda keterlambatan | Rule-based per hari keterlambatan; invoice DENDA terpisah; bisa dihapus manual | Deterministik; AuditLog tiap perubahan |
| Penjadwalan SPP | Job idempotent per periode (bulan-tahun) | Tidak dobel bila retry; mudah diverifikasi |
| Rekonsiliasi bank | Cocokkan (referensi, nominal, tanggal) → MATCHED/UNMATCHED | Skor kecocokan + daftar unresolved eksplisit |
| Ujian online | Autosave idempotent (15 s) + auto-submit server-side; randomisasi deterministik per attempt; log append-only | State machine attempt di service; sengketa bisa diinvestigasi dari log |
| Absensi QR anti-titip | Single-use token + expiry (5–10 mnt) + validasi waktu server; geofencing opsional | Token stateless, hash di DB; test reuse mudah |
| RBAC | Permission set per role di-cache; scope resolver deterministik | Matriks permission × scope teruji di CI |
| Ekspor Dapodik | Generate file di async queue; `DataExportLog` | Tidak memblokir request; riwayat ekspor tercatat |

### 7.4 Mudah di-develop & di-debug (keputusan B-6)

- **Request ID** per transaksi (header `X-Request-Id`, di-echo ke response) [tek-02 §4.3/§11].
- **Structured logging tanpa PII** (pino JSON: userId, role, module; tidak pernah token/password) [tek-02 §11].
- **Satu sumber kontrak** `packages/types` (DTO/enum dipakai api & web) [tek-02 §3].
- **Format error standar** `{ error: { code, message, details, requestId } }` [tek-04 §1.6].
- **Feature flags** per modul (mati/nyala global oleh SUPERADMIN — 1 sekolah) [B-5].
- Modular backend per domain (controller → service → repository) dengan aturan dependensi ESLint/Turborepo [tek-02 §3/§4].
- Semua angka pajak/fee/ambang = **konfigurasi per periode** (tabel konfigurasi, bukan konstanta di kode) — kunci kepatuhan & mudah diubah saat regulasi berubah.

---

## 8. Infrastruktur Terbaik

Keputusan B-7 — infrastruktur ringan untuk MVP, jalur skala jelas, tanpa over-engineering.

### 8.1 Komponen inti

| Lapisan | Pilihan | Detail |
|---------|---------|--------|
| Database | **Managed PostgreSQL** (mis. RDS/Neon) — **hanya sebagai database**, tanpa fitur Auth/Storage pihak ketiga (§5.O) | Backup harian + **PITR** (RPO ≤ 24 jam, target 15 menit; RTO ≤ 4 jam), backup **off-region** [tek-02 §12]; skema tunggal; RLS opsional [tek-03 §7] |
| Object storage + CDN | Self-managed object storage (MinIO-compatible) atau managed S3 — signed URL via API kita [§5.O] | Bucket per jenis dokumen + policy RLS + CDN untuk materi/gambar |
| Auth | Auth in-house (Email/Username + Password, Argon2id, JWT cookie) [§5.P] | Satu metode login; JWT hanya identitas |
| Cache & queue | Redis | Cache RBAC, rate-limit, session; BullMQ async queue [tek-02 §11][B-6] |
| Observability | Structured log + Prometheus/Grafana self-hosted; Sentry opsional non-dependensi (hanya jika diaktifkan; default mati; tidak pernah menghalangi fitur) [§5.O] | Error tracking, metrik, alerting; SLO §6 |
| Real-time | Socket.IO + adapter Redis | Namespace tunggal (siap multi-instance) [tek-02 §7] |

> Kebijakan Ekosistem Penuh [owner-v4.1] §5.O — infrastruktur boleh managed, fitur selalu in-house.

### 8.2 SLO & alerting

- SLO: uptime ≥ 99%; p95 < 3 s jam ujian; error rate < 1% (5 menit).
- Alert kunci: error 5xx spike; p95 latency > 3 s; autosave failure > 5%; queue depth; backup gagal; disk usage [tek-02 §11].

### 8.3 Security hardening

Rate limiting per endpoint [tek-02 §13] (login 5 gagal/15 mnt per akun + throttle IP 20/mnt tanpa lockout permanen IP — OWASP; submit ujian 30/mnt; scan QR 30/mnt; global 1000/mnt/IP kalibrasi NAT sekolah; WebSocket 60/mnt — **nilai awal DITETAPKAN §13 Q4 [riset-06 Topik 16]; dikalibrasi ulang via load test**); brute-force lockout (5 gagal → 15 mnt); CSRF/CSP/helmet; dependency scan; secret scan (gitleaks); RLS aktif (opsional) + test RBAC per scope; AuditLog aksi sensitif [v3 G11][tek-02 §13].

### 8.4 Scaling path (tanpa migrasi besar)

```
MVP (satu sekolah): managed DB + PaaS (Render/Fly/Railway) atau VPS + Docker Compose;
                    hindari Kubernetes di MVP [B-7]
  → tumbuh: NestJS stateless + Redis adapter Socket.IO → horizontal scale-out
  → baca berat (rapor/rekap): read replica PostgreSQL
  → skala 1 sekolah: optimasi query; read replica bila rekap berat; tanpa partisi tenant
```

Keputusan deployment: **managed + PaaS atau VPS + Docker Compose; Kubernetes ditunda** (menjawab A2-5; B-7).

> **Deployment single-school:** satu instance untuk SATU sekolah — VPS + Docker Compose atau dikelola penyedia; tanpa mekanisme multi-tenant [owner-v4.2]

---

## 9. Setup Mudah

Keputusan B-8 (menjawab gap A2-5, G19, G9).

### 9.1 Wizard onboarding 5 langkah

| Langkah | Isi | Pintu keluar |
|---------|-----|--------------|
| 1. Profil sekolah | Nama, NPSN (validasi 8 digit), jenjang (SMA/SMK), alamat, tahun ajaran, timezone | NPSN valid (8 digit) — tanpa cek lintas sekolah; ini aplikasi milik sekolah itu sendiri [owner-v4.2] |
| 2. Data dasar | Semester, ambang alpa (default 3/bulan), toggle fitur (data-saver ON, gamifikasi OFF), template tagihan dasar | Tersimpan ke `SchoolProfile.settings` [03-database-erd §2.1] |
| 3. Impor data | Unduh template Excel → upload → validasi → **preview tabel + baris error** (NISN duplikat, kolom kosong) → impor parsial aman + laporan [ux-07 §4.1][03-database-erd §4.10/4.11] | Import idempoten; hasil n berhasil / m gagal + unduh daftar error |
| 4. Undang | Kirim undangan email/link ke guru, OPERATOR, KEUANGAN, WAKEPSEK (role sudah ditentukan); bisa "Selesai nanti" | Undangan terkirim; status terkirim/terpakai/kedaluwarsa [tek-04 §2.1] |
| 5. Selesai & tur | Ringkasan setup, tautan dokumentasi & FAQ, kontak support WhatsApp/email | Dashboard sekolah terbuka; sekolah baru impor data & login ≤ 1 hari kerja [v1 §1.2][master §9.2] |

### 9.2 Template impor Excel

| Template | Kolom wajib kunci | Validasi |
|----------|-------------------|----------|
| Siswa | NISN, nama, kelas/rombel, nama ortu + kontak | NISN unik; kelas harus ada; duplikat ditolak |
| Guru/staf | NUPTK/NIP, nama, mapel (untuk guru), jabatan | NUPTK opsional tapi wajib untuk ekspor Dapodik [riset-06 Topik 2] |
| Kelas & rombel | nama, grade_level, tahun ajaran, (opsional) homeroom | Grade valid; nama kelas unik per tahun |
| Mapel | kode, nama, kategori (WAJIB/PILIHAN/KEJURUAN) | Kode unik per sekolah |
| Jabatan + komponen gaji awal (gelombang 2) | nama pegawai, jabatan, gaji pokok, tunjangan, potongan awal | Komponen harus ada di master; validasi UMP peringatan [§5.E] |

Semua impor lewat `ImportBatch`/`ImportError`; preview wajib sebelum commit; deteksi duplikasi (NISN/NUPTK/kode) [v3 G9][tek-05 F1-T5].

### 9.3 Seed default

- 12 role + ~120 permission (RBAC §4).
- Komponen gaji standar (GAJI_POKOK, tunjangan tetap, potongan PPH21-TER/BPJS, honor mengajar) [§5.E.1].
- Kategori aset standar + umur manfaat default [§5.G].
- Template tagihan (SPP bulanan, uang kegiatan, dsb.) [§5.F.1].
- Contoh kelas/mapel Kurikulum Merdeka (CP/ATP referensi) untuk memudahkan uji coba [v3 G2][riset-06 Topik 3].

### 9.4 Dokumentasi non-teknis (keputusan B-8)

- Panduan admin/OPERATOR (onboarding, impor, data induk).
- Panduan guru (kelas, materi, tugas, kuis, ujian, absensi, penilaian, rapor).
- Panduan wali murid (portal read-only, izin anak).
- Panduan siswa (tugas, kuis, ujian, absensi QR).
- FAQ + kontak support WhatsApp/email (M-SUPPORT-T1) [master §5.2 Grup C][tek-05 §3.8].

---

## 10. Roadmap & Prioritas

Urutan eksekusi terpadu (berbasis [master §6], [tek-05 §5], ditambah gelombang baru prd04). **Definisi MVP super-app yang tidak ambigu:**

> **MVP openlms = fondasi platform & teknis (F0–F2) + LMS inti + absensi manual + portal wali murid read-only + support minimal — plus sangat direkomendasikan: absensi QR, ujian online dasar, e-Rapor dua-track.** Payroll, aset penuh, pembayaran lengkap = **gelombang 2** (desain tuntas di dokumen ini). Kalender terpadu, P5 penuh, asesmen diagnostik, komunikasi penuh, PPDB, SMK = gelombang 3/ditunda (terpandu kebutuhan pilot).

| Fase/Item | Cakupan | Status | Pintu keluar |
|-----------|---------|--------|--------------|
| **F0** | Fondasi: skema 61 entitas (56 + FeatureFlag, AppFeatureSetting, AcademicYear, RolloverRun, Alumni) + RLS + logging + CI + backup/DR + security + retensi/consent | WAJIB MVP | Migrasi bersih; restore ≤ 4 jam; tes RBAC & akses per scope [tek-05 §3.1][master §6] |
| **F1** | Auth in-house (Email/Username + Password, Argon2id, JWT cookie) [§5.P], RBAC penuh (@RequirePermission), onboarding aplikasi sekolah, wizard impor | WAJIB MVP | Sekolah baru impor & login ≤ 1 hari kerja [tek-05 §3.2] |
| **F2** | LMS inti: kelas, materi, tugas, submission, penilaian, rekap, notifikasi | WAJIB MVP | Guru buat kelas → tugas → nilai end-to-end [tek-05 §3.3] |
| **M-ABSQR** | Absensi QR + izin online + offline queue | SANGAT DIREKOMENDASIKAN | QR single-use & expired; offline queue tersinkron [tek-05 §3.4] |
| **M-EXAM** | Ujian online dasar (bank soal, sesi, token, autosave, autosubmit, grade) | SANGAT DIREKOMENDASIKAN | **Load test lulus (p95 < 3 s)**; E2E hijau [tek-05 §3.5] |
| **M-RAPOR** | e-Rapor dua-track (mapel + P5 wadah) | SANGAT DIREKOMENDASIKAN | Validasi format dengan pilot [tek-05 §3.6][riset-06 Topik 3] |
| **M-PORTAL** | Portal wali murid read-only (nilai, absensi, tagihan — tampil saat modul keuangan live) | WAJIB MVP | Wali murid login & lihat data anak [tek-05 §3.7][A3-1] |
| **M-SUPPORT** | FAQ + kontak WhatsApp/email | WAJIB MVP | FAQ live; triase tercatat [tek-05 §3.8] |
| **M-ROLLOVER** | Siklus tahun ajaran: AcademicYear, wizard pre-check + dry-run, promosi/kelulusan, arsip historis read-only, rollback + carry-over keuangan | DIREKOMENDASIKAN (setelah Fase 2 stabil; wajib sebelum gelombang 2) | Satu siklus rollover sukses di data uji; dry-run benar; tahun lama read-only; tahun baru normal |
| **W2-PAYROLL** | Master gaji, payroll run bulanan, slip, PPh21 TER/BPJS (konfigurasi), laporan | GELOMBANG 2 | Run PAID bulanan; slip digital; validasi regulasi (open items §13) |
| **W2-ASSET** | Inventaris penuh, depresiasi garis lurus, maintenance, audit/opname | GELOMBANG 2 | Opname selesai; nilai buku & rekap depresiasi benar |
| **W2-PAYMENT** | Tagihan multi-jenis + jadwal otomatis, cicilan, denda, refund, rekonsiliasi, arus kas, gateway roadmap | GELOMBANG 2 | Siklus tagihan→bayar→rekonsiliasi MATCHED; gateway setelah KYC |
| **W2-ADMIN** | Konsol admin sistem sekolah (pengaturan, feature flags, audit, statistik) + ekspor Dapodik file | GELOMBANG 2 | Konsol admin terisi; ekspor file terformat |
| **W2-KALENDER** | Kalender terpadu lintas modul (G24) | GELOMBANG 2 (setelah data modul penunjang live) | Satu kalender per siswa lintas domain [A1-6] |
| **W3** | Akademik lanjut (jadwal otomatis, CP/ATP), PPDB, komunikasi, kesiswaan, perpustakaan, alumni, BK | GELOMBANG 3 (terpandu pilot) | Dipilih bersama sekolah pilot [v2 §8 #6][master §5.3] |
| **W3-SMK** | PKL, UKK, DUDI | GELOMBANG 3 — kondisional SMK | Validasi ke SMK riil dulu [v3 §8 #3] |
| **W3-KURIKULUM** | P5 penuh, asesmen diagnostik, bimbingan karir | GELOMBANG 3 | Setelah e-Rapor dua-track jalan [riset-06 Topik 3] |
| **DEFER** | Live class, lock-browser penuh, proctoring webcam, gamifikasi, plagiarism, learning analytics, mobile native, RFID | DITUNDA | Bukti kebutuhan pilot / pertimbangan privasi [master §5.3][riset-06] |

Cut-line jika kapasitas tidak cukup: ikuti [master §5.4] — yang TIDAK BOLEH dipangkas: G6, G7, G8, G11, G12, G13, G9, RBAC & keamanan (RLS opsional). Tambahan prd04: desain payroll/aset/pembayaran **tidak boleh** menunda inti LMS (aturan fokus §2.2).

---

## 11. Risiko & Mitigasi

Konsolidasi [v1 §10], [v2 §7], [v3 §7], [master §8] + risiko baru prd04 (payroll/regulasi, gateway, negeri vs swasta, scope).

| # | Risiko | Dampak | Mitigasi |
|---|--------|--------|----------|
| 1 | Scope membengkak (super-app) | Proyek tidak pernah rilis | Fokus LMS §2.2; roadmap §10 ketat; modul gelombang 2/3 tidak boleh masuk sebelum go/no-go; cut-line [master §5.4] |
| 2 | Payroll: regulasi berubah (tabel TER, honor non-ASN) | Slip/pajak salah, masalah hukum | Semua angka terkonfigurasi per periode; validasi open items §13 sebelum build; kalkulator pajak terisolasi & teruji [§5.E][riset-06 Topik 7] |
| 3 | Payment gateway: KYC & fee | Aktivasi tertunda / biaya tak terduga | Verifikasi KYC merchant sebelum janji; model fee diputuskan di §13; pencatatan manual tetap jalan tanpa gateway [§5.F.7] |
| 4 | Sekolah negeri vs swasta (Permen 44/2012, 75/2016) | Janji "SPP" bermasalah untuk negeri | Posisi "pencatatan iuran komite/transparansi" untuk negeri; isi Permen belum diverifikasi → open item §13 Q14 [riset-06 Topik 8] |
| 5 | RBAC permission-based kompleks | Bug akses lintas role | Test matrix permission×scope×aksi di CI; RLS lapis kedua; UserPermissionOverride diaudit [§4][G6] |
| 6 | Ujian online gagal saat beban puncak | Kepercayaan sekolah pilot hilang | Load test k6 wajib; autosave idempotent; rate limit & caching khusus [v2 §7][tek-02 §14] |
| 7 | Absensi QR disalahgunakan (titip via screenshot) | Data kehadiran tidak akurat | Token sekali pakai + expired 5–10 mnt + validasi waktu server; geofencing sebagai sinyal [v2 §7][riset-06 Topik 6] |
| 8 | Data BK/payroll bocor lintas role | Masalah hukum UU PDP | Field-level access; audit log akses; role terbatas (GURU_BK/WAKEPSEK/KEPSEK; KEUANGAN/KEPSEK) [v2 §7][A3-5] |
| 9 | Regulasi aset/pajak berubah (penyusutan fiskal) | Nilai buku tidak sesuai ketentuan fiskal | Umur manfaat & rumus = konfigurasi; konsultasi fiskal sebelum laporan resmi (open item §13 Q17) [riset-06 Topik 9] |
| 10 | Janji Dapodik/ANBK API langsung tidak terpenuhi | Ekspektasi sekolah tidak terpenuhi | Mulai ekspor file terformat; API hanya jika akses resmi terverifikasi [v3 §7][riset-06 Topik 2] |
| 11 | Adopsi rendah (WhatsApp/Excel sudah nyaman) | Sekolah pilot tidak rutin pakai | Fokus fitur hemat waktu guru; wizard migrasi G9; support WhatsApp/email [v1 §10][master §8] |
| 12 | Data akademik hilang | Data legal tidak bisa dipulihkan | Backup harian + PITR; RPO ≤ 24 jam (target 15 mnt); RTO ≤ 4 jam; off-region [v3 G8][tek-02 §12] |
| 13 | Kepatuhan data anak tidak dikelola | Pelanggaran UU PDP (denda 2% pendapatan tahunan) | Retensi per kategori, consent dengan bukti, AuditLog penuh, DPIA bila perlu [riset-06 Topik 1] |

---

## 12. Metrik Keberhasilan (Multi-Stakeholder)

Perluasan [v1 §11] & [master §9] — metrik per pemangku kepentingan (menjawab gap A2-7).

| Pemangku | Metrik | Target |
|----------|--------|--------|
| **Sekolah (pilot)** | Sekolah pilot aktif memakai inti (LMS + absensi + ujian + e-Rapor) | Minimal 1 sekolah, 1 semester penuh [v1 §11] |
| **Guru** | Guru rutin memakai platform untuk tugas/nilai | ≥ 70% guru (bukan hanya login sekali) [v1 §11] |
| **Guru (efisiensi)** | Waktu rekap nilai wali kelas berkurang vs manual | Signifikan (survei kualitatif) [v1 §11] |
| **Siswa** | Siswa aktif mengerjakan tugas/kuis per minggu | ≥ 50% [master §9.2] |
| **Wali murid** | Wali murid aktif login melihat data anak | ≥ 40% per bulan (baru — prd04) |
| **Keandalan ujian** | Nol kegagalan sistem pada sesi ujian sungguhan (PTS/PAS) | 100% sesi sukses [master §9.2] |
| **Onboarding** | Sekolah baru impor data & login | ≤ 1 hari kerja [v1 §1.2][master §9.2] |
| **Ketersediaan** | Uptime | ≥ 99% [master §9.2] |
| **Pemulihan data** | Restore backup berhasil | ≤ 4 jam (RTO) [master §9.2] |
| **Admin sistem** | Konsol admin terisi; statistik adopsi fitur sekolah terpantau | Per bulan |
| **Sekolah** | Payroll: run bulanan PAID tepat waktu di pilot (saat W2 live) | 100% periode berjalan; slip terunduh pegawai |
| **Sekolah** | Pembayaran: outstanding menurun; rekonsiliasi MATCHED ≥ 90% (saat W2 live) | Per periode |

---

## 13. Open Questions & Keputusan

Perluasan [master §10] + pertanyaan baru prd04. Setiap item: pertanyaan → opsi → rekomendasi/status.

| # | Pertanyaan | Opsi | Rekomendasi / Status |
|---|------------|------|----------------------|
| 1 | **Model pengelolaan/deployment aplikasi (single-school):** (a) dikelola penyedia (Aditya) — 1 instance; (b) on-premise/server sekolah; (c) hybrid. G18 TIDAK RELEVAN (single-school) [owner-v4.2] | — (keputusan single-school; tanpa model harga SaaS) | **DITETAPKAN [owner]: (a) dikelola penyedia untuk MVP** — 1 instance; opsi (b) on-premise tetap didukung desain (VPS + Docker Compose §8.4) sebagai cadangan; kontrak pemrosesan data (UU PDP Pasal 51) disiapkan |
| 2 | Target pasar: SMA saja atau SMA+SMK? | (a) SMA dulu; (b) paralel; (c) SMA dulu, SMK kondisional | **SMA dulu, SMK kondisional**; validasi 1–2 SMK riil sebelum modul SMK [master §10 Q2][v3 §8 #3] |
| 3 | Validasi akses Dapodik/ANBK (G4) | (a) ekspor file; (b) API real-time | **(a) ekspor file terformat**; API hanya bila akses resmi terverifikasi [master §10 Q3][riset-06 Topik 2] |
| 4 | Nilai rate-limit & lockout (G11) | Beragam kombinasi | **DITETAPKAN (nilai awal, dikalibrasi load test):** login 5 gagal/15 mnt per akun + throttle IP 20/mnt (tanpa lockout permanen IP — OWASP); submit ujian 30/mnt; scan QR 30/mnt; global 1.000/mnt/IP (kalibrasi NAT sekolah); WebSocket 60/mnt [riset-06 Topik 16] |
| 5 | Lock-browser & proctoring (v2 §2.2c–d) | (a) tanpa; (b) log-only; (c) diskualifikasi otomatis; (d) webcam | **(b) log-only di MVP; (d) tidak** — data biometrik spesifik UU PDP [master §10 Q5][riset-06 Topik 6] |
| 6 | Kapan PPDB dibangun? | (a) MVP; (b) sebelum musim PPDB pilot | **(b)** — musiman [master §10 Q6] |
| 7 | Konkurensi target ujian | Mis. 200/500/1000 siswa serentak | **DITETAPKAN (baseline): 500 siswa serentak/shift**; puncak submit ±100–200 req/detik; dasar load test k6 [riset-06 Topik 16] |
| 8 | Cakupan portal wali murid di MVP | (a) nilai+absensi; (b) + tagihan; (c) + izin/sakit | **(a) nilai+absensi read-only; tagihan tampil saat modul keuangan live; izin anak opsional** — keputusan FINAL (A3-1) [master §10 Q8] |
| 9 | Channel support pilot (G20) | (a) WhatsApp+email; (b) helpdesk tiket | **(a) WhatsApp/email** — support langsung untuk 1 sekolah [owner-v4.2] |
| 10 | Payroll/gaji guru | (a) modul internal; (b) pihak ketiga; (c) di luar cakupan | **(a) modul internal, gelombang 2** — prd04 mencabut pilihan (c) [keputusan A3-2][§5.E] |
| 11 | Bahasa & mata uang UI | Indonesia vs bilingual | **Bahasa Indonesia**; Rupiah [master §10 Q11] |
| 12 | Siapa memverifikasi sekolah saat onboarding (G19) | — (keputusan single-school) | **N/A (single-school):** setup awal aplikasi dilakukan SUPERADMIN (admin sistem); tanpa verifikasi antar-sekolah [owner-v4.2] |
| 13 | Model fee payment gateway | (a) sekolah tanggung MDR; (b) ditambahkan nominal ke tagihan; (c) hibrida | **Open — diputuskan sebelum aktivasi gateway pertama**; default sementara (a) dengan transparansi ke sekolah [riset-06 Topik 8] |
| 14 | Validasi isi Permendikbud 44/2012 & 75/2016 | — | **TERTUTUP:** isi Permen 44/2012 & 75/2016 mendukung posisi 'negeri = iuran komite/transparansi, SPP swasta' (nuansa: 44/2012 tekstual untuk dikdas; prinsip lintas jenjang) [riset-06 Topik 11] |
| 15 | Tabel TER resmi PMK 168/2023 & regulasi honor guru non-ASN | — | **SEBAGIAN TERTUTUP:** struktur TER A/B/C + TER harian + DPP 50% honorarium + PNS final 15% terkonfirmasi [riset-06 Topik 12]; tabel penuh ambil PDF PMK 168/2023 saat build; juknis BOS/APBD per tahun ajaran tetap open item |
| 16 | KYC gateway untuk sekolah/yayasan | — | **TERTUTUP (dokumen):** KYC = akta + SK Kemenkumham/AHU + NPWP + NIB + rekening atas nama yayasan + web aktif [riset-06 Topik 13]; waktu aktivasi konfirmasi vendor saat fitur diaktifkan |
| 17 | Ketentuan fiskal penyusutan (kelompok harta) | — | **TERTUTUP:** PMK 72/2023 — Kelompok 1–4 (4/8/16/20 th) + bangunan (20/10 th); default Kelompok 3 [riset-06 Topik 14] |
| 18 | Jadwal retensi data per kategori | Default 60 bulan (5 tahun) | **Konfigurasi aplikasi**; disepakati dengan sekolah pilot; bukan klaim UU [riset-06 Topik 1] |
| 19 | Ambang alpa dashboard kedisiplinan | Default 3/bulan | Konfigurasi per sekolah [v2 §3.2][ux-07] |
| 20 | Cakupan "sederajat" — apakah termasuk MA (Madrasah Aliyah/Kemenag)? | (a) hanya SMA/SMK; (b) + MA | **DITETAPKAN [owner]: (a) hanya SMA/SMK di MVP**; MA = kondisional/ekspansi (ekosistem Kemenag: EMIS/KMA/RDM — riset-06 Topik 15); validasi 1–2 madrasah riil sebelum berjanji |
| 21 | Rollover tahun ajaran (naik kelas, kelulusan, re-enrollment, arsip nilai) | (a) dirancang sebelum gelombang 2; (b) nanti | **SELESAI — didesain di §5.R** (menutup gap; task M-ROLLOVER-T1..T6) |
| 22 | Multi-kampus/beberapa NPSN dalam satu akun sekolah | (a) 1 sekolah = 1 NPSN; (b) multi-NPSN | **Open**; desain awal: 1 sekolah = 1 NPSN (perluasan nanti) [owner-v4.1] |
| 23 | Skala total SaaS (lintas sekolah) | — (keputusan single-school) | **TIDAK RELEVAN:** skala = 500–3.000 user dalam 1 sekolah [owner-v4.2] |
| 24 | e-Rapor P5 di MVP seberapa dalam | (a) wadah manual; (b) penilaian penuh | **"Wadah manual dulu; penilaian penuh gelombang 3"** (rekomendasi) [owner-v4.1] |
| 25 | Reset password tanpa email/SMS | (a) via OPERATOR; (b) tautan email | **SELESAI: oleh OPERATOR** (§5.P) [owner-v4.1] |
| 26 | Apakah gateway payment tetap direncanakan sebagai opsional? | (a) ya, opsional; (b) wajib | **Ya, opsional flag OFF default** (§5.F.7, §5.O) [owner-v4.1] |

---

## 14. Audit Gap & Traceability

### 14.1 Tabel Gap Register (30 gap dari audit prd01–03 → penanganan di prd04)

| # | Kategori | Gap (ringkasan audit) | Sumber | Penanganan di prd04 |
|---|----------|-----------------------|--------|---------------------|
| A1-1 | A1 belum ada | Payroll ditunda (prd02 §4.4; [master] §4 "di luar cakupan") | prd02:130 | **DICABUT** — modul penuh didesain di §5.E, gelombang 2 |
| A1-2 | A1 belum ada | Manajemen aset hanya inventaris+booking; tanpa depresiasi/maintenance/audit | prd02 §4.5 | §5.G — depresiasi garis lurus, maintenance, opname |
| A1-3 | A1 belum ada | Pembayaran belum lengkap (gateway, cicilan, denda, refund, rekonsiliasi) | v1 §5.5 | §5.F — desain penuh + roadmap gateway |
| A1-4 | A1 belum ada | RBAC hanya role-based, belum permission-based | prd01 §5.1 | §4 — permission + hierarki + scope |
| A1-5 | A1 belum ada | Role "operator" (TU) & "wali murid" (ortu aktif) belum konsisten | v1/v2/v3 | §3.1–3.2 — role standar + migrasi |
| A1-6 | A1 belum ada | Kalender terpadu (G24) belum desain | v3 G24 | §5.A.9 — dasar MVP, terpadu gelombang 2 |
| A1-7 | A1 belum ada | P5 (G2) & asesmen diagnostik (G3) belum desain | v3 G2/G3 | §5.B + §5.A.8 dua-track; gelombang 3 |
| A1-8 | A1 belum ada | Model pengelolaan/deployment aplikasi belum konkret (G18) | v3 G18 | §5.M superadmin; §13 Q1; G18 TIDAK RELEVAN (single-school) [owner-v4.2] |
| A1-9 | A1 belum ada | Helpdesk (G20) belum konkret | v3 G20 | §5.M + M-SUPPORT; §13 Q9 |
| A2-1 | A2 struktur | Fokus inti LMS tidak ditegaskan | prd01/02 | §2.2 posisi + §5.0 prinsip prioritas |
| A2-2 | A2 struktur | Positioning super-app tidak eksplisit | prd01/02 | §2.2 + §1 |
| A2-3 | A2 struktur | Target performa tipis (tanpa p95/CWV/strategi) | v1 §7 | §6 + §7.1 CWV |
| A2-4 | A2 struktur | Tidak ada strategi algoritma/efisiensi | — | §7.2–7.3 |
| A2-5 | A2 struktur | Tidak ada model deployment/setup mudah | — | §8.4 + §9 |
| A2-6 | A2 struktur | Kapasitas/beban tidak terdefinisi | — | §2.4 (500–3.000 user) + §6 |
| A2-7 | A2 struktur | Metrik hanya fokus guru | v1 §11 | §12 multi-stakeholder |
| A3-1 | A3 inkonsistensi | Status portal ortu berubah 3× | v1 §9 / v2 §4.9 / [master] | **FINAL: MVP read-only** (§5.J, §13 Q8) |
| A3-2 | A3 inkonsistensi | Payroll ditunda vs wajib | prd02 vs kebutuhan | **MENCABUT penundaan** (§5.E, §13 Q10) |
| A3-3 | A3 inkonsistensi | Format rapor tidak konsisten | v2/v3 | **FINAL: dua-track mapel + P5** (§5.A.8) [riset-06 Topik 3] |
| A3-4 | A3 inkonsistensi | Role naming tidak seragam (TU/operator, Waka/wakepsek, wali kelas/wali murid) | semua PRD | §3.2 mapping + migrasi; WALI_KELAS dihapus |
| A3-5 | A3 inkonsistensi | Akses BK berbeda antar dokumen | v2 §4.2 / [master] | **FINAL: GURU_BK/WAKEPSEK/KEPSEK** (§5.C) |
| A3-6 | A3 inkonsistensi | Kategori aset tidak konsisten | prd02 §4.5 / ERD 03 | §5.G.1 — 6 kategori final |
| A3-7 | A3 inkonsistensi | Target SMA vs SMK belum final | v1 judul / v3 | §2.4 + §13 Q2 — SMA dulu, SMK kondisional |
| A3-8 | A3 inkonsistensi | Laporan RAB vs arus kas | v2 §4.7 | **FINAL: fokus arus kas** (§5.F.6) |
| A3-9 | A3 inkonsistensi | Definisi MVP: absensi QR/ujian online/e-Rapor ditetapkan SANGAT DIREKOMENDASIKAN (turun dari WAJIB di 01-master) | 01-master | **Keputusan fokus LMS disetujui pemilik produk** — dicatat agar tidak ada ekspektasi berbeda (§10, §5.0) |
| A4-1 | A4 NFR | Aksesibilitas hanya PPDB | v1 §7 | **WCAG AA bertahap seluruh halaman** (§6) |
| A4-2 | A4 NFR | Offline-first belum matang | v3 G10 | **FINAL: queue absensi QR + cache materi = MVP; PWA penuh ditunda** (§6) |
| A4-3 | A4 NFR | Kepatuhan data anak belum operasional | v3 G12/G13 | §6 — retensi per kategori, consent bukti, AuditLog penuh [riset-06 Topik 1] |
| A4-4 | A4 NFR | Observability tanpa SLO kuantitatif | v3 G7 | §6 + §8.2 — SLO uptime/p95/error rate |
| A4-5 | A4 NFR | Proctoring webcam belum diputus | v2 §2.2d | **DITUNDA** — data biometrik spesifik PDP (§5.A.6) [riset-06 Topik 6] |

### 14.2 Coverage kebutuhan pemilik produk (16 item → seksi prd04)

| # | Kebutuhan pemilik produk | Seksi prd04 yang mencakup |
|---|--------------------------|---------------------------|
| 1 | openlms = SUPER-APP untuk SMA/SMK/sederajat | §1, §2.1–2.2, §2.4, §5.0 |
| 2 | FOKUS INTI = LMS (kelas, materi, tugas, kuis, ujian online, bank soal, penilaian, rapor, absensi, kalender, live class — DITUNDA, §5.A.10); modul lain penunjang | §2.2, §5.A.1–5.A.10, §5.0 prinsip |
| 3 | RBAC PENUH (role superadmin, operator, kepsek, wakepsek, guru, siswa, wali murid + keuangan, GURU_BK, calon siswa, pembimbing industri, penguji eksternal) — permission-based + hierarki + scope | §3.1–3.3, §4.1–4.6 |
| 4 | PENGGALIAN (payroll): master komponen gaji, payroll run bulanan berbasis kehadiran, slip digital, PPh 21 (TER), BPJS, laporan, batas akses | §5.E.1–5.E.5, §7.3, §10 W2-PAYROLL, §13 Q10 |
| 5 | MANAJEMEN ASET: inventaris, kategori, depresiasi garis lurus, peminjaman/booking, pemeliharaan, audit/opname | §5.G.1–5.G.3, §7.3 |
| 6 | PEMBAYARAN lengkap: SPP & tagihan multi-jenis, jadwal otomatis, cicilan/parsial, denda otomatis, refund, bukti & verifikasi, rekonsiliasi, arus kas, roadmap gateway QRIS/VA | §5.F.1–5.F.7, §7.3, §10 W2-PAYMENT, §13 Q13 |
| 7 | Analisis sampai titik terkecil; algoritma tercepat/tercanggih/efisien & mudah di-develop/debug | §7.2–7.4, §5.G.2 (depresiasi on-demand), §5.E.2 (payroll async) |
| 8 | Infrastruktur terbaik; ringan, cepat, efisien (4G, kuota terbatas, 500–3000 user/sekolah) | §2.4, §6, §7, §8.1–8.4 |
| 9 | Mudah digunakan & mudah setup (wizard onboarding, template impor, dokumentasi non-teknis) | §9.1–9.4, §5.D |
| 10 | Tanpa kesalahan; profesional; bahasa Indonesia | §1, §6 (bahasa & budaya), §14.1 (30 gap dituntaskan), kualitas dokumen |
| 11 | Feature flags kustomisasi global oleh SUPERADMIN (1 sekolah) | §5.N |
| 12 | Satu metode login (Email/Username + Password) | §5.P, §5.M |
| 13 | No third-party API — full ekosistem | §5.O, §5.A.10, §5.F.7, §8.1 |
| 14 | Mudah dipakai semua kalangan | §5.Q, §6, §9 |
| 15 | Fokus keamanan & data | §5.P, §6, §8.3 |
| 16 | Aplikasi SATU sekolah (tanpa multi-tenant) | §2, §3, §4, §5.M, §5.N, §6, §8 |

### 14.3 Coverage dokumen prd01–03 & dokumen pendukung → seksi prd04

| Dokumen | Isi kunci | Seksi prd04 yang memuat / status |
|---------|-----------|----------------------------------|
| prd01 (v1.0) | 9 role, 7 modul, arsitektur monorepo, NFR, roadmap Fase 0–6, metrik | §3 (role diperluas), §5 (modul diadopsi), §6–8 (NFR/arsitektur dirujuk), §10 (roadmap), §12 (metrik diperluas) |
| prd02 (v2.0) | Ujian online, absensi online, peta modul menyeluruh, NFR tambahan, roadmap eksekusi | §5.A.6–5.A.7 (ujian/absensi), §5.B–5.M (peta modul), §6 (NFR), §10 (M-ABSQR/M-EXAM) |
| prd03 (v3.0) | 24 gap G1–G24, fondasi teknis (G6–G13), modul SMK, Dapodik | §6 (NFR G6–G13), §5.L (SMK), §14.1 (gap register), Lampiran A (G1–G24) |
| 01-master-prd | MVP final, roadmap F0–17, NFR konsolidasi, risiko, metrik, open questions | §10 (roadmap), §6 (NFR), §11 (risiko), §12 (metrik), §13 (open questions) |
| 02-technical-architecture | Arsitektur, ADR, observability, backup/DR, security | §4.4 (guard), §7 (performa), §8 (infrastruktur) — dirujuk, tidak diubah |
| 03-database-erd | 61 entitas (56 + 4 platform baru + Alumni), enum, index, RLS | §4.3 (RBAC data), §5 (entitas per modul), §6–7 (index/RLS) — dirujuk; catatan: enum Role diperbarui §3.1 |
| 04-api-contract | Endpoint, RBAC matrix, contoh payload | §4.5 (RBAC matrix diadopsi + penyesuaian), §5 (alur per modul) — dirujuk |
| 05-implementation-plan | Task F0–F2, M-*, DEFER | §10 (roadmap + pintu keluar) — dirujuk |
| 06-research-validations | UU PDP, Dapodik, Kurikulum Merdeka, payroll (PPh 21 TER/BPJS), gateway (QRIS/VA), aset & depresiasi, performa (CWV/PWA), RLS + regulasi Topik 11–16 (Permen 44/2012 & 75/2016, TER PMK 168/2023, KYC gateway, fiskal PMK 72/2023, MA Kemenag, konkurensi/rate-limit OWASP) — Topik 1–16 | §5.E.3 (pajak/BPJS — Topik 7 & 12), §5.F.7 (gateway — Topik 8 & 13), §5.G.2 (aset — Topik 9 & 14), §6 (PDP — Topik 1; performa — Topik 10), §13 (open items — Topik 11–16) |
| 07-ux-design | Desain UX/UI, wireframe, aksesibilitas, data-saver | §6 (aksesibilitas), §9 (wizard), §7 (data-saver) — dirujuk |

### 14.4 Lampiran A — Disposisi Gap G1–G24 (dari prd03, dipetakan ke prd04)

| Gap | Ringkasan | Status prd04 | Seksi |
|-----|-----------|--------------|-------|
| G1 | Modul SMK: PKL/UKK/DUDI | GELOMBANG 3, kondisional SMK | §5.L |
| G2 | Projek P5 | GELOMBANG 3; wadah dua-track di MVP | §5.B, §5.A.8 |
| G3 | Asesmen diagnostik | GELOMBANG 3 | §5.B |
| G4 | Integrasi Dapodik/ANBK | GELOMBANG 2 (ekspor file) | §5.M |
| G5 | Penjurusan & bimbingan karir | GELOMBANG 3 | §5.B |
| G6 | Strategi testing | WAJIB MVP | §6, §10 F0/F2 |
| G7 | Observability | WAJIB MVP + SLO | §6, §8.2 |
| G8 | Backup & DR (RPO/RTO) | WAJIB MVP | §6, §8.1 |
| G9 | Migrasi data onboarding | WAJIB MVP | §5.D, §9.1–9.2 |
| G10 | Offline-first | MVP minimal (queue QR + cache materi); PWA penuh ditunda | §6, §7.2 |
| G11 | Rate limiting & hardening | WAJIB MVP | §6, §8.3 |
| G12 | Retensi & penghapusan data | WAJIB MVP | §6 |
| G13 | Consent data anak | WAJIB MVP | §5.I, §6 |
| G14 | Audit trail menyeluruh | WAJIB MVP (AuditLog generik) | §6 |
| G15 | Aksesibilitas menyeluruh | WCAG AA bertahap seluruh halaman | §6 |
| G16 | Mode hemat kuota/data-saver | MVP (kompresi server-side) | §6, §7.2 |
| G17 | Gamifikasi/engagement | DITUNDA | §10 DEFER |
| G18 | Model pengelolaan aplikasi (single-school) | TIDAK RELEVAN (single-school) [owner-v4.2] | §5.M, §13 Q1 |
| G19 | Onboarding self-service terstruktur | WAJIB MVP (wizard 5 langkah) | §9.1 |
| G20 | Support/helpdesk | MVP: WhatsApp/email — support langsung untuk 1 sekolah [owner-v4.2] | §5.M, §10 M-SUPPORT |
| G21 | Dashboard analitik superadmin | GELOMBANG 2 | §5.M |
| G22 | Deteksi kemiripan jawaban | DITUNDA | §10 DEFER |
| G23 | Learning analytics guru | DITUNDA | §10 DEFER |
| G24 | Kalender terpadu | Dasar per-modul MVP; terpadu gelombang 2 | §5.A.9 |

### 14.5 Register Keputusan Pemilik Produk v4.1 & v4.2

| # | Keputusan | Seksi prd04 | Status |
|---|-----------|-------------|--------|
| 1 | Feature flags global oleh SUPERADMIN (1 sekolah) | §5.N | DITETAPKAN |
| 2 | Satu metode login (Email/Username + Password) | §5.P | DITETAPKAN |
| 3 | No third-party feature API (ekosistem penuh) | §5.O | DITETAPKAN |
| 4 | Usability semua kalangan | §5.Q | DITETAPKAN |
| 5 | Fokus keamanan | §5.P/§6/§8.3 | DITETAPKAN |
| 6 | Aplikasi SATU sekolah (tanpa multi-tenant/multi-sekolah/user multi-sekolah) | §2, §3, §4, §5.M, §5.N, §6, §8, §10 | DITETAPKAN [owner-v4.2] |
| 7 | Model pengelolaan: dikelola penyedia (a), on-premise cadangan | §13 Q1 | DITETAPKAN |
| 8 | Cakupan pasar: SMA/SMK di MVP; MA kondisional | §13 Q20 | DITETAPKAN |

### 14.6 Register Ambiguitas (dari pembacaan ulang semua PRD)

| # | Item ambigu/tidak jelas | Status (DITETAPKAN / OPEN) | Resolusi/seksi |
|---|-------------------------|----------------------------|----------------|
| 1 | Metode login ganda | DITETAPKAN: 1 metode | §5.P |
| 2 | Ketergantungan third-party | DITETAPKAN: ekosistem penuh | §5.O |
| 3 | Feature flags belum dirancang | DITETAPKAN | §5.N |
| 4 | "Sederajat" termasuk MA? | **DITETAPKAN: SMA/SMK di MVP; MA kondisional [owner]** | Q20 |
| 5 | Rollover tahun ajaran | **DITETAPKAN: didesain di §5.R; task M-ROLLOVER-T1..T6** | Q21 |
| 6 | Multi-kampus/NPSN | OPEN | Q22 |
| 7 | User multi-sekolah (switcher UI) | **DITETAPKAN: tidak ada multi-sekolah [owner-v4.2]** — tanpa school switcher; sinkronisasi 04-api-contract & 07-ux-design (§16.3) | §5.P |
| 8 | Reset password tanpa email/SMS | DITETAPKAN: via OPERATOR | §5.P |
| 9 | Skala total SaaS | **DITETAPKAN: single-school [owner-v4.2]** — skala = 500–3.000 user dalam 1 sekolah | Q23 |
| 10 | e-Rapor P5 MVP | DITETAPKAN (rekomendasi disetujui): wadah manual di MVP; penilaian penuh gelombang 3 | Q24 |
| 11–16 | Open items regulasi (TER, Permen, KYC, fiskal, rate-limit, konkurensi) | **Q4/Q7/Q14/Q16/Q17 DITETAPKAN; Q15 SEBAGIAN** | Q4, Q7, Q14–Q17 (riset-06 Topik 11–16) |
| 17 | Retensi data (Q18) | DITETAPKAN: konfigurasi aplikasi (default 60 bulan, bukan klaim UU); disepakati dengan sekolah pilot | Q18, §6 |
| 18 | Billing SaaS (G18) & analitik lintas-sekolah (G21) | **TIDAK RELEVAN (single-school)** [owner-v4.2] | Q1, §5.M |

---

## 15. Glossary

| Istilah | Arti |
|---------|------|
| **Super-app** | Satu platform yang memuat banyak layanan (LMS + SIS + keuangan + payroll + aset + PPDB + komunikasi) dengan satu akun & satu sumber data [§2.2] |
| **Single-school** | Aplikasi untuk satu sekolah; tanpa multi-tenant, tanpa pemisahan data antar-sekolah [owner-v4.2][§2] |
| **SUPERADMIN** | Admin sistem aplikasi sekolah (bukan penyedia SaaS) — pengaturan aplikasi, feature flags, manajemen user, audit, backup [§3.1] |
| **LMS / SIS** | Learning Management System (pengelolaan pembelajaran) / School Information System (informasi operasional sekolah) [v1 §1] |
| **RBAC permission-based** | Kontrol akses berbasis izin `resource:action[:scope]`, bukan hanya label role [§4] |
| **Scope RBAC** | Batas data: SENDIRI / KELAS / SEKOLAH [§4.1] |
| **UserPermissionOverride** | Pengecualian izin individual (ALLOW/DENY) yang diaudit [§4.3] |
| **Payroll run** | Proses penghitungan gaji bulanan: DRAFT → hitung → validasi → approval → PAID [§5.E.2] |
| **Slip gaji digital** | Dokumen gaji per pegawai (pendapatan, potongan, beban pemberi kerja, net) [§5.E.4] |
| **TER** | Tarif Efektif Rata-rata — skema PPh 21 (PP 58/2023 + PMK 168/2023); tarif & ceiling terkonfigurasi per periode [§5.E.3][riset-06 Topik 7] |
| **BPJS Kesehatan / Ketenagakerjaan** | Program jaminan sosial: Kesehatan (PPU 5%: 4% + 1%); Ketenagakerjaan (JHT, JKK, JKM, JP, JKP) [§5.E.3][riset-06 Topik 7] |
| **JTM** | Jam Tatap Muka — dasar honor mengajar variabel [§5.E.1] |
| **UMP** | Upah Minimum Provinsi — batas validasi gaji (konfigurasi regional) [§5.E.2] |
| **Depresiasi garis lurus** | Penyusutan aset: `nilai_buku = harga − (harga/masa_manfaat × bulan)`; dihitung saat laporan [§5.G.2][PSAK 16][riset-06 Topik 9] |
| **Nilai buku** | Harga perolehan dikurangi akumulasi depresiasi [§5.G.2] |
| **Opname aset** | Pencocokan fisik vs buku (audit aset berkala); selisih dicatat [§5.G.3] |
| **Invoice / Tagihan** | Dokumen penagihan per siswa (SPP, uang kegiatan, dst.) [§5.F.1] |
| **Payment allocation** | Pemetaan pembayaran ke invoice (parsial/cicilan) [§5.F.2] |
| **Denda keterlambatan** | Denda otomatis per LateFeeRule (grace period, nominal/persen) [§5.F.3] |
| **Refund** | Pengembalian pembayaran dengan approval & metode [§5.F.4] |
| **Rekonsiliasi** | Pencocokan pembayaran vs mutasi bank → MATCHED/UNMATCHED [§5.F.5] |
| **Arus kas** | Kas masuk/keluar & outstanding per periode [§5.F.6] |
| **Payment gateway** | Layanan pembayaran digital (QRIS, VA) [§5.F.7] |
| **QRIS / VA** | Quick Response Code Indonesian Standard / Virtual Account [§5.F.7] |
| **MDR** | Merchant Discount Rate — biaya transaksi gateway (pendidikan 0,6%) [§5.F.7][riset-06 Topik 8] |
| **CWV** | Core Web Vitals — LCP, INP, CLS (target §7.1) [riset-06 Topik 10] |
| **LCP / INP / CLS** | Largest Contentful Paint / Interaction to Next Paint / Cumulative Layout Shift [§7.1] |
| **PWA / IndexedDB** | Progressive Web App / penyimpanan lokal browser untuk offline queue [§7.2][tek-02 §10][riset-06 Topik 10] |
| **Feature flag** | Saklar on/off fitur aplikasi, dikendalikan SUPERADMIN (admin sistem sekolah) [§5.N] |
| **Argon2id** | Algoritma hash password (OWASP) — hash default autentikasi [§5.P] |
| **Kebijakan Ekosistem Penuh** | Tanpa dependensi API/layanan pihak ketiga untuk fitur; infrastruktur boleh managed & swappable [§5.O] |
| **SLO** | Service Level Objective — target kuantitatif (uptime ≥ 99%, p95 < 3 s, error < 1%) [§8.2] |
| **RPO / RTO** | Recovery Point Objective (≤ 24 jam, target 15 mnt) / Recovery Time Objective (≤ 4 jam) [§6] |
| **PITR** | Point-In-Time Recovery — pemulihan database ke titik waktu [§8.1] |
| **Dapodik / ANBK** | Data Pokok Pendidikan / Asesmen Nasional Berbasis Komputer [riset-06 Topik 2] |
| **CP / TP / ATP** | Capaian Pembelajaran / Tujuan Pembelajaran / Alur Tujuan Pembelajaran (Kurikulum Merdeka) [riset-06 Topik 3] |
| **P5** | Projek Penguatan Profil Pelajar Pancasila (rapor terpisah) [riset-06 Topik 3] |
| **UU PDP** | Undang-Undang Pelindungan Data Pribadi (No. 27/2022) [riset-06 Topik 1] |
| **DPIA** | Data Protection Impact Assessment — penilaian dampak pemrosesan risiko tinggi [riset-06 Topik 1] |
| **Homeroom / wali kelas** | Guru penanggung jawab kelas — via `Class.homeroom_teacher_id`, bukan role [§3.1, §4] |
| **PKL / UKK / DUDI** | Praktik Kerja Lapangan / Uji Kompetensi Keahlian / Dunia Usaha-Dunia Industri [§5.L] |
| **Rollover tahun ajaran** | Proses menutup tahun ajaran & menyiapkan tahun baru (naik kelas, kelulusan, arsip) [§5.R] |
| **AcademicYear** | Entitas tahun ajaran (status OPEN/CLOSED) [§5.R] |
| **Carry-over** | Invoice belum lunas yang diteruskan ke tahun ajaran baru [§5.R] |

---

## 16. Lampiran

### 16.1 Lampiran A — Mapping role lengkap (12 role → permission utama)

| Role | Permission kunci (subset) | Scope |
|------|---------------------------|-------|
| SUPERADMIN | `system:write:school`, `monitor:read:school`, `featureflag:write:school`, `audit:read:school` | SEKOLAH |
| KEPSEK | `report:read:school`, `cashflow:read:school`, `payroll:approve:school` (rekap), `counseling:read:class`, `audit:read:school` | SEKOLAH |
| WAKEPSEK | `schedule:write:school`, `exam:write:school`, `exam:token:school`, `discipline:record:class` | SEKOLAH |
| OPERATOR | `class:write:school`, `import:run:school`, `invitation:send:school`, `ppdb:verify:school`, `app:write:school` | SEKOLAH |
| KEUANGAN | `invoice:write:school`, `payment:verify:school`, `refund:approve:school`, `reconciliation:run:school`, `payroll:write:school`, `payroll:run:school` | SEKOLAH |
| GURU | `material:write:class`, `assignment:write:class`, `submission:grade:class`, `exam:token:class`, `attendance:session:write:class` | KELAS |
| GURU_BK | `counseling:write:school`, `permit:verify:class`, `discipline:record:class` | SEKOLAH/KELAS |
| SISWA | `submission:submit:self`, `exam:attempt:self`, `attendance:scan:self`, `material:read:class`, `invoice:read:self` (lihat status tagihan sendiri — sesuai prd01 §5.5) | SENDIRI/KELAS |
| WALI_MURID | `report:read:self` (anak), `invoice:read:self` (anak), `permit:request:self` (anak) | SENDIRI |
| CALON_SISWA | `ppdb:register:public` (via endpoint publik), `ppdb:read:self` | SENDIRI |
| PEMBIMBING_INDUSTRI | `internship:journal:self`, `internship:grade:self` (siswa bimbingan) | SENDIRI |
| PENGUJI_EKSTERNAL | `competency:grade:self` (penugasan) | SENDIRI |

Catatan: permission penuh (~120) di-seed di implementasi; tabel ini adalah subset otoritatif untuk desain.

### 16.2 Lampiran B — Referensi dokumen

| Dokumen | Peran untuk prd04 |
|---------|-------------------|
| docs/prd/prd01.md | Fondasi produk (role, modul, arsitektur) — digantikan sebagai acuan produk oleh prd04 |
| docs/prd/prd02.md | Ujian/absensi online + peta modul — diadopsi |
| docs/prd/prd03.md | Audit 24 gap — diadopsi sebagai backlog & fondasi teknis |
| docs/01-master-prd.md | Master terpadu — dirujuk untuk MVP & roadmap |
| docs/02-technical-architecture.md | Arsitektur teknis — dirujuk, tidak diubah |
| docs/03-database-erd.md | ERD 61 entitas (56 + 4 platform baru + Alumni) — dirujuk; catatan: enum Role mengikuti §3.1 prd04 |
| docs/04-api-contract.md | Kontrak API & RBAC matrix — dirujuk |
| docs/05-implementation-plan.md | Plan task — dirujuk untuk roadmap eksekusi |
| docs/06-research-validations.md | Validasi regulasi & standar (UU PDP, Kurikulum, pajak/BPJS, gateway, aset, performa) — Topik 1–16 — wajib selaras; **gateway (Topik 8) = referensi untuk fitur opsional flag OFF default [§5.F.7, §5.O]**; regulasi Q14–Q17 & Q20 (Topik 11–16) |
| docs/07-ux-design.md | Spesifikasi UX/UI — dirujuk |

### 16.3 Catatan penutup

Dokumen ini adalah acuan produk utama (flagship). Dokumen teknis 02–05 tetap menjadi rujukan implementasi dan tidak diubah oleh prd04. Perubahan yang memengaruhi desain teknis (mis. enum Role, entitas payroll/aset/pembayaran baru) wajib disinkronkan oleh openteam-architect/openteam-coder pada tahap implementasi gelombang 2.

**Follow-up sinkronisasi (task prasyarat sebelum Fase 0 build):** sinkronisasi **enum Role baru** (KEPSEK/WAKEPSEK/OPERATOR/WALI_MURID; WALI_KELAS dihapus) dan **entitas W2** (PayrollRun, Payslip, dll.) ke **03-database-erd**, **04-api-contract**, dan **07-ux-design** — ditetapkan sebagai task prasyarat sebelum Fase 0 build (bukan menunggu gelombang 2).

**Sinkronisasi v4.1 (task prasyarat):** (a) 02-technical-architecture: ganti Supabase Auth/Storage → auth in-house + self-managed storage; hapus Jitsi (§9.1) → catatan WebRTC/ditunda; (b) 04-api-contract: header Authorization tetap JWT (tanpa 'Supabase'), endpoint auth disesuaikan; (c) 07-ux-design: layar login hapus tombol Google, tampilkan satu kolom 'Email atau Username + Password'; (d) 03-database-erd: tambah entitas FeatureFlag & AppFeatureSetting; (e) 05-implementation-plan: task F1-T1 (Supabase) → auth in-house; tambah task feature flags; (f) 01-master-prd: bagian Auth (SSO Supabase/Google OAuth), Live Class (Jitsi), dan Payroll 'out of scope' di-supersede oleh §5.E/§5.O/§5.P prd04 v4.1; **bagian multi-tenancy/tenant isolation/school_id/billing di 01-master di-supersede oleh keputusan single-school prd04 §2/§4/§6/§8 [owner-v4.2]**.

**(g) Sinkronisasi single-school [owner-v4.2]:** dokumen teknis 02-05/07 serta dokumen riset 06 yang masih memuat konsep multi-tenant (school_id, tenant isolation, RLS tenant, X-School-Id, school switcher, SUPERADMIN SaaS, billing) wajib disinkronkan: 02-technical-architecture (hapus dimensi tenant), 03-database-erd (hapus school_id semua tabel; UserSchoolRole→UserRole), 04-api-contract (hapus X-School-Id; RBAC tanpa TENANT), 05-implementation-plan (task F0/F1), 07-ux-design (hapus school switcher); **06-research-validations.md: Topik 4 'Multi-tenant SaaS + RLS' disesuaikan menjadi RLS opsional defense-in-depth TANPA dimensi tenant/school_id; klausa 'penyedia SaaS'/'per tenant' ditandai tidak relevan untuk single-school [owner-v4.2]**.

_End of document — 16 seksi lengkap._

<!-- PRD04:SELESAI -->
