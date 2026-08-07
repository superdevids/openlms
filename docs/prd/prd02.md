# PRD Fase 2: openlms — Ujian Online, Absensi Online & Digitalisasi Menyeluruh Sekolah

**Versi:** 2.0
**Tanggal:** 6 Agustus 2026
**Status:** Draft — perluasan dari PRD v1.0
**Dokumen Induk:** PRD-openlms-SaaS.md (v1.0)

---

## 1. Konteks & Perubahan dari PRD v1.0

PRD v1.0 mencakup fondasi platform (auth, LMS inti, kuis sederhana, absensi manual, keuangan dasar, PPDB). Di Fase 2 ini, cakupan diperluas menjadi **digitalisasi menyeluruh operasional SMA/SMK**, dengan dua fitur prioritas baru yang diminta eksplisit:

1. **Ujian Online** — berbeda dari "kuis" di v1.0 (yang sifatnya latihan harian), ujian online adalah asesmen formal berskala besar (PTS, PAS, PAT, ujian sekolah) dengan kebutuhan keamanan & keandalan jauh lebih tinggi.
2. **Absensi Online** — absensi real-time berbasis device siswa/guru, bukan input manual guru di kelas saja.

Selain itu, ruang lingkup produk diperluas menjadi **peta modul menyeluruh** yang mencerminkan operasional sekolah SMA/SMK secara nyata (akademik, kesiswaan, kepegawaian, sarana-prasarana, perpustakaan, alumni, komunikasi).

> **Catatan penting sebagai rekomendasi teknis:** dokumen ini memetakan _seluruh_ kebutuhan agar tidak ada aspek sekolah yang terlewat dari perencanaan. Namun secara realistis, tidak semua modul dibangun bersamaan — §8 memberi urutan prioritas implementasi yang konkret. Silakan gunakan dokumen ini sebagai peta lengkap, dan roadmap eksekusi di §8 sebagai jalan yang benar-benar dijalankan tim.

---

## 2. Modul Ujian Online (Detail)

### 2.1 Perbedaan Kuis vs Ujian Online

| Aspek         | Kuis (v1.0)              | Ujian Online (Fase 2)                            |
| ------------- | ------------------------ | ------------------------------------------------ |
| Konteks       | Latihan harian per mapel | PTS/PAS/PAT/Ujian Sekolah, serentak lintas kelas |
| Skala peserta | 1 kelas                  | Seluruh angkatan/sekolah bersamaan               |
| Keamanan      | Longgar                  | Ketat (anti-kecurangan, token unik)              |
| Bobot nilai   | Formatif                 | Sumatif — masuk rapor resmi                      |

### 2.2 Fitur Rinci

**a. Bank Soal & Paket Ujian**

- Bank soal terpusat per mapel, dengan tag: bab, tingkat kesukaran, jenis soal (PG, esai, isian singkat, menjodohkan).
- Guru/kurikulum menyusun **paket ujian** dari bank soal, dengan opsi **beberapa variasi paket** (paket A/B/C) untuk mengurangi kecurangan antar-siswa berdekatan.
- Import soal massal via template Excel (selaras dengan skill xlsx yang tersedia di environment ini).

**b. Jadwal & Sesi Ujian**

- Admin kurikulum menjadwalkan ujian: mapel, kelas/angkatan, tanggal, jam mulai, durasi, ruang (fisik/virtual).
- Sistem otomatis membuka/menutup akses ujian sesuai jadwal (tidak bisa diakses sebelum/sesudah sesi).
- Mode **sesi ganda** untuk sekolah dengan keterbatasan device (misal: shift 1 & shift 2 per kelas).

**c. Keamanan & Anti-Kecurangan**

- Token/kode ujian unik per sesi yang diinput siswa sebelum mulai (diberikan pengawas di ruangan).
- **Randomisasi soal & urutan opsi jawaban** per siswa dari kumpulan bank soal/paket.
- **Lock browser sederhana**: deteksi perpindahan tab/window (event `visibilitychange`) → dicatat sebagai log kecurangan, bukan langsung diskualifikasi otomatis (keputusan tetap di guru/pengawas).
- Auto-submit saat waktu habis; jawaban tersimpan otomatis tiap interval (autosave) untuk mencegah kehilangan data akibat koneksi terputus.
- Satu akun = satu sesi aktif (tidak bisa login ganda di device berbeda saat ujian berlangsung).

**d. Pengawasan (Proctoring) — Bertahap**

- **Tahap awal (Fase 2):** pengawasan manual oleh guru piket + log aktivitas (tab switch, waktu submit, IP address).
- **Tahap lanjutan (opsional, di luar Fase 2):** proctoring via webcam snapshot berkala — butuh pertimbangan privasi & kebutuhan storage besar, sebaiknya dievaluasi terpisah dan bukan prioritas awal.

**e. Penilaian & Hasil**

- Auto-grade untuk PG/isian singkat, manual-grade untuk esai (dengan tampilan berdampingan: soal, jawaban siswa, kunci referensi).
- Hasil ujian terhubung langsung ke modul rapor (§4.3) sebagai nilai sumatif resmi.
- Analisis butir soal sederhana (tingkat kesulitan aktual berdasarkan persentase jawaban benar) untuk membantu guru evaluasi soal.

### 2.3 Kebutuhan Non-Fungsional Khusus Ujian Online

- **Beban serentak tinggi**: sistem harus tahan saat ratusan siswa submit dalam window waktu sempit (misal 5 menit terakhir sebelum waktu habis) — perlu load testing khusus, rate limiting yang wajar, dan strategi autosave yang idempotent.
- **Ketahanan koneksi**: jawaban tersimpan di local state + sync berkala ke server, sehingga koneksi terputus sesaat tidak menghilangkan jawaban.
- **Auditability**: setiap submit & perubahan jawaban tercatat dengan timestamp untuk keperluan investigasi jika ada sengketa nilai.

---

## 3. Modul Absensi Online (Detail)

### 3.1 Metode Absensi

| Metode                              | Cocok Untuk                                   | Kebutuhan Teknis                                                                                 |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **QR Code per sesi**                | Absensi masuk kelas per mata pelajaran        | Guru generate QR code unik & berbatas waktu (expired 5-10 menit) tiap sesi, siswa scan via HP    |
| **Self check-in dengan geofencing** | Absensi masuk gerbang sekolah pagi hari       | Validasi lokasi GPS siswa berada dalam radius sekolah saat check-in                              |
| **Input manual guru**               | Fallback/cadangan (v1.0, tetap dipertahankan) | Guru tandai manual jika QR/geofencing tidak memungkinkan (device rusak, dsb)                     |
| **Kartu RFID/barcode**              | Sekolah dengan infrastruktur kartu pelajar    | Opsional, butuh hardware reader — di luar Fase 2, dicatat sebagai kemungkinan integrasi lanjutan |

### 3.2 Fitur Rinci

- **Absensi per sesi mapel** (bukan hanya sekali sehari): guru generate QR di awal jam pelajaran, siswa scan dalam window waktu tertentu.
- **Absensi harian (gerbang)**: opsional, untuk sekolah yang ingin memantau kehadiran fisik siswa di lingkungan sekolah dari pagi.
- **Notifikasi otomatis ke wali kelas** jika siswa tidak hadir tanpa keterangan (alpa) — terhubung ke modul notifikasi (Socket.IO, sudah ada di v1.0).
- **Pengajuan izin/sakit online** oleh siswa/orang tua dengan upload surat (dokter/orang tua), diverifikasi wali kelas.
- **Rekap otomatis**: persentase kehadiran per siswa per mapel per semester, otomatis masuk sebagai data pendukung rapor.
- **Dashboard kedisiplinan** untuk wali kelas/BK: siswa dengan pola alpa berulang di-highlight otomatis (ambang batas dikonfigurasi sekolah, misal >3x alpa dalam sebulan).

### 3.3 Kebutuhan Non-Fungsional Khusus Absensi Online

- Toleransi jam device: perbedaan waktu antar-device (HP siswa vs server) tidak boleh menyebabkan absensi gagal — validasi waktu tetap di server, bukan client.
- Anti-titip absen: QR code sekali pakai (single-use token) + opsional kombinasi dengan radius lokasi agar siswa tidak bisa absenkan teman dari luar kelas.

---

## 4. Peta Modul Menyeluruh (Digitalisasi Penuh Sekolah)

Berikut peta lengkap fungsi operasional SMA/SMK yang tercakup dalam visi produk, dikelompokkan per bidang:

### 4.1 Akademik & Kurikulum

- Manajemen kurikulum (selaras Kurikulum Merdeka: capaian pembelajaran, ATP)
- Jadwal pelajaran otomatis (penjadwalan dengan validasi bentrok guru/ruang)
- LMS inti — materi, tugas (v1.0)
- Kuis harian (v1.0) & **Ujian online resmi** (§2)
- **e-Rapor** — kompilasi nilai sumatif, sikap, kehadiran, catatan wali kelas, sesuai format rapor Kurikulum Merdeka

### 4.2 Kesiswaan

- **Absensi online** (§3)
- **Bimbingan Konseling (BK)**: catatan konseling siswa (akses terbatas: BK, kepsek, wali kelas terkait — data sensitif)
- Tata tertib & poin pelanggaran siswa (pencatatan pelanggaran, akumulasi poin, notifikasi ke orang tua)
- Ekstrakurikuler: pendaftaran, presensi kegiatan, prestasi/piagam siswa
- OSIS/organisasi siswa: struktur kepengurusan, program kerja (opsional, prioritas rendah)

### 4.3 PPDB (v1.0, tidak berubah signifikan)

- Pendaftaran, verifikasi dokumen, seleksi, pengumuman

### 4.4 Kepegawaian (Baru)

- Data induk guru & staf (riwayat pendidikan, sertifikasi, mengajar mapel apa saja)
- Absensi guru/staf (metode sama seperti §3, konteks berbeda)
- **Bukan prioritas Fase 2**: penggajian/payroll — kompleksitas pajak (PPh 21) & BPJS tinggi, sebaiknya modul terpisah atau integrasi pihak ketiga di fase jauh lebih lanjut.

### 4.5 Sarana & Prasarana

- Inventaris aset sekolah (ruang kelas, lab, alat)
- Peminjaman ruang/alat (booking sistem sederhana: ruang lab, aula, proyektor)

### 4.6 Perpustakaan

- Katalog buku
- Peminjaman & pengembalian buku, dengan reminder jatuh tempo

### 4.7 Keuangan (Perluasan dari v1.0)

- SPP & tagihan (v1.0)
- Laporan keuangan sekolah lebih luas (RAB/anggaran per unit kegiatan) — **prioritas rendah**, biasanya butuh alur approval berlapis yang kompleks

### 4.8 Alumni

- Direktori alumni, tracking studi lanjut/karier (untuk keperluan akreditasi & networking) — **prioritas rendah**

### 4.9 Komunikasi

- Pengumuman sekolah (broadcast ke role tertentu)
- Surat-menyurat digital (surat keterangan, surat izin — dengan approval flow & tanda tangan digital sederhana)
- Portal orang tua (lihat nilai, absensi, tagihan anak) — disebut di PRD v1.0 §9, kini masuk cakupan resmi Fase 2+

---

## 5. Perubahan Skema Data (Tambahan dari PRD v1.0)

Entitas baru yang perlu ditambahkan ke Prisma schema:

- `Exam`, `ExamSession`, `ExamPackage`, `ExamAnswerLog` (ujian online)
- `AttendanceSession`, `AttendanceRecord`, `AttendanceQrToken` (absensi online)
- `CounselingNote` (BK — perlu enkripsi/akses super terbatas)
- `DisciplinePoint`, `DisciplineRecord` (tata tertib)
- `Extracurricular`, `ExtracurricularEnrollment`, `Achievement`
- `Staff`, `StaffAttendance` (kepegawaian)
- `Asset`, `AssetBooking` (sarpras)
- `LibraryBook`, `LibraryLoan` (perpustakaan)
- `Announcement`, `OfficialLetter` (komunikasi)
- `ParentGuardian`, `ParentStudentLink` (portal orang tua)

Semua entitas baru tetap mengikuti aturan multi-tenancy yang sama dari PRD v1.0: kolom `school_id` wajib + RLS PostgreSQL.

---

## 6. Kebutuhan Non-Fungsional Tambahan

| Aspek                            | Kebutuhan                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Privasi data sensitif**        | Catatan BK & data kesehatan siswa memerlukan lapisan akses lebih ketat dibanding data akademik biasa — role-based field-level access, bukan hanya module-level                              |
| **Beban puncak**                 | Ujian online & absensi QR menghasilkan lonjakan trafik singkat (semua siswa aktif dalam window sempit) — perlu strategi caching/rate limiting berbeda dari modul lain yang trafiknya merata |
| **Offline-first (pertimbangan)** | Absensi QR/geofencing di area sekolah dengan sinyal lemah perlu strategi retry/queue di sisi client                                                                                         |

---

## 7. Risiko Tambahan Fase 2

| Risiko                                                       | Dampak                                                         | Mitigasi                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Scope membengkak jadi "bangun semua fitur sekolah sekaligus" | Proyek tidak pernah rilis                                      | Peta modul di §4 adalah **visi lengkap**, bukan backlog Fase 2 aktual — eksekusi tetap ikuti urutan prioritas §8 |
| Ujian online gagal saat beban puncak (submit massal)         | Kepercayaan sekolah pilot hilang total, risiko reputasi tinggi | Load testing wajib sebelum ujian online dipakai untuk ujian sungguhan (bukan hanya uji coba internal)            |
| Data BK/kesehatan bocor lintas role                          | Masalah hukum (UU PDP) & etika serius                          | Field-level access control, audit log akses data BK, review keamanan khusus sebelum modul ini live               |
| Absensi QR disalahgunakan (titip absen via screenshot)       | Data kehadiran tidak akurat                                    | Token sekali pakai + expired cepat + kombinasi geofencing untuk kasus rawan                                      |

---

## 8. Roadmap Eksekusi Fase 2 (Urutan Prioritas Nyata)

Ini adalah urutan yang **benar-benar disarankan untuk dikerjakan**, bukan seluruh peta di §4 sekaligus:

1. **Absensi online (QR per sesi)** — dampak harian langsung terasa, kompleksitas sedang, melengkapi absensi manual v1.0 tanpa mengganti arsitektur besar.
2. **Ujian online (bank soal + sesi terjadwal + auto-grade PG)** — bangun di atas fondasi kuis v1.0, tambahkan lapisan keamanan & penjadwalan bertahap (mulai tanpa lock-browser dulu, tambahkan setelah stabil).
3. **e-Rapor** — nilai konsolidasi (tugas + kuis + ujian + absensi) sudah tersedia dari modul sebelumnya, tinggal disusun jadi format rapor.
4. **Tata tertib & poin pelanggaran** — relatif sederhana secara teknis, dampak besar untuk wali kelas.
5. **Portal orang tua (read-only)** — nilai jual kuat untuk sekolah pilot, teknis ringan (reuse data yang sudah ada).
6. **BK, ekstrakurikuler, kepegawaian, sarpras, perpustakaan, alumni, komunikasi formal** — modul-modul ini independen satu sama lain, bisa dikerjakan sesuai kebutuhan sekolah pilot spesifik, **bukan wajib semua sebelum peluncuran**.

> Rekomendasi: setelah item 1–3 selesai dan stabil di sekolah pilot, ajak sekolah tersebut menentukan modul mana dari item 6 yang paling mereka butuhkan — ini menghindari membangun fitur yang ternyata tidak dipakai.

---

_Dokumen ini melengkapi PRD-openlms-SaaS.md (v1.0). Detail ERD Prisma untuk entitas baru di §5 dan wireframe ujian online/absensi bisa disusun sebagai dokumen teknis terpisah pada tahap berikutnya._
