# openlms — Master PRD Terpadu (v1.0 + Fase 2 + Fase 3)

> **SUPERSEDED oleh prd04 v4.2 (Single-School) [owner-v4.2]** — bagian Auth/Live Class/Payroll/Multi-tenancy di-supersede; gunakan prd04 sebagai acuan produk utama.

**Versi:** 1.0 (Master)
**Tanggal:** 6 Agustus 2026
**Status:** Draft eksekusi — dokumen tunggal acuan implementasi
**Pemilik Produk:** Aditya
**Dokumen Sumber:**
- prd01.md — PRD v1.0 (fondasi: 9 role, 7 modul, arsitektur) — disebut **[v1]**
- prd02.md — PRD Fase 2 v2.0 (Ujian Online, Absensi Online, peta modul menyeluruh) — disebut **[v2]**
- prd03.md — PRD Fase 3 v3.0 (audit 24 gap G1–G24 + prioritisasi) — disebut **[v3]**

> Tujuan dokumen ini: satu rujukan eksekusi yang menggabungkan ketiga PRD, menyelesaikan
> inkonsistensi antar dokumen, dan menetapkan definisi MVP final yang tidak ambigu.
> Dokumen teknis (ERD Prisma, API contract, wireframe) tetap dokumen terpisah — dirujuk singkat di §4.

---

## 1. Ringkasan Eksekutif (BLUF)

**openlms adalah platform SaaS multi-tenant yang menggabungkan LMS (Learning Management System) dan SIS (School Information System) untuk SMA/SMK Indonesia, menggantikan kombinasi Google Classroom + Excel + WhatsApp + sistem manual [v1 §1].**

Dokumen ini adalah satu-satunya acuan eksekusi terpadu dari tiga PRD: v1.0 (fondasi), Fase 2 (digitalisasi menyeluruh), dan Fase 3 (audit 24 gap). Tiga keputusan kunci yang direkomendasikan:

1. **Definisi MVP final = fondasi multi-tenancy + auth/RBAC + LMS inti + kuis & penilaian + absensi online QR + ujian online bertahap + e-Rapor dasar + portal orang tua read-only + fondasi teknis non-negotiable (testing, observability, backup/DR, security hardening, retensi & consent data anak) + migrasi data onboarding + offline-first minimal** — lihat §5. Ini mengoreksi definisi MVP v1.0 (Fase 0–2) yang belum memuat fondasi teknis yang menurut prd03 §8 wajib ada sebelum sekolah pilot memegang data sungguhan.
2. **Ditunda pasca-MVP:** PPDB (jadwal-dependent), keuangan SPP, live class, tata tertib, dan seluruh modul pendukung (BK, kepegawaian, sarpras, perpustakaan, alumni, komunikasi formal) — dibangun sesuai kebutuhan sekolah pilot, bukan semuanya sekaligus [v2 §8].
3. **Kekhususan SMK (PKL/UKK/DUDI) dan integrasi Dapodik/ANBK dibangun hanya jika target pasar mencakup SMK**, dan wajib divalidasi ke sekolah SMK riil sebelum development [v3 §8 #3].

Dokumen ini juga mencatat **12 inkonsistensi internal antar dokumen sumber** (§12), yang paling signifikan: definisi MVP v1.0 vs prd03 §8, referensi silang salah di prd02 §2.2e, dan target pasar SMA vs SMA+SMK yang belum final.

---

## 2. Visi, Latar Belakang & Tujuan

### 2.1 Visi Produk

Satu platform terpadu yang mencakup **seluruh siklus operasional sekolah** — dari PPDB, proses belajar-mengajar (materi, tugas, kuis, ujian), penilaian & rapor, administrasi (absensi, kepegawaian), keuangan (SPP), hingga alumni [v1 §1][v2 §1]. Platform selaras dengan **Kurikulum Merdeka** dan sistem nasional (Dapodik, ANBK) [v3 §1], melayani banyak sekolah dari satu codebase dengan data terisolasi per sekolah [v1 §1].

### 2.2 Latar Belakang & Masalah

Sekolah SMA/SMK Indonesia umumnya memakai kombinasi tools terpisah: Google Classroom (kelas), Excel (nilai/administrasi), WhatsApp (komunikasi), serta sistem manual/kertas (PPDB, keuangan) [v1 §2]. Akibatnya:

- Data tersebar dan tidak terhubung antar peran — guru tidak tahu status pembayaran siswa, wali kelas rekap manual dari banyak guru mapel [v1 §2].
- Tidak ada satu sumber data (single source of truth) untuk keputusan kepala sekolah/waka [v1 §2].
- PPDB manual rawan human error dan lambat [v1 §2].
- Ujian dan absensi masih manual/terputus dari sistem nilai — hasil ujian tidak otomatis masuk rapor, absensi tidak real-time [v2 §1].

### 2.3 Tujuan Bisnis

- Menyediakan platform terpadu pengganti kombinasi tools terpisah [v1 §1.1].
- Model bisnis SaaS: sekolah berlangganan (per siswa/bulan atau flat fee per sekolah — **masih perlu divalidasi**, lihat §10 Q1) [v1 §1.1][v3 G18].
- Skalabel untuk melayani banyak sekolah dari satu codebase & infrastruktur [v1 §1.1].
- Produk SaaS yang berkelanjutan: model harga jelas, onboarding self-service, support — agar bisa menjual ke sekolah kedua dan seterusnya [v3 G18–G20].

### 2.4 Tujuan Produk (MVP)

- Sekolah bisa onboarding mandiri, mengundang guru & siswa, dan mulai memakai LMS inti (materi, tugas, kuis, nilai) **dalam hitungan hari, bukan minggu** [v1 §1.2].
- Onboarding tidak boleh menjadi entry manual masif — wajib ada **wizard impor data** dari Excel/sistem lama (G9) [v3 G9].
- Platform tetap berfungsi di kondisi jaringan Indonesia yang tidak stabil (offline-first minimal) [v3 G10].

---

## 3. Role & Persona

### 3.1 Sembilan Role Dasar [v1 §3]

| # | Role | Deskripsi | Kebutuhan Utama | Tambahan dari Fase 2/3 |
|---|------|-----------|-----------------|------------------------|
| 1 | **Siswa** | Peserta didik aktif | Lihat materi, kerjakan tugas/kuis, lihat nilai & jadwal | Ikut ujian online (token sesi, randomisasi soal, autosave) [v2 §2.2]; absensi QR scan [v2 §3.1] |
| 2 | **Guru (Mapel)** | Pengajar mata pelajaran | Upload materi, buat tugas/kuis, nilai, absen per kelas | Generate QR absensi per sesi [v2 §3.1]; susun paket ujian & nilai esai berdampingan [v2 §2.2]; lihat analisis butir soal [v2 §2.2e]; deteksi kemiripan jawaban (pasca-MVP) [v3 G22] |
| 3 | **Wali Kelas** | Guru penanggung jawab satu kelas | Rekap nilai & absensi kelas, buat rapor, komunikasi ke orang tua | Verifikasi izin/sakit online siswa [v2 §3.2]; notifikasi alpa otomatis [v2 §3.2]; dashboard kedisiplinan [v2 §3.2]; input poin pelanggaran (pasca-MVP) [v2 §4.2] |
| 4 | **Tata Usaha (TU)** | Staf administrasi | Kelola data induk siswa/guru, surat-menyurat, arsip | Verifikasi dokumen PPDB [v1 §5.6]; jalankan wizard impor data [v3 §4.5]; kelola surat-menyurat digital (pasca-MVP) [v2 §4.9] |
| 5 | **Keuangan** | Staf pengelola SPP/pembayaran | Catat & verifikasi pembayaran, tagihan, laporan keuangan | (tidak berubah signifikan; RAB/anggaran pasca-MVP) [v2 §4.7] |
| 6 | **Wakil Kepala Sekolah (Waka)** | Pengawas bidang (kurikulum/kesiswaan) | Dashboard ringkasan akademik & kedisiplinan | Mengawasi jadwal & hasil ujian [v2 §2.2b]; dashboard kedisiplinan (bersama wali kelas/BK) [v2 §3.2] |
| 7 | **Kepala Sekolah** | Pimpinan sekolah | Dashboard eksekutif seluruh sekolah | Laporan keuangan ringkas [v1 §5.5]; akses catatan BK (terbatas) [v2 §4.2] |
| 8 | **Calon Siswa/Orang Tua (PPDB)** | Pendaftar siswa baru | Isi formulir, upload dokumen, cek status seleksi | Consent data anak di bawah umur saat pendaftaran [v3 §4.2] |
| 9 | **Superadmin (penyedia SaaS)** | Pengelola platform (Aditya/tim) | Kelola tenant/sekolah, billing, monitoring sistem | Dashboard analitik lintas-sekolah (retensi, adopsi fitur) [v3 G21]; kelola tier harga & billing (pasca-MVP) [v3 G18] |

### 3.2 Role Tambahan dari Fase Lanjutan

| # | Role | Asal | Kebutuhan Utama |
|---|------|------|-----------------|
| 10 | **Orang Tua Siswa Aktif** | [v1 §9] diangkat menjadi cakupan resmi [v2 §4.9] | Melihat nilai, absensi, dan (nanti) tagihan anak via **portal orang tua read-only** [v2 §4.9]; mengajukan izin/sakit anak [v2 §3.2]; consent data anak [v3 §4.2] |
| 11 | **Guru BK** | [v2 §4.2] | Catatan konseling (data sensitif, akses terbatas: BK, kepsek, wali kelas terkait) [v2 §4.2]; dashboard kedisiplinan [v2 §3.2]; bimbingan karir/SNBP-SNBT (pasca-MVP) [v3 G5] |
| 12 | **Pembimbing Industri (DUDI)** | [v3 §4.3] | Akun khusus non-guru, akses terbatas hanya ke siswa bimbingannya; menilai jurnal PKL siswa (pasca-MVP, kondisional SMK) [v3 §4.3] |
| 13 | **Penguji Eksternal (UKK)** | [v3 §4.3] | Penguji uji kompetensi keahlian dari industri/DUDI (kondisional untuk SMK, modul UKK pasca-MVP); menilai UKK siswa via rubrik checklist kompetensi [v3 §4.3] |

---

## 4. Ruang Lingkup Modul Terintegrasi

Modul digabung dari 7 modul v1.0 [v1 §4.1], peta menyeluruh Fase 2 [v2 §4], dan penguatan Fase 3 [v3 §2–§4], lalu **diduplikasi-deduplikasi dan diurutkan logis per bidang**. Kolom *Status* mengacu keputusan MVP §5. Penanda sumber: [v1]=prd01, [v2]=prd02, [v3]=prd03 (G=nomor gap).

| # | Bidang / Modul | Cakupan Utama | Sumber | Status |
|---|----------------|---------------|--------|--------|
| 1 | **Auth & Manajemen Tenant** | Onboarding sekolah, SSO Supabase (Google OAuth + email/password), undangan guru/siswa via link, RBAC per role + tenant (school_id), multi-role lintas sekolah (desain sejak awal) | [v1 §5.1] | **MVP** |
| 2 | **LMS Inti** | Kelas (mapping kelas fisik + mapel), materi (dokumen/video/link), tugas + deadline + lampiran, submission siswa (telat ditandai), penilaian skor + feedback | [v1 §5.2] | **MVP** |
| 3 | **Kuis & Penilaian** | Bank soal (PG auto-grade, esai manual-grade), pengaturan waktu & jadwal buka/tutup, acak urutan soal, rekap nilai per siswa/kelas/mapel, ekspor CSV/PDF | [v1 §5.3] | **MVP** (fondasi ujian online) |
| 4 | **Ujian Online** | Bank soal lanjutan (tag bab/kesukaran/jenis), paket A/B/C, jadwal sesi (buka/tutup otomatis, sesi ganda), token unik per sesi, randomisasi soal & opsi, autosave + auto-submit, satu akun satu sesi, lock-browser (log saja), log aktivitas, auto-grade PG/isian + manual-grade esai berdampingan, analisis butir soal, nilai terhubung ke e-Rapor; proctoring webcam **tidak** masuk (privasi) | [v2 §2] | **MVP** (bertahap; lock-browser & analisis butir bisa susul) |
| 5 | **Absensi Online** | QR per sesi mapel (expired 5–10 menit, single-use), self check-in geofencing (opsional), input manual guru (fallback), izin/sakit online + upload surat + verifikasi wali kelas, rekap otomatis per siswa/mapel/semester, notifikasi alpa ke wali kelas, dashboard kedisiplinan (ambang konfigurasi, mis. >3x alpa/bulan), RFID/barcode (di luar Fase 2) | [v1 §5.4][v2 §3] | **MVP** |
| 6 | **e-Rapor** | Kompilasi nilai sumatif + kuis + ujian + absensi + catatan wali kelas sesuai format rapor Kurikulum Merdeka | [v2 §4.1][v2 §8 #3] | **MVP** (dasar; versi penuh P5/sikap pasca-MVP) |
| 7 | **Portal Orang Tua** | Lihat nilai, absensi anak (read-only); tagihan menyusul saat modul keuangan | [v2 §4.9][v2 §8 #5] | **MVP** |
| 8 | **PPDB** | Formulir publik (tanpa login), upload dokumen (KK/akta/rapor), verifikasi TU, pengumuman seleksi, pendaftar lolos otomatis jadi akun siswa, consent data anak | [v1 §5.6][v2 §4.3][v3 §4.2] | **Pasca-MVP** (jadwal-dependent, §5.3) |
| 9 | **Keuangan** | Tagihan SPP/bulanan/kegiatan, pencatatan pembayaran manual + bukti upload, status tagihan siswa/ortu, laporan keuangan kepsek; RAB/anggaran & payment gateway pasca-MVP | [v1 §5.5][v2 §4.7] | **Pasca-MVP** |
| 10 | **Live Class & Notifikasi** | Integrasi Jitsi (self-host) + opsi link Zoom/Meet manual; notifikasi real-time Socket.IO + notification center | [v1 §5.7] | Notifikasi dasar: **MVP**; Live class: pasca-MVP |
| 11 | **Manajemen Kurikulum** | Selaras Kurikulum Merdeka (CP, ATP), jadwal pelajaran otomatis dengan validasi bentrok | [v2 §4.1] | Pasca-MVP |
| 12 | **Kesiswaan** | Tata tertib & poin pelanggaran (pencatatan, akumulasi, notifikasi ortu), ekstrakurikuler (pendaftaran, presensi, prestasi/piagam), OSIS (struktur, program kerja — prioritas rendah) | [v2 §4.2] | Pasca-MVP |
| 13 | **Bimbingan Konseling (BK)** | Catatan konseling (data sensitif: field-level access, audit log), dashboard kedisiplinan | [v2 §4.2][v3 G14] | Pasca-MVP |
| 14 | **Kepegawaian** | Data induk guru/staf (riwayat pendidikan, sertifikasi, mapel), absensi guru/staf; **payroll di luar cakupan** (kompleksitas PPh 21/BPJS — modul terpisah atau pihak ketiga) | [v2 §4.4] | Pasca-MVP |
| 15 | **Sarana & Prasarana** | Inventaris aset, peminjaman ruang/alat (booking: lab, aula, proyektor) | [v2 §4.5] | Pasca-MVP |
| 16 | **Perpustakaan** | Katalog buku, peminjaman/pengembalian, reminder jatuh tempo | [v2 §4.6] | Pasca-MVP |
| 17 | **Alumni** | Direktori alumni, tracking studi lanjut/karier (akreditasi & networking) | [v2 §4.8] | Pasca-MVP |
| 18 | **Komunikasi** | Pengumuman (broadcast per role), surat-menyurat digital (approval flow + tanda tangan digital sederhana) | [v2 §4.9] | Pasca-MVP |
| 19 | **Kekhususan SMK (kondisional)** | PKL/Prakerin (penempatan DUDI, jurnal harian dari HP, penilaian pembimbing industri + guru pembimbing), UKK (rubrik checklist kompetensi, penguji eksternal), direktori mitra DUDI | [v3 G1 / §4.3] | Pasca-MVP (hanya jika target SMK, §5.3) |
| 20 | **Integrasi Sistem Nasional (kondisional)** | Ekspor terstruktur ke format Dapodik (data induk siswa/guru/rombel — mulai dari file Excel/CSV, bukan API langsung), keselarasan struktur data untuk ANBK | [v3 G4 / §4.4] | Pasca-MVP (validasi akses dulu) |
| 21 | **Penguatan Kurikulum** | Asesmen diagnostik awal semester/tahun (G3), P5 dengan sistem penilaian & rapor terpisah (G2), penjurusan/peminatan & bimbingan karir SNBP/SNBT (G5) | [v3 G2/G3/G5] | Pasca-MVP |
| 22 | **Data & Analitik** | Dashboard analitik superadmin lintas-sekolah (G21), learning analytics guru (G23), deteksi kemiripan jawaban/plagiarism dasar (G22), kalender terpadu (G24), gamifikasi (G17) | [v3 G17/G21–G24] | Pasca-MVP (backlog) |
| 23 | **UX Lintas Produk** | Aksesibilitas WCAG AA menyeluruh (G15), mode hemat kuota/data-saver + kompresi server-side (G16), PWA offline (G10) | [v3 G10/G15/G16] | G10 & kompresi dasar: **MVP**; sisanya pasca-MVP |

**Di luar cakupan (Out of Scope):** aplikasi mobile native (web-only responsive di awal) [v1 §4.2]; payment gateway otomatis SPP (integrasi pihak ketiga fase lanjutan) [v1 §4.2]; video conferencing yang dibangun sendiri (pakai integrasi pihak ketiga) [v1 §4.2]; fitur akademik SD/SMP [v1 §4.2]; payroll/penggajian [v2 §4.4].

---

## 5. Definisi MVP FINAL

### 5.1 Prinsip Keputusan

Definisi MVP v1.0 (Fase 0–2 = auth + LMS inti) **tidak lagi memadai** karena bertentangan dengan prd03 §8 yang menetapkan fondasi teknis & kepatuhan sebagai **non-negotiable sebelum sekolah pilot memegang data sungguhan**. Keputusan MVP final menggabungkan:

- v1.0 roadmap Fase 0–2 [v1 §8] sebagai inti produk.
- v2 §8 urutan eksekusi nyata (absensi online #1, ujian online #2, e-Rapor #3, portal ortu #5) [v2 §8].
- v3 §8: G6, G7, G8, G11, G12, G13 sebelum pilot (fondasi kepercayaan & legal); G9 (migrasi data) dan G10 (offline-first) untuk adopsi [v3 §8].

### 5.2 Scope MVP (WAJIB) — harus selesai sebelum sekolah pilot live dengan data sungguhan

| Grup | Item | Sumber |
|------|------|--------|
| **A. Fondasi platform & teknis (non-negotiable)** | Fase 0: data model multi-tenant, kolom `school_id`, RLS PostgreSQL, desain tabel `AuditLog` generik | [v1 §8][v1 §6.5][v3 §5] |
| | Fase 1: auth Supabase SSO, RBAC multi-role lintas tenant, onboarding sekolah, undangan guru/siswa | [v1 §5.1][v1 §8] |
| | G6 Testing: unit test logika penilaian & RBAC, integration test alur ujian online, E2E flow onboarding; dijalankan di CI | [v3 §4.1] |
| | G7 Observability: structured logging + request ID, error tracking, alert saat error rate/latensi di luar ambang (terutama jam ujian) | [v3 §4.1] |
| | G8 Backup & DR: backup PostgreSQL harian + point-in-time recovery, RPO ≤ 24 jam, RTO ≤ 4 jam, backup terpisah region | [v3 §4.1] |
| | G11 Security hardening: rate limiting per endpoint (login & submit ujian), brute-force lockout, CSRF, CSP, dependency scanning | [v3 §4.1] |
| | G12 Retensi data: arsip data siswa lulus/keluar, penghapusan penuh setelah periode retensi | [v3 §4.2] |
| | G13 Consent data anak: persetujuan orang tua/wali eksplisit + timestamp saat pendaftaran siswa di bawah umur | [v3 §4.2] |
| | G9 Migrasi data onboarding: wizard impor Excel (siswa, guru, kelas) + validasi/preview + deteksi duplikasi (NISN) | [v3 §4.5] |
| **B. Inti akademik** | LMS inti: kelas, materi, tugas, submission, penilaian + feedback | [v1 §5.2][v1 §8 Fase 2] |
| | Kuis & penilaian: bank soal PG/esai, auto-grade, rekap nilai, ekspor CSV/PDF (fondasi ujian online) | [v1 §5.3][v1 §8 Fase 3] |
| | Absensi online: QR per sesi (single-use, expired 5–10 menit) + input manual fallback + izin online + rekap + notifikasi alpa + dashboard kedisiplinan dasar | [v2 §3][v2 §8 #1] |
| | Ujian online bertahap: bank soal + paket A/B/C + jadwal sesi + token + randomisasi + autosave + auto-submit + satu akun satu sesi + log aktivitas + auto-grade PG/isian + manual-grade esai berdampingan | [v2 §2][v2 §8 #2] |
| | e-Rapor dasar: konsolidasi nilai (tugas+kuis+ujian+absensi) + catatan wali kelas, format rapor Kurikulum Merdeka | [v2 §4.1][v2 §8 #3] |
| | Notifikasi dasar: Socket.IO + notification center (dependensi absensi & ujian) | [v1 §5.7][v2 §3.2] |
| **C. Adopsi & nilai jual pilot** | Portal orang tua read-only (nilai + absensi; tagihan menyusul saat modul keuangan) | [v2 §4.9][v2 §8 #5] |
| | G10 Offline-first minimal: **queue absensi QR + cache materi dasar = MVP**; PWA penuh/luas (mode offline menyeluruh) ditunda pasca-MVP; kompresi upload server-side dasar ikut (G16) | [v3 §4.6] |
| | Support minimal (operasional, bukan fitur): channel WhatsApp/email untuk sekolah pilot | [v3 G20 — versi ringan] |

### 5.3 Pasca-MVP (OPSIONAL / DITUNDA)

| Timing | Item | Alasan tunda | Sumber |
|--------|------|--------------|--------|
| **Jendela semester pilot (MVP+)** | Tata tertib & poin pelanggaran | Relatif sederhana, dampak besar untuk wali kelas — masuk jika kapasitas tim cukup setelah inti stabil | [v2 §8 #4][v2 §4.2] |
| **Sebelum musim PPDB berikutnya** | PPDB (formulir publik, verifikasi, pengumuman, consent) | Bersifat musiman; bukan penentu pemakaian LMS harian; wajib siap sebelum musim pendaftaran sekolah pilot | [v1 §5.6][v1 §8 Fase 5] |
| **Setelah nilai & portal ortu berjalan** | Keuangan SPP (tagihan, pembayaran manual, laporan) | Prasyarat fitur "tagihan" di portal ortu; masuk sebelum sekolah kedua butuh billing penuh | [v1 §5.5][v1 §8 Fase 4] |
| **Setelah kebutuhan pilot teridentifikasi** | BK, ekskul, kepegawaian, sarpras, perpustakaan, alumni, komunikasi formal/surat-menyurat | Modul independen — pilih berdasarkan kebutuhan sekolah pilot spesifik, jangan dibangun semua | [v2 §8 #6][v2 §4.2–4.9] |
| **Setelah inti stabil** | Live class (Jitsi), lock-browser penuh, analisis butir soal | Lock-browser & analisis butir bertahap setelah ujian stabil | [v1 §5.7][v2 §2.2c/2.2e][v2 §8 #2] |
| **Kondisional: hanya jika target pasar SMK** | Modul SMK: PKL/Prakerin, UKK, direktori DUDI | Wajib validasi ke sekolah SMK riil sebelum dibangun — jangan asumsi dari PRD | [v3 G1 / §4.3][v3 §8 #3] |
| **Kondisional: validasi akses dulu** | Integrasi Dapodik/ANBK (ekspor file) | Mulai dari ekspor Excel/CSV; jangan janji API real-time sebelum verifikasi akses resmi | [v3 G4 / §4.4][v3 §7] |
| **Backlog (evaluasi setelah traksi)** | P5, asesmen diagnostik, BK karir/SNBP-SNBT, aksesibilitas menyeluruh, data-saver penuh, gamifikasi, plagiarism, learning analytics, kalender terpadu, dashboard superadmin, support/helpdesk penuh, billing & tier harga, payment gateway, mobile native | Nilai tambah nyata tapi bukan penentu sekolah pilot bertahan di tahun pertama | [v3 §3][v1 §9] |

### 5.4 Aturan Pemotongan (Cut-Line) — jika kapasitas tim tidak cukup

Urutan pengorbanan jika scope MVP masih terlalu besar untuk dikerjakan solo (risiko utama [v1 §10]):

1. **Pertama dipangkas:** analisis butir soal ujian, lock-browser (cukup log manual), variasi paket >2, sesi ganda ujian.
2. **Kedua:** esai on-platform ujian (alihkan ke alur manual-grade kuis v1 yang sudah ada); portal ortu diturunkan ke fitur "lihat nilai saja" (absensi menyusul).
3. **Ketiga:** e-Rapor diturunkan ke ekspor rekap nilai + template rapor (format final pasca-MVP).
4. **TIDAK BOLEH dipangkas:** G6, G7, G8, G11, G12, G13 (fondasi kepercayaan & legal), G9 (migrasi data), dan isolasi tenant (RLS + RBAC).

---

## 6. Roadmap Terpadu

Penggabungan roadmap v1.0 Fase 0–6 [v1 §8], urutan eksekusi Fase 2 [v2 §8], dan prioritas gap Fase 3 [v3 §3/§8] menjadi satu urutan fase yang konsisten. Fase 0–8 = **Scope MVP**; Fase 9+ = **Pasca-MVP**.

| # | Nama Fase | Cakupan | Output | Pintu Keluar (Definition of Done) |
|---|-----------|---------|--------|-----------------------------------|
| 0 | **Fondasi data & multi-tenancy** | Skema Prisma final, kolom `school_id`, RLS PostgreSQL, desain tabel `AuditLog` generik | Skema & strategi RLS final | Migrasi database bersih; uji: query lintas tenant gagal; desain AuditLog siap [v1 §8][v1 §6.5][v3 §5] |
| 1 | **Auth, tenant & onboarding** | SSO Supabase, RBAC multi-role, onboarding mandiri, undangan guru/siswa, **wizard impor data (G9)** | Login multi-role lintas tenant; impor siswa/guru/kelas dari Excel | Sekolah baru bisa impor data & login dalam 1 hari kerja [v1 §5.1][v1 §8][v3 §4.5] |
| 2 | **Fondasi teknis produksi** | G6 testing (CI), G7 observability, G8 backup/DR, G11 security hardening, G12 retensi, G13 consent | CI hijau, alerting, backup teruji, rate limit & lockout, consent tercatat | Restore backup sukses ≤ 4 jam; alert terkirim saat error; CI wajib sebelum deploy [v3 §4.1–4.2] |
| 3 | **LMS inti** | Kelas, materi, tugas, submission, penilaian + feedback, notifikasi dasar | Kelas virtual berfungsi | Guru pilot membuat kelas, upload materi, memberi tugas, menilai submission [v1 §5.2][v1 §8 Fase 2] |
| 4 | **Kuis & penilaian** | Bank soal PG/esai, auto-grade, jadwal buka/tutup, rekap nilai, ekspor CSV/PDF | Rekap nilai per siswa/kelas/mapel | Guru membuat kuis, siswa mengerjakan, nilai otomatis terhitung [v1 §5.3][v1 §8 Fase 3] |
| 5 | **Absensi online** | QR per sesi + fallback manual, izin/sakit online + verifikasi, rekap otomatis, notifikasi alpa, dashboard kedisiplinan, **offline queue (G10)** | Absensi real-time per mapel | QR single-use & expired bekerja; alpa memicu notifikasi wali kelas; absensi tetap tersimpan saat offline [v2 §3][v2 §8 #1][v3 §4.6] |
| 6 | **Ujian online (bertahap)** | Paket A/B/C, jadwal sesi (buka/tutup otomatis, sesi ganda), token per sesi, randomisasi soal & opsi, autosave + auto-submit, satu akun satu sesi, log aktivitas, auto-grade PG/isian + manual-grade esai; lock-browser log-only menyusul | Ujian PTS/PAS/PAT online | **Load test satu sesi penuh lulus** (beban puncak submit massal); hasil ujian terhubung ke e-Rapor [v2 §2][v2 §8 #2][v2 §7] |
| 7 | **e-Rapor dasar** | Konsolidasi nilai (tugas+kuis+ujian+absensi), catatan wali kelas, format rapor Kurikulum Merdeka | Rapor semester per kelas | Wali kelas menghasilkan rapor satu kelas dari data yang sudah ada [v2 §4.1][v2 §8 #3] |
| 8 | **Portal orang tua (read-only)** | Lihat nilai & absensi anak; tagihan menyusul | Portal ortu berfungsi | Orang tua pilot login dan melihat data anak [v2 §4.9][v2 §8 #5] |
| — | **Gerbang rilis MVP** | Review menyeluruh: metrik §9, retrospeksi pilot, keputusan open question §10 | Keputusan lanjut ke fase berikutnya | Sekolah pilot aktif 1 semester; ≥ 70% guru rutin pakai [v1 §11] |
| 9 | **PPDB** | Formulir publik, upload dokumen, verifikasi TU, pengumuman, akun otomatis, consent | Siklus PPDB online | Siap sebelum musim PPDB sekolah pilot [v1 §5.6][v1 §8 Fase 5][v3 §4.2] |
| 10 | **Keuangan SPP** | Tagihan, pencatatan pembayaran manual + bukti, status tagihan, laporan kepsek | Modul keuangan dasar | Tagihan & pembayaran tercatat; laporan tersedia; tagihan tampil di portal ortu [v1 §5.5][v1 §8 Fase 4] |
| 11 | **Tata tertib & poin** | Pencatatan pelanggaran, akumulasi poin, notifikasi ortu | Modul tata tertib | Wali kelas input & rekap poin pelanggaran [v2 §4.2][v2 §8 #4] |
| 12 | **Modul pendukung (sesuai pilot)** | BK, ekskul, kepegawaian, sarpras, perpustakaan, alumni, komunikasi formal/surat-menyurat | Modul terpilih sekolah pilot | Dipilih bersama sekolah pilot — bukan dibangun semua [v2 §8 #6] |
| 13 | **Live class & real-time** | Integrasi Jitsi, notifikasi lanjutan | Live class berjalan | Sesi live class pilot berhasil [v1 §5.7][v1 §8 Fase 6] |
| 14 | **Penguatan kurikulum** | Asesmen diagnostik (G3), P5 (G2), BK karir/SNBP-SNBT (G5) | Modul asesmen & P5 | Terintegrasi e-Rapor penuh [v3 §2.1] |
| 15 | **Kekhususan SMK (kondisional)** | PKL/Prakerin + jurnal + penilaian DUDI, UKK + rubrik, direktori DUDI; integrasi Dapodik/ANBK (ekspor file) | Modul SMK & ekspor nasional | Setelah validasi sekolah SMK riil & akses Dapodik [v3 §4.3–4.4][v3 §8 #3] |
| 16 | **Diferensiasi lanjutan** | Plagiarism dasar (G22), learning analytics (G23), kalender terpadu (G24), gamifikasi (G17), aksesibilitas penuh (G15), data-saver penuh (G16) | Fitur pembeda | Setelah traksi terbukti [v3 §2.4/§2.6][v3 §3] |
| 17 | **SaaS ops & skala** | Billing & tier harga (G18), helpdesk (G20), dashboard analitik superadmin (G21), payment gateway, mobile app | Operasional SaaS penuh | Saat sekolah > 1–3 [v1 §9][v3 §2.5] |

Catatan penamaan: "Fase 2" di v1.0 berarti LMS inti, sedangkan judul "PRD Fase 2" di prd02 berarti tahap pengembangan berikutnya — dua makna berbeda; pada dokumen ini seluruh fase memakai penomoran tabel di atas (lihat §12 item 7).

---

## 7. Kebutuhan Non-Fungsional Terkonsolidasi

Gabungan [v1 §7], [v2 §6], [v3 §6].

| Aspek | Kebutuhan / Target | Sumber |
|-------|--------------------|--------|
| **Isolasi Data** | Data satu sekolah tidak boleh diakses sekolah lain, baik lewat bug aplikasi maupun query langsung; kolom `school_id` di setiap tabel tenant + RLS PostgreSQL sebagai pengaman lapis kedua (defense in depth bersama guard RBAC) | [v1 §6.5][v1 §7] |
| **Skalabilitas** | Penambahan sekolah baru tanpa perubahan skema/deploy ulang; shared database + shared schema (bukan database-per-tenant) | [v1 §6.5][v1 §7] |
| **Keamanan** | Password/token tidak pernah di-log; PII (data siswa, dokumen PPDB) dienkripsi at-rest; audit log aksi sensitif; rate limiting per endpoint (login & submit ujian); brute-force lockout; CSRF; CSP; dependency scanning; SQL injection aman by default via Prisma | [v1 §7][v3 §4.1][v3 G11] |
| **Ketersediaan** | Uptime target **99%** untuk MVP; jam ujian online membutuhkan kewaspadaan ekstra (alert otomatis saat error rate/latensi di luar ambang) | [v1 §7][v3 §4.1] |
| **Performa** | Dashboard utama load **< 2 detik** pada koneksi 4G rata-rata Indonesia; beban puncak ujian/absensi dikelola dengan caching & rate limiting terpisah dari modul trafik merata | [v1 §7][v2 §6] |
| **Aksesibilitas** | Kontras warna & HTML semantik **minimal WCAG AA** untuk halaman publik (PPDB, portal ortu); perluasan ke seluruh platform pasca-MVP (G15) | [v1 §7][v3 G15] |
| **Kepatuhan UU PDP** | Prinsip pelindungan data pribadi untuk data siswa & PPDB; retensi & penghapusan data (G12); consent eksplisit data anak di bawah umur (G13) | [v1 §7][v3 G12–G13] |
| **Privasi Data Sensitif** | Catatan BK & data kesehatan siswa: field-level access (bukan hanya module-level); audit log akses; role terbatas (BK, kepsek, wali kelas terkait) | [v2 §4.2][v2 §6][v3 G14] |
| **Keandalan Data (RPO/RTO)** | **RPO ≤ 24 jam**, **RTO ≤ 4 jam** untuk MVP (dapat diperketat setelah skala bertambah); backup terpisah dari region database utama; point-in-time recovery | [v3 §4.1][v3 §6] |
| **Beban Puncak Ujian/Absensi** | Tahan saat ratusan siswa submit dalam window sempit (mis. 5 menit terakhir); autosave idempotent; load testing wajib sebelum ujian sungguhan; rate limiting wajar | [v2 §2.3][v2 §7] |
| **Offline-First** | PWA/service worker: cache materi untuk akses offline; queue absensi QR di client + sync otomatis saat koneksi kembali; validasi waktu di server, bukan client (toleransi jam device) | [v2 §3.3][v2 §6][v3 §4.6] |
| **Data-Saver** | Kompresi otomatis gambar/dokumen upload guru di sisi server sebelum disimpan (sejalan G16, digabung implementasinya dengan G10) | [v3 §4.6][v3 §6] |
| **Test Coverage** | Test otomatis untuk setiap alur kritis (RBAC, penilaian, ujian online) dijalankan di CI sebelum deploy | [v3 §4.1][v3 §6] |
| **Auditability** | Setiap submit & perubahan jawaban ujian tercatat dengan timestamp (investigasi sengketa nilai); tabel `AuditLog` generik (entity, entity_id, actor, action, before/after, timestamp) | [v2 §2.3][v3 §5] |

---

## 8. Risiko & Mitigasi Terkonsolidasi

Gabungan [v1 §10], [v2 §7], [v3 §7] — risiko yang sama dari dokumen berbeda **digabung tanpa duplikasi**.

| # | Risiko | Dampak | Mitigasi (terkonsolidasi) | Sumber |
|---|--------|--------|---------------------------|--------|
| 1 | Scope membengkak / terlalu besar untuk dikerjakan solo | Proyek tidak pernah rilis | Roadmap fase ketat; peta modul = visi, bukan backlog aktual; MVP dulu (Fase 0–8), jangan mulai fase baru sebelum fase sebelumnya stabil; modul pendukung dipilih oleh sekolah pilot | [v1 §10][v2 §7] |
| 2 | Kesalahan desain multi-tenancy di awal | Migrasi besar-besaran di kemudian hari | Finalisasi skema `school_id` + RLS di Fase 0 sebelum fitur lain dibangun | [v1 §10] |
| 3 | Sekolah enggan pindah dari WhatsApp/Excel | Adopsi rendah | Fokus MVP pada fitur yang jelas menghemat waktu guru (penilaian, rekap otomatis, absensi QR) + wizard migrasi data (G9) agar onboarding tidak menyakitkan | [v1 §10][v3 G9] |
| 4 | Kompleksitas RBAC multi-role | Bug akses data lintas role/tenant (kebocoran data) | Test matrix eksplisit per kombinasi role × aksi; RLS sebagai pengaman tambahan; test otomatis RBAC di CI (G6) | [v1 §10][v3 G6] |
| 5 | Ujian online gagal saat beban puncak (submit massal) | Kepercayaan sekolah pilot hilang, risiko reputasi tinggi | Load testing wajib sebelum ujian sungguhan (bukan hanya uji coba internal); autosave idempotent; rate limiting & caching khusus beban puncak | [v2 §7][v2 §2.3] |
| 6 | Data BK/kesehatan bocor lintas role | Masalah hukum (UU PDP) & etika serius | Field-level access control; audit log akses data BK; review keamanan khusus sebelum modul BK live | [v2 §7] |
| 7 | Absensi QR disalahgunakan (titip absen via screenshot) | Data kehadiran tidak akurat | Token sekali pakai + expired cepat + kombinasi geofencing untuk kasus rawan | [v2 §7] |
| 8 | Janji integrasi Dapodik/ANBK tidak bisa API langsung (akses resmi terbatas) | Ekspektasi sekolah tidak terpenuhi | Validasi ketersediaan akses resmi ke Kemdikbud dulu sebelum janji ke sekolah; mulai dari ekspor file sebagai fallback realistis | [v3 §7] |
| 9 | Menambah terlalu banyak fondasi teknis sebelum ada sekolah pilot | Time-to-market makin mundur | Prioritaskan fondasi yang menjaga kepercayaan pilot (G6, G8, G11 minimal); tunda yang lain sampai skala bertambah | [v3 §7] |
| 10 | Modul PKL/UKK butuh riset mendalam ke praktik SMK nyata (beda per jurusan) | Desain fitur meleset dari kebutuhan riil | Validasi desain langsung dengan guru SMK/koordinator PKL sebelum development, bukan asumsi generik | [v3 §7] |
| 11 | Tidak ada observability → kegagalan baru diketahui saat sekolah komplain | Reaktif, bukan proaktif | G7: structured logging, error tracking, alert otomatis (terutama jam ujian) | [v3 G7] |
| 12 | Data akademik (nilai/rapor) hilang | Data legal tidak bisa dipulihkan | G8: backup harian + point-in-time recovery, RPO ≤ 24 jam, RTO ≤ 4 jam, backup lintas region | [v3 G8] |
| 13 | Retensi & consent data anak tidak dikelola | Pelanggaran UU PDP | G12: kebijakan retensi (arsip → hapus penuh setelah periode, mis. 5 tahun); G13: consent orang tua eksplisit + timestamp | [v3 G12–G13] |

---

## 9. Metrik Keberhasilan (MVP)

### 9.1 Metrik Resmi dari v1.0 [v1 §11]

| # | Metrik | Target |
|---|--------|--------|
| 1 | Sekolah pilot aktif memakai platform | Minimal **1 sekolah pilot** menggunakan inti (LMS + absensi + ujian + e-Rapor) selama **1 semester penuh** |
| 2 | Adopsi guru | **≥ 70% guru** di sekolah pilot rutin menggunakan platform untuk tugas/nilai (bukan hanya login sekali) |
| 3 | Efisiensi wali kelas | Waktu rekap nilai wali kelas berkurang signifikan dibanding proses manual (diukur via survei kualitatif ke sekolah pilot) |

### 9.2 Metrik Pendukung yang Direkomendasikan (turunan audit — bukan dari v1.0)

| # | Metrik | Target yang Disarankan | Dasar |
|---|--------|------------------------|-------|
| 4 | Keandalan ujian online | Nol kegagalan sistem pada sesi ujian sungguhan (PTS/PAS) di beban puncak | Risiko [v2 §7] |
| 5 | Onboarding sekolah baru | Sekolah baru impor data & login ≤ 1 hari kerja | Tujuan [v1 §1.2] + G9 [v3 §4.5] |
| 6 | Ketersediaan | Uptime ≥ 99% | NFR [v1 §7] |
| 7 | Pemulihan data | Restore backup berhasil ≤ 4 jam (RTO) | NFR [v3 §6] |
| 8 | Adopsi siswa | ≥ 50% siswa aktif mengerjakan tugas/kuis per minggu (menjawab gap adopsi siswa G17) | Gap [v3 G17] |

---

## 10. Open Questions & Keputusan Pemilik Produk

Setiap item: pertanyaan → opsi → rekomendasi.

| # | Pertanyaan | Opsi | Rekomendasi |
|---|------------|------|-------------|
| 1 | **Model harga & billing** (G18) | (a) per siswa/bulan; (b) flat fee per sekolah; (c) flat bertingkat per band jumlah siswa; (d) freemium + tier | Mulai **flat bertingkat per sekolah** (mis. band 1–200 / 201–500 / 500+ siswa) + masa uji coba gratis 1 tahun untuk pilot; billing manual via invoice di MVP, payment gateway pasca-MVP. Putuskan sebelum menjual ke sekolah ke-2 [v1 §1.1][v3 G18] |
| 2 | **Target pasar: SMA saja atau SMA+SMK?** | (a) SMA dulu; (b) SMA+SMK paralel; (c) SMA dulu, SMK kondisional | Rekomendasi: **SMA dulu, SMK kondisional** — bangun fondasi yang sama (LMS/absensi/ujian berlaku untuk keduanya), tetapi modul PKL/UKK/Dapodik hanya jika ada sekolah SMK pilot; validasi ke 1–2 SMK riil sebelum development [v3 §8 #3] |
| 3 | **Validasi akses Dapodik/ANBK** (G4) | (a) ekspor file Excel/CSV saja; (b) API real-time | Mulai dari **(a) ekspor file terformat**; API hanya jika akses resmi terverifikasi. Jangan janji integrasi real-time ke sekolah sebelum ada kepastian [v3 §4.4][v3 §7] |
| 4 | **Nilai rate-limit & lockout** (G11) | Beragam kombinasi (mis. login 5 gagal → lockout 15 menit; submit ujian 60 req/menit/user) | Nilai pasti **ditetapkan saat implementasi dengan load testing**, mulai konservatif; jangan dikunci di PRD [v3 §6] |
| 5 | **Lock-browser & proctoring ujian** (v2 §2.2c–d) | (a) tanpa lock-browser; (b) log-only; (c) diskualifikasi otomatis; (d) webcam snapshot | **(b) log-only** di MVP (keputusan tetap di guru/pengawas); **(d) tidak** — pertimbangan privasi & storage [v2 §2.2c][v2 §2.2d] |
| 6 | **Kapan PPDB dibangun?** | (a) MVP; (b) sebelum musim PPDB sekolah pilot | **(b)** — PPDB musiman; jadwalkan berdasarkan kalender akademik sekolah pilot, bukan di fase awal MVP [v1 §8 Fase 5][§5.3] |
| 7 | **Skala beban ujian (konkurensi target)** | Mis. 200 / 500 / 1000 siswa serentak per sesi | Tetapkan **bersama sekolah pilot** (jumlah siswa per angkatan) sebagai dasar load testing; dokumentasikan sebagai kontrak teknis [v2 §2.3][v2 §7] |
| 8 | **Cakupan portal orang tua di MVP** | (a) nilai+absensi; (b) + tagihan; (c) + izin/sakit | **(a)** nilai+absensi read-only; tagihan menyusul saat modul keuangan; izin/sakit via ortu bisa ditambahkan jika wali kelas menghendaki [v2 §4.9][v2 §8 #5] |
| 9 | **Channel support pilot** (G20) | (a) WhatsApp + email; (b) helpdesk tiket penuh | **(a)** di MVP (murah, sesuai kebiasaan sekolah); helpdesk penuh pasca-MVP saat sekolah > 3 [v3 G20] |
| 10 | **Payroll/gaji guru** | (a) modul internal; (b) integrasi pihak ketiga; (c) di luar cakupan | **(c) di luar cakupan** untuk saat ini — kompleksitas PPh 21/BPJS tinggi; evaluasi ulang fase jauh lebih lanjut [v2 §4.4] |
| 11 | **Bahasa & mata uang UI** | Indonesia vs bilingual | **Bahasa Indonesia** sebagai bahasa utama (diasumsikan; belum dinyatakan eksplisit di dokumen sumber) — konfirmasi oleh pemilik produk |
| 12 | **Siapa memverifikasi sekolah saat onboarding** (G19) | (a) otomatis; (b) manual oleh superadmin; (c) trial tanpa verifikasi | **(b) manual ringan oleh superadmin** di MVP (verifikasi keabsahan sekolah), sambil trial period; otomatisasi pasca-MVP [v3 G19] |

---

## 11. Glossary

| Istilah | Arti |
|---------|------|
| **LMS** | Learning Management System — sistem pengelolaan pembelajaran (materi, tugas, kuis, nilai) [v1 §1] |
| **SIS** | School Information System — sistem informasi operasional sekolah (absensi, rapor, keuangan, administrasi) [v1 §1] |
| **SaaS** | Software as a Service — model berlangganan, satu instance melayani banyak pelanggan [v1 §1] |
| **Multi-tenant** | Satu instance aplikasi melayani banyak sekolah sekaligus, data terisolasi per sekolah [v1 §1] |
| **RBAC** | Role-Based Access Control — kontrol akses berbasis peran [v1 §5.1] |
| **RLS** | Row-Level Security (PostgreSQL) — pembatasan akses di level baris database [v1 §6.5] |
| **SSO** | Single Sign-On — satu kali login untuk banyak layanan (Google OAuth + email/password) [v1 §5.1] |
| **PII** | Personally Identifiable Information — data yang dapat mengidentifikasi individu (nama, NISN, dokumen) [v1 §7] |
| **UU PDP** | Undang-Undang Pelindungan Data Pribadi — regulasi perlindungan data pribadi di Indonesia, termasuk ketentuan data anak [v1 §7][v3 G12–G13] |
| **RPO** | Recovery Point Objective — batas maksimum umur data yang boleh hilang saat bencana (≤ 24 jam) [v3 §6] |
| **RTO** | Recovery Time Objective — batas maksimum waktu pemulihan sistem setelah bencana (≤ 4 jam) [v3 §6] |
| **PWA** | Progressive Web App — web app dengan service worker untuk akses offline & cache [v3 §4.6] |
| **WCAG** | Web Content Accessibility Guidelines — standar aksesibilitas web (level AA = target) [v1 §7] |
| **PTS** | Penilaian Tengah Semester — ujian sumatif di tengah semester [v2 §2.1] |
| **PAS** | Penilaian Akhir Semester — ujian sumatif akhir semester [v2 §2.1] |
| **PAT** | Penilaian Akhir Tahun — ujian sumatif akhir tahun ajaran [v2 §2.1] |
| **UKK** | Uji Kompetensi Keahlian — ujian praktik kompetensi kejuruan SMK dengan rubrik & penguji eksternal [v3 §4.3] |
| **PKL / Prakerin** | Praktik Kerja Lapangan — magang siswa SMK di Dunia Usaha/Dunia Industri [v3 §4.3] |
| **DUDI** | Dunia Usaha dan Dunia Industri — mitra tempat PKL/UKK siswa SMK [v3 §4.3] |
| **P5** | Projek Penguatan Profil Pelajar Pancasila — projek wajib Kurikulum Merdeka dengan penilaian terpisah dari mapel [v3 G2] |
| **CP** | Capaian Pembelajaran — kompetensi yang ditargetkan per fase dalam Kurikulum Merdeka [v2 §4.1] |
| **ATP** | Alur Tujuan Pembelajaran — urutan tujuan pembelajaran dalam Kurikulum Merdeka [v2 §4.1] |
| **Dapodik** | Data Pokok Pendidikan — sistem data pokok Kemdikbud yang wajib diisi sekolah [v3 G4] |
| **ANBK** | Asesmen Nasional Berbasis Komputer — asesmen nasional peserta didik [v3 G4] |
| **SNBP** | Seleksi Nasional Berdasarkan Prestasi — jalur masuk PTN berdasarkan nilai rapor/prestasi [v3 G5] |
| **SNBT** | Seleksi Nasional Berdasarkan Tes — jalur masuk PTN berbasis tes [v3 G5] |
| **PPDB** | Penerimaan Peserta Didik Baru — pendaftaran siswa baru [v1 §5.6] |
| **SPP** | Sumbangan Pembinaan Pendidikan — iuran rutin siswa [v1 §5.5] |
| **KBM** | Kegiatan Belajar Mengajar [v3 G3] |
| **Rombel** | Rombongan belajar — kelompok kelas dalam pelaporan Dapodik [v3 §4.4] |
| **NISN** | Nomor Induk Siswa Nasional — identitas siswa nasional (dipakai deteksi duplikasi impor) [v3 §4.5] |
| **Jitsi** | Platform video conference open-source untuk live class [v1 §5.7] |
| **Socket.IO** | Library real-time untuk notifikasi (task baru, nilai keluar, tagihan jatuh tempo) [v1 §5.7] |
| **E2E / CI** | End-to-End (uji alur utuh) / Continuous Integration (uji otomatis sebelum deploy) [v3 §4.1] |
| **OWASP** | Open Worldwide Application Security Project — standar keamanan aplikasi web (Top 10) [v3 G11] |
| **CSRF / CSP** | Cross-Site Request Forgery / Content Security Policy — lapisan keamanan web [v3 §4.1] |

---

## 12. Catatan Inkonsistensi Internal Dokumen Sumber

Ditemukan saat verifikasi baris per baris ketiga dokumen. Prioritas: Tinggi = berdampak keputusan; Sedang = rujukan/definisi; Rendah = penataan.

| # | Prioritas | Inkonsistensi | Lokasi | Penanganan di Dokumen Ini |
|---|-----------|---------------|--------|---------------------------|
| 1 | **Tinggi** | Definisi MVP berbeda: v1.0 menetapkan MVP = Fase 0–2 (auth + LMS inti) **tanpa** testing/observability/backup; prd03 §8 menetapkan G6–G8, G11–G13 sebagai non-negotiable **sebelum pilot** — dua definisi tidak kompatibel | [v1 §8] vs [v3 §8] | Diselesaikan di §5: MVP final = inti produk + fondasi teknis + migrasi data + offline-first |
| 2 | **Sedang** | prd02 §2.2e merujuk "modul rapor (§4.3)" padahal §4.3 prd02 adalah **PPDB**; e-Rapor berada di **§4.1** (Akademik & Kurikulum) | [v2 §2.2e] vs [v2 §4.1][v2 §4.3] | Dokumen ini memakai lokasi yang benar: e-Rapor = bidang Akademik & Kurikulum (§4 item 6) |
| 3 | **Sedang** | Nama file vs nama internal dokumen: prd01.md = "PRD-openlms-SaaS.md", prd02.md = "PRD-openlms-Fase2.md" — referensi silang memakai nama lama yang tidak cocok dengan penamaan file aktual | [v2 header] | Dokumen ini memakai nama file aktual (prd01/prd02/prd03) sebagai penanda sumber |
| 4 | **Sedang** | Target pasar tidak konsisten: judul v1.0 "untuk SMA/SMK" (SMK sejak awal), tetapi prd03 §8 #3 menjadikan SMK **kondisional** ("kalau target juga mencakup SMK") | [v1 judul] vs [v3 §8 #3] | Dijadikan open question §10 Q2; rekomendasi: SMA dulu, SMK kondisional |
| 5 | **Sedang** | Role orang tua: v1 §9 menyebut "bisa jadi role tambahan di fase lanjutan"; v2 §4.9 menaikkan menjadi "cakupan resmi Fase 2+" tanpa memperbarui tabel role | [v1 §9] vs [v2 §4.9] | Diakomodasi di §3.2 role #10 (Ortu Aktif) dengan penanda evolusi |
| 6 | **Rendah** | Peta modul menyeluruh v2 §4 mengklaim cakupan lengkap operasional sekolah tetapi **tidak mencantumkan Live Class (Jitsi)** yang merupakan modul #7 v1.0 | [v2 §4] vs [v1 §4.1] | Live class dipertahankan di §4 item 10 dengan status pasca-MVP |
| 7 | **Rendah** | Makna ganda "Fase 2": di v1.0 = LMS inti (urutan roadmap); di prd02 = judul tahap pengembangan (ujian & absensi online) — isi kedua "Fase 2" berbeda | [v1 §8] vs [v2 judul] | Dokumen ini memakai penomoran fase tunggal §6 (Fase 0–17) untuk menghilangkan ambiguitas |
| 8 | **Rendah** | Urutan build ujian online: v2 §8 #2 menyarankan mulai "tanpa lock-browser, tambahkan setelah stabil"; §2.2c mencantumkan lock-browser sebagai fitur rinci tanpa urutan — perlu penegasan | [v2 §2.2c] vs [v2 §8 #2] | §5.2/§6 Fase 6 menetapkan: lock-browser log-only menyusul setelah ujian stabil |
| 9 | **Rendah** | Tujuan MVP v1 §1.2 ("LMS inti dalam hitungan hari") tidak menyebut prasyarat impor data; prd03 G9 menyatakan tanpa impor onboarding jadi "entry manual masif" — perlu sinkronisasi | [v1 §1.2] vs [v3 G9] | §5.2 Grup A menempatkan wizard impor (G9) sebagai bagian wajib Fase 1 |
| 10 | **Rendah** | Posisi absensi/rapor berbeda antar dokumen: v1.0 menempatkan absensi & rapor di Fase 4 (administratif, pasca-MVP); v2 §8 menempatkan absensi online #1 dan e-Rapor #3 (lebih awal) | [v1 §8] vs [v2 §8] | §6 mengikuti urutan v2 (absensi Fase 5, e-Rapor Fase 7) karena berdampak adopsi harian |
| 11 | **Rendah** | v2 §8 #5 portal ortu "reuse data yang sudah ada" — data tagihan belum ada karena keuangan pasca-MVP; tanpa kejelasan, ortu hanya melihat nilai & absensi | [v2 §8 #5] vs [v1 §8 Fase 4] | §5.2 Grup C membatasi portal ortu MVP = nilai + absensi; tagihan menyusul |
| 12 | **Info** | Metrik keberhasilan hanya ada di v1 §11 (3 metrik); v2 dan v3 tidak menambah metrik resmi, padahal menambah risiko baru (beban puncak, adopsi siswa) | [v1 §11] vs [v2/v3] | §9.2 menambah metrik pendukung (ditandai jelas sebagai rekomendasi, bukan dari sumber) |

---

## Lampiran A — Peta Gap G1–G24 (referensi cepat, dari prd03 §2–§3)

| Gap | Ringkasan | Prioritas prd03 | Status di master ini |
|-----|-----------|-----------------|----------------------|
| G1 | Modul SMK: PKL/UKK/DUDI | Tinggi (kondisional) | Pasca-MVP, validasi SMK riil dulu (§5.3) |
| G2 | Projek P5 | Sedang | Pasca-MVP / backlog |
| G3 | Asesmen diagnostik | Sedang | Pasca-MVP / backlog |
| G4 | Integrasi Dapodik/ANBK | Tinggi (kondisional) | Pasca-MVP, mulai ekspor file (§5.3) |
| G5 | Penjurusan & bimbingan karir (SNBP/SNBT) | Sedang | Pasca-MVP / backlog |
| G6 | Strategi testing | **Kritis** | **MVP wajib** (§5.2 Grup A) |
| G7 | Observability | **Kritis** | **MVP wajib** (§5.2 Grup A) |
| G8 | Backup & DR (RPO/RTO) | **Kritis** | **MVP wajib** (§5.2 Grup A) |
| G9 | Migrasi data onboarding | Tinggi | **MVP wajib** (§5.2 Grup A) |
| G10 | Offline-first/koneksi lemah | Tinggi | **MVP wajib** (minimal: cache materi dasar + queue absensi QR; PWA penuh ditunda, §5.2 Grup C) |
| G11 | Rate limiting & hardening (OWASP) | **Kritis** | **MVP wajib** (§5.2 Grup A) |
| G12 | Retensi & penghapusan data | **Kritis** | **MVP wajib** (§5.2 Grup A) |
| G13 | Consent data anak | **Kritis** | **MVP wajib** (§5.2 Grup A) |
| G14 | Audit trail menyeluruh | Rendah | Desain tabel AuditLog di Fase 0 (murah); cakupan penuh pasca-MVP |
| G15 | Aksesibilitas menyeluruh (WCAG AA) | Rendah | Pasca-MVP; MVP cukup halaman publik |
| G16 | Mode hemat kuota/data-saver | Rendah | Kompresi server-side ikut MVP (dengan G10); mode penuh pasca-MVP |
| G17 | Gamifikasi/engagement | Rendah | Pasca-MVP / backlog |
| G18 | Model harga & billing | Sedang | Open question §10 Q1 |
| G19 | Onboarding self-service terstruktur | Sedang | Verifikasi manual superadmin di MVP (§10 Q12) |
| G20 | Support/helpdesk | Sedang | WhatsApp/email di MVP; helpdesk pasca-MVP |
| G21 | Dashboard analitik superadmin | Rendah | Pasca-MVP / backlog |
| G22 | Deteksi kemiripan jawaban (plagiarism) | Rendah | Pasca-MVP / backlog |
| G23 | Learning analytics guru | Rendah | Pasca-MVP / backlog |
| G24 | Kalender terpadu | Rendah | Pasca-MVP / backlog |

---

_Dokumen master ini menggantikan kebutuhan untuk membaca tiga PRD secara terpisah untuk keperluan eksekusi. Dokumen teknis (ERD Prisma detail, API contract, wireframe) tetap menjadi dokumen terpisah dan disusun pada tahap desain teknis berikutnya — dokumen ini cukup merujuk entitas/skema inti di §4 dan Lampiran._
