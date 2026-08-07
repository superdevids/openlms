# PRD Fase 3: Audit Menyeluruh, Analisis Gap & Penguatan Platform openlms

**Versi:** 3.0
**Tanggal:** 6 Agustus 2026
**Status:** Draft — hasil audit atas PRD v1.0 & PRD Fase 2 (v2.0)
**Dokumen Rujukan:** PRD-openlms-SaaS.md (v1.0), PRD-openlms-Fase2.md (v2.0)

---

## 1. Metodologi Audit

Audit ini meninjau PRD v1.0 dan Fase 2 dari 6 sudut pandang untuk menemukan gap yang belum tercakup:

1. **Kurikulum & regulasi Indonesia** — apakah platform selaras dengan Kurikulum Merdeka, kebutuhan SMK spesifik, dan sistem nasional (Dapodik, ANBK)?
2. **Ketahanan teknis** — apakah arsitektur siap produksi (testing, observability, disaster recovery)?
3. **Keamanan & kepatuhan data** — apakah ada gap di luar yang sudah disebut (BK, RLS)?
4. **Pengalaman pengguna & aksesibilitas** — apakah semua jenis pengguna & kondisi jaringan tercakup?
5. **Operasional bisnis SaaS** — apakah aspek onboarding, billing, dan support sudah dipikirkan?
6. **Diferensiasi & daya saing produk** — fitur apa yang membuat platform ini benar-benar unggul, bukan sekadar "Google Classroom + Excel dalam satu aplikasi"?

---

## 2. Temuan Audit: Gap per Kategori

### 2.1 Gap Kurikulum & Kekhususan SMK

| #   | Gap                                                                                                                                          | Kenapa Penting                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | **Tidak ada modul khusus SMK**: PKL/Prakerin, Uji Kompetensi Keahlian (UKK), mitra Dunia Usaha/Dunia Industri (DUDI), sertifikasi kompetensi | PRD v1–v2 memperlakukan SMA & SMK identik, padahal SMK punya alur kerja unik (penempatan siswa magang, penilaian dari pembimbing industri, sertifikat kompetensi) yang tidak ada di SMA sama sekali                                                                          |
| G2  | **Tidak ada Projek Penguatan Profil Pelajar Pancasila (P5)**                                                                                 | P5 adalah komponen wajib Kurikulum Merdeka dengan sistem penilaian & rapor terpisah dari nilai mapel — belum tersentuh di rapor v2                                                                                                                                           |
| G3  | **Tidak ada Asesmen Diagnostik (awal semester/tahun)**                                                                                       | Kurikulum Merdeka mensyaratkan asesmen diagnostik untuk pemetaan kebutuhan belajar siswa sebelum KBM dimulai — beda dari ujian sumatif yang sudah dirancang                                                                                                                  |
| G4  | **Tidak ada integrasi/ekspor ke Dapodik & ANBK**                                                                                             | Sekolah wajib lapor data ke Dapodik (Kemdikbud) dan siswa ikut ANBK (Asesmen Nasional) — tanpa jalur ekspor data yang selaras format, sekolah tetap harus input dobel manual, mengurangi nilai jual platform |
| G5  | **Tidak ada modul penjurusan/peminatan & bimbingan karir (SNBP/SNBT)**                                                                       | Kelas XI-XII butuh dukungan pemilihan jurusan kuliah/karir, termasuk tracking nilai rapor untuk syarat SNBP — relevan sekali untuk BK tapi belum disebut                                                                                                                     |

### 2.2 Gap Ketahanan & Kematangan Teknis

| #   | Gap                                                                                  | Kenapa Penting                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G6  | **Tidak ada strategi testing** (unit, integration, E2E)                              | Dengan RBAC + multi-tenant + isolasi data sekritis ini, bug lolos ke produksi bisa berarti kebocoran data lintas sekolah — testing bukan opsional                                              |
| G7  | **Tidak ada observability** (logging terstruktur, error tracking, metrics/alerting)  | Tanpa ini, tim tidak akan tahu ujian online gagal di tengah jalan sampai sekolah komplain — reaktif, bukan proaktif                                                                            |
| G8  | **Tidak ada strategi backup & disaster recovery**                                    | Data akademik (nilai, rapor) adalah data legal yang tidak boleh hilang; belum ada RPO/RTO yang didefinisikan                                                                                   |
| G9  | **Tidak ada strategi migrasi data dari sistem lama**                                 | Sekolah pilot pasti sudah punya data siswa/nilai di Excel/sistem lama — tanpa alat impor, onboarding sekolah baru jadi entry manual masif dan jadi hambatan adopsi terbesar                    |
| G10 | **Tidak ada strategi offline/koneksi lemah**                                         | Banyak sekolah di Indonesia (terutama luar Jawa) punya koneksi internet tidak stabil — absensi/ujian online yang disebut di Fase 2 berisiko gagal total di kondisi ini tanpa PWA/offline queue |
| G11 | **Tidak ada rate limiting & hardening keamanan API secara eksplisit** (OWASP Top 10) | Disebut sekilas di NFR v1.0, tapi belum ada checklist konkret (SQL injection via Prisma sudah aman by default, tapi XSS, CSRF, brute-force login belum eksplisit dibahas)                      |

### 2.3 Gap Keamanan & Kepatuhan Data

| #   | Gap                                                                                                                                    | Kenapa Penting                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| G12 | **Belum ada kebijakan retensi & penghapusan data** (data retention policy)                                                             | UU PDP mensyaratkan data tidak disimpan lebih lama dari perlu — misal data siswa yang sudah lulus/pindah sekolah                          |
| G13 | **Belum ada mekanisme consent eksplisit untuk data anak di bawah umur**                                                                | Mayoritas siswa SMA/SMK di bawah 18 tahun — UU PDP punya ketentuan khusus data anak, perlu persetujuan orang tua/wali untuk data tertentu |
| G14 | **Tidak ada audit trail menyeluruh untuk perubahan data sensitif** di luar nilai (v1.0 hanya sebut audit log untuk nilai & pembayaran) | Perubahan data siswa, absensi, catatan BK juga perlu jejak audit untuk akuntabilitas                                                      |

### 2.4 Gap UX & Aksesibilitas

| #   | Gap                                                                                                                    | Kenapa Penting                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G15 | **Tidak ada dukungan aksesibilitas untuk siswa disabilitas** (low vision, tuli, disleksia) di luar halaman publik PPDB | Sekolah inklusi ada di SMA/SMK reguler; platform LMS besar (Google Classroom, Moodle) sudah punya standar aksesibilitas WCAG AA menyeluruh, bukan cuma halaman PPDB    |
| G16 | **Tidak ada mode hemat kuota/data-saver**                                                                              | Siswa banyak yang akses via kuota data seluler terbatas — materi video/gambar besar tanpa kompresi/lazy-load bisa jadi barrier ekonomi                                 |
| G17 | **Tidak ada gamifikasi/engagement mechanism**                                                                          | Adopsi siswa (bukan cuma guru) sering jadi titik lemah LMS sekolah — tanpa insentif engagement (badge, progress tracking, leaderboard opsional), siswa cenderung pasif |

### 2.5 Gap Operasional Bisnis SaaS

| #   | Gap                                                                                                                  | Kenapa Penting                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| G18 | **Model harga & billing belum konkret** (masih "perlu divalidasi" di v1.0)                                           | Tanpa struktur harga jelas (per siswa/bulan vs flat fee, termasuk tier fitur mana), sulit menjual ke sekolah kedua dan seterusnya            |
| G19 | **Tidak ada flow onboarding self-service yang terstruktur**                                                          | v1.0 sebut "admin sekolah onboarding mandiri" tapi belum ada detail: siapa yang verifikasi sekolah itu benar/sah, trial period, setup wizard |
| G20 | **Tidak ada support/helpdesk plan**                                                                                  | Guru & staf TU non-teknis akan butuh bantuan; tanpa channel support (WhatsApp/tiket), sekolah pilot bisa churn karena frustrasi kecil        |
| G21 | **Tidak ada dashboard analitik lintas-sekolah untuk superadmin** (bisnis metrics: retensi, adopsi fitur per sekolah) | Sebagai produk SaaS, pemilik produk butuh visibilitas mana sekolah aktif/berisiko churn — bukan hanya dashboard operasional sekolah individu |

### 2.6 Gap Diferensiasi Produk

| #   | Gap                                                                                                                                                                  | Kenapa Penting                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| G22 | **Tidak ada fitur deteksi kemiripan jawaban esai/tugas** (plagiarism check dasar)                                                                                    | Dengan submission digital, menyontek antar-siswa jadi lebih mudah (copy-paste) — deteksi kemiripan teks dasar adalah nilai tambah nyata |
| G23 | **Tidak ada analitik pembelajaran (learning analytics) untuk guru** — misal materi mana yang paling banyak diakses ulang sebelum ujian, pola siswa berisiko akademik | Ini yang membedakan LMS modern dari sekadar "tempat upload tugas"                                                                       |
| G24 | **Tidak ada integrasi kalender terpadu** (jadwal ujian, deadline tugas, jadwal ekskul dalam satu kalender per siswa)                                                 | Disebut terpisah-pisah per modul di v1–v2, tapi tidak ada satu tampilan kalender yang menyatukan semuanya                               |

---

## 3. Prioritisasi Gap

Menggunakan kerangka **Dampak vs Effort** untuk menentukan mana yang masuk Fase 3 aktual:

| Prioritas                                                             | Gap yang Ditangani                                                                                                         | Alasan                                                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Kritis — sebelum sekolah pilot pertama live dengan data sungguhan** | G6 (testing), G7 (observability), G8 (backup/DR), G11 (security hardening), G12–G13 (retensi & consent data anak)          | Ini fondasi kepercayaan & legal, bukan "fitur tambahan" — risiko tinggi kalau diabaikan   |
| **Tinggi — pembeda produk & adopsi**                                  | G1 (modul SMK: PKL/UKK), G4 (integrasi Dapodik/ANBK), G9 (migrasi data), G10 (offline-first)                               | Langsung pengaruh ke apakah sekolah mau pakai & bertahan pakai                            |
| **Sedang — memperkuat kurikulum & operasional**                       | G2–G3 (P5, asesmen diagnostik), G5 (BK karir), G18–G20 (billing, onboarding, support)                                      | Penting tapi bisa menyusul setelah fondasi & adopsi awal terbukti                         |
| **Rendah — nice-to-have, evaluasi setelah traksi**                    | G15–G17 (aksesibilitas luas, data-saver, gamifikasi), G22–G24 (plagiarism, learning analytics, kalender terpadu), G14, G21 | Nilai tambah nyata, tapi bukan penentu sekolah pilot bertahan atau tidak di tahun pertama |

---

## 4. Spesifikasi Fitur Baru Fase 3 (Prioritas Kritis & Tinggi)

### 4.1 Fondasi Ketahanan Teknis (G6–G8, G11)

- **Testing**: unit test untuk business logic penilaian & RBAC guard (target coverage area kritis, bukan angka arbitrer), integration test untuk alur ujian online end-to-end, E2E test untuk flow onboarding sekolah baru.
- **Observability**: structured logging (request ID per transaksi), error tracking (Sentry atau setara), alert otomatis saat error rate/latency di luar ambang batas terutama selama jam ujian online.
- **Backup & DR**: backup PostgreSQL harian otomatis + point-in-time recovery, target RPO ≤ 24 jam dan RTO ≤ 4 jam untuk MVP (bisa diperketat setelah skala bertambah), backup disimpan terpisah dari region database utama.
- **Security hardening**: rate limiting per endpoint (khususnya login & submit ujian), proteksi brute-force login (lockout sementara), CSRF protection di form kritis, Content Security Policy di frontend, dependency scanning otomatis (audit npm/cargo rutin).

### 4.2 Kepatuhan Data Anak (G12–G13)

- Kebijakan retensi: data siswa yang sudah lulus/keluar diarsipkan (bukan dihapus langsung, untuk kebutuhan legal seperti verifikasi ijazah) dengan akses dibatasi, dan dihapus penuh setelah periode retensi yang disepakati sekolah (misal 5 tahun).
- Consent orang tua/wali eksplisit saat pendaftaran akun siswa di bawah umur, dicatat dengan timestamp sebagai bagian dari data PPDB.

### 4.3 Modul Kekhususan SMK (G1)

- **Prakerin/PKL**: pencatatan penempatan siswa di DUDI mitra, jurnal kegiatan harian siswa selama PKL (bisa diisi dari HP), penilaian dari pembimbing industri (akun khusus non-guru, akses terbatas hanya ke siswa bimbingannya) + guru pembimbing sekolah.
- **Uji Kompetensi Keahlian (UKK)**: modul ujian praktik dengan rubrik penilaian kompetensi (bukan hanya skor angka, tapi checklist kompetensi per standar kejuruan), termasuk pencatatan penguji eksternal dari industri.
- **Direktori mitra DUDI**: data perusahaan/institusi mitra magang, riwayat kerja sama per tahun ajaran.

### 4.4 Integrasi Sistem Nasional (G4)

- **Ekspor data terstruktur** ke format yang kompatibel dengan kebutuhan pelaporan Dapodik (data induk siswa, guru, rombel) — pendekatan awal: ekspor file (Excel/CSV terformat), bukan integrasi API langsung dulu, karena akses API Dapodik terbatas untuk pihak eksternal (perlu verifikasi ketersediaan API resmi ke Kemdikbud sebelum janji integrasi real-time).
- **Selarasi struktur data dengan kebutuhan ANBK**: memastikan struktur `Student`, `Class`, `Enrollment` sudah kompatibel jika suatu saat perlu ekspor peserta ANBK.

### 4.5 Migrasi Data Onboarding (G9)

- **Wizard impor data awal** saat sekolah baru onboarding: template Excel untuk data siswa, guru, kelas (skill xlsx cocok dipakai untuk proses ini di sisi tooling internal/development), dengan validasi & preview sebelum data masuk ke database produksi.
- Deteksi duplikasi (NISN yang sama, dsb) saat impor.

### 4.6 Offline-First untuk Absensi & Materi (G10)

- **PWA (Progressive Web App)** dengan service worker: materi yang sudah dibuka tersimpan cache untuk akses offline, absensi QR di-queue lokal dan sync otomatis saat koneksi kembali.
- Kompresi otomatis gambar/dokumen yang diupload guru untuk mengurangi beban data siswa saat mengakses (terkait juga G16, digabung implementasinya).

---

## 5. Perubahan Skema Data Tambahan (Fase 3)

- `Internship` (PKL), `InternshipJournal`, `InternshipPartner` (DUDI), `IndustryMentor`
- `CompetencyTest` (UKK), `CompetencyRubricItem`
- `DataExportLog` (jejak ekspor Dapodik/ANBK)
- `DataRetentionPolicy`, `ParentalConsent`
- `ImportBatch`, `ImportError` (log proses migrasi data)
- Tabel audit generik `AuditLog` (entity, entity_id, actor, action, before/after, timestamp) — menggantikan pendekatan audit log parsial yang disebut terpisah di v1–v2, disatukan jadi satu mekanisme reusable

---

## 6. Kebutuhan Non-Fungsional Tambahan Fase 3

| Aspek                                                         | Target                                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **RPO (Recovery Point Objective)**                            | ≤ 24 jam                                                                                                    |
| **RTO (Recovery Time Objective)**                             | ≤ 4 jam                                                                                                     |
| **Test coverage area kritis** (RBAC, penilaian, ujian online) | Ada test otomatis untuk setiap alur kritis, dijalankan di CI sebelum deploy                                 |
| **Rate limit login**                                          | Maksimal percobaan gagal sebelum lockout sementara (nilai pasti ditentukan saat implementasi, bukan di PRD) |
| **Ukuran halaman untuk mode data-saver**                      | Materi & gambar dikompresi otomatis di sisi server sebelum disimpan                                         |

---

## 7. Risiko Tambahan Fase 3

| Risiko                                                                                                       | Dampak                                       | Mitigasi                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Janji integrasi Dapodik/ANBK ternyata tidak bisa API langsung (akses resmi terbatas)                         | Ekspektasi sekolah tidak terpenuhi           | Validasi ketersediaan akses resmi ke Kemdikbud dulu sebelum janji ke sekolah pilot; mulai dari ekspor file sebagai fallback yang realistis        |
| Menambah terlalu banyak fondasi teknis (testing, observability, DR) sebelum ada satu pun sekolah pilot nyata | Waktu ke pasar (time-to-market) makin mundur | Prioritaskan fondasi teknis yang directly menjaga kepercayaan sekolah pilot pertama (G6, G8, G11 minimal), tunda yang lain sampai skala bertambah |
| Modul PKL/UKK butuh riset mendalam ke praktik SMK nyata (berbeda-beda per jurusan kejuruan)                  | Desain fitur meleset dari kebutuhan riil     | Validasi desain modul ini langsung dengan guru SMK/koordinator PKL sebelum development, bukan asumsi generik                                      |

---

## 8. Ringkasan: Apa yang Benar-Benar Perlu Dikerjakan Selanjutnya

Audit ini menemukan **24 gap**, tapi bukan berarti 24 hal itu semua jadi backlog berikutnya. Urutan realistis:

1. **Sebelum sekolah pilot pertama pegang data sungguhan**: G6, G7, G8, G11, G12, G13 (fondasi kepercayaan & legal — non-negotiable).
2. **Untuk memenangkan sekolah pilot & adopsi awal yang kuat**: G9 (migrasi data — tanpa ini onboarding sekolah baru menyakitkan), G10 (offline-first — kondisi jaringan nyata di banyak sekolah).
3. **Kalau target juga mencakup SMK (bukan cuma SMA)**: G1 dan G4 wajib divalidasi ke sekolah SMK riil sebelum dibangun — jangan asumsi dari PRD saja.
4. **Sisanya (G2–G3, G5, G14–G24)**: masuk backlog, diprioritaskan ulang berdasarkan feedback nyata dari sekolah pilot pertama, bukan dibangun mendahului validasi pasar.

---

_Dokumen ini melengkapi PRD-openlms-SaaS.md (v1.0) dan PRD-openlms-Fase2.md (v2.0). Rekomendasi berikutnya: validasi §4.3 (modul SMK) dan §4.4 (integrasi Dapodik/ANBK) langsung dengan pihak sekolah sebelum masuk tahap desain teknis, karena dua area ini paling berisiko salah asumsi jika hanya dirancang di atas kertas._
