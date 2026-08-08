# 07. Spesifikasi Desain UX/UI — openlms

**Versi:** 1.1
**Tanggal:** 6 Agustus 2026
**Status:** Draft — acuan desain untuk implementasi (openteam-coder)
**Dokumen Rujukan:** prd01.md [v1], prd02.md [v2], prd03.md [v3], prd04.md [v4.2], 01-master-prd.md
**Sifat dokumen:** spesifikasi + wireframe — BUKAN kode. Tidak ada HTML/CSS/JS di sini.

---

## 1. Ringkasan Eksekutif (BLUF)

**openlms dirancang sebagai platform "kerja selesai dalam satu klik": setiap layar menuntaskan satu pekerjaan nyata guru/siswa/staf sekolah (membuat tugas, menilai, scan absen, ikut ujian), bukan sekadar tempat menyimpan data.** Prinsip inti: _satu layar, satu tugas utama_, hierarki visual jelas, dan tidak ada fitur yang menuntut pengguna berpindah aplikasi lagi (WhatsApp/Excel) untuk pekerjaan yang sudah ditangani platform.

Tiga keputusan desain yang menjiwai seluruh dokumen:

1. **Fokus peran, bukan fitur.** Navigasi dan dashboard dibuat per role (siswa, guru, wali kelas, operator, keuangan, wakepsek, kepsek, PPDB, wali murid, superadmin). Setiap role hanya melihat menu yang relevan — guru tidak melihat menu keuangan, siswa tidak melihat menu grading.
2. **Kritis-path dioptimalkan.** Alur yang paling sering dipakai (buat tugas → siswa submit → guru nilai; scan absen; ujian online) dirancang dengan langkah seminimal mungkin dan state yang jelas (loading/error/empty/success) sejak awal.
3. **Aksesibilitas dan hemat kuota bukan pelengkap (G15–G16), tapi standar default.** WCAG AA berlaku untuk SEMUA halaman, bukan hanya PPDB; mode hemat data aktif otomatis untuk pengguna berkuota terbatas. Gamifikasi (G17) hadir sebagai opsi non-blokir, dapat dimatikan admin.

Prioritas desain mengikuti MVP Master PRD: **Fase 0–2 (auth, onboarding, kelas, materi, tugas, submission, grading) wajib tuntas dan matang dulu**, ujian online, absensi QR, e-Rapor dasar, dan portal orang tua read-only menyusul — semuanya bagian MVP; PPDB/keuangan/superadmin-analitik setelah itu (lihat §10).

---

## 2. Prinsip Desain (Design Principles)

| #   | Prinsip                                  | Penjabaran operasional                                                                                                                     |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| P1  | Satu layar, satu tugas utama             | Setiap halaman punya 1 CTA primer di posisi konsisten (pojok kanan atas konten). Semua elemen lain adalah pendukung.                       |
| P2  | Peran menentukan ruang                   | Navigasi dirender dari RBAC. Tidak ada menu tersembunyi yang "bisa diakses via URL" tanpa izin (guard + UI konsisten).                     |
| P3  | Kejelasan status di mana pun             | Setiap objek (tugas, submission, pembayaran, pendaftar) selalu menampilkan status eksplisit: badge teks + ikon + warna (bukan warna saja). |
| P4  | Mobile-first, web responsive             | Layout dimulai dari 320px; navigasi utama mobile = bottom nav ≤5 item; desktop = sidebar. Target sentuh ≥44×44px.                          |
| P5  | Kesalahan dicegah, bukan hanya dikoreksi | Konfirmasi sebelum aksi destruktif, preview sebelum submit, autosave untuk input panjang (ujian, form PPDB).                               |
| P6  | Ramah kuota & koneksi lemah              | Lazy-load, kompresi gambar server-side, mode teks-only, offline cache PWA (G16 + G10).                                                     |
| P7  | Aksesibel by default                     | WCAG AA seluruh platform; fokus keyboard terlihat; error dibacakan via aria-live; label form eksplisit (G15).                              |
| P8  | Konsisten & berulang                     | Token desain tunggal (warna, tipografi, spacing); komponen dari design system (shadcn/ui), tidak ada style ad-hoc per halaman.             |
| P9  | Gamifikasi tidak menghukum               | Badge/progress bersifat penguat positif opsional, tidak pernah memblokir akses (G17).                                                      |

---

## 3. Information Architecture / Sitemap per Role

Konvensi pohon: `→` = turunan halaman; `[x]` = halaman; `(CTA)` = tombol/link aksi; `*` = fase lanjutan (pasca MVP inti).

### 3.1 Siswa (mobile-first)

```
[Beranda]  → ringkasan: kelas aktif, tugas tenggat terdekat, ujian aktif, notifikasi
├─ [Kelas Saya] → [Detail Kelas] → Tabs: [Materi] [Tugas] [Kuis] [Nilai]
│     ├─ (Buka Materi) → [Detail Materi]  (dokumen/video/link)
│     ├─ (Kerjakan Tugas) → [Detail Tugas] → (Submit) → [Form Submit] → status [Terlambat*]
│     ├─ (Kerjakan Kuis) → [Kerjakan Kuis] (timer)
│     └─ [Nilai] → tabel rekap tugas/kuis/ujian per mapel
├─ [Ujian] → [Ujian Aktif] → [Masukkan Token] → [Kerjakan Ujian] → [Hasil Ujian]
├─ [Jadwal] → kalender mingguan (mapel + ujian + deadline)
├─ [Absensi Saya] → riwayat per mapel/bulan + [Ajukan Izin/Sakit]
├─ [Tagihan]* → status SPP (fase keuangan)
├─ [Notifikasi] (bell, badge jumlah)
└─ [Profil & Pengaturan] → akun, [Mode Hemat Data], [Gamifikasi: Badge & Progress]
```

### 3.2 Guru (Mapel)

```
[Beranda Guru] → ringkasan: kelas diajar, perlu dinilai (queue), ujian terjadwal
├─ [Kelas] → [Detail Kelas] → Tabs: [Materi] [Tugas] [Kuis] [Absensi] [Nilai] [Siswa]
│     ├─ (Tambah Materi) → [Form Materi] (file/link, opsional data-saver flag)
│     ├─ (Buat Tugas) → [Form Tugas] (judul, instruksi, deadline, lampiran)
│     ├─ (Buat Kuis) → [Form Kuis] → pilih soal dari [Bank Soal]
│     ├─ (Absen Hari Ini) → [Generate QR Absensi]
│     └─ [Nilai] → [Daftar Submission] → [Grading Esai] (side-by-side)
├─ [Bank Soal] → [Daftar Soal] → [Form Soal] (PG/Esai/isian; tag bab & tingkat kesukaran)
├─ [Paket Ujian] → [Form Paket] (acak urutan, paket A/B/C*) → [Jadwal Sesi]*
├─ [Ujian] → [Daftar Sesi Ujian] → [Pengawasan]* (log tab-switch, waktu submit)
├─ [Penilaian] → queue lintas kelas: [Belum Dinilai] [Terlambat] [Selesai]
├─ [Notifikasi]
└─ [Profil & Pengaturan]
```

### 3.3 Wali Kelas

Menu Guru + tambahan (menu khas wali kelas disorot):

```
[Beranda Wali Kelas] → rekap kelas: nilai rata-rata, kehadiran bulan ini, kedisiplinan
├─ [Rekap Nilai Kelas] → tabel siswa × mapel (lintas guru), ekspor CSV/PDF*
├─ [Rekap Absensi] → per siswa per bulan, % kehadiran
├─ [Izin/Sakit Masuk] → queue verifikasi pengajuan siswa
├─ [Kedisiplinan] → highlight siswa alpa > ambang (mis. >3x/bulan), [Kirim Notifikasi Orang Tua]
├─ [Rapor]* → susun semi-otomatis + catatan wali kelas (fase e-Rapor)
└─ (menu guru tetap ada: kelas/materi/tugas yang diajar)
```

### 3.4 Operator (Tata Usaha)

```
[Beranda TU] → ringkasan: pendaftar PPDB perlu verifikasi, undangan pending, impor terakhir
├─ [Data Induk]
│     ├─ [Siswa] (CRUD, status aktif/lulus/pindah*)
│     ├─ [Guru & Staf]
│     └─ [Kelas & Rombel] + [Jadwal Pelajaran]*
├─ [Undangan] → [Form Undang] (email/link, pilih role) → [Daftar Undangan] (status: terkirim/terpakai/kedaluwarsa)
├─ [Impor Data] → wizard: [Upload Excel] → [Validasi & Preview] → [Hasil Impor] (G9)
├─ [PPDB] → [Daftar Pendaftar] (status) → [Verifikasi Dokumen] → [Pengumuman]
├─ [Surat-Menyurat]* → [Form Surat] → approval
└─ [Pengaturan Sekolah] → identitas sekolah, tahun ajaran, ambang alpa, toggle fitur (data-saver default, gamifikasi)
```

### 3.5 Keuangan

```
[Beranda Keuangan] → ringkasan: tagihan jatuh tempo, pembayaran pending verifikasi
├─ [Tagihan] → [Form Tagihan] (per siswa/kelas/angkatan) → [Daftar Tagihan]
├─ [Pembayaran] → [Catat Pembayaran] (manual, upload bukti) → [Verifikasi]
├─ [Riwayat & Laporan] → per periode, per kelas; ekspor CSV/PDF*
└─ [Status per Siswa] → tab per siswa: tagihan & riwayat
```

### 3.6 Wakil Kepala Sekolah (Wakepsek)

```
[Beranda Waka] → ringkasan akademik & kedisiplinan lintas kelas
├─ [Akademik] → rekap nilai per kelas/mapel, hasil ujian (ringkasan), siswa berisiko*
├─ [Ujian] → [Jadwal & Sesi] (pengaturan oleh waka kurikulum), [Hasil & Analisis Butir]*
├─ [Kedisiplinan] → dashboard alpa lintas kelas (bersama wali kelas/BK)
├─ [Kurikulum]* → jadwal, paket ujian, pemetaan capaian (Kurikulum Merdeka)
└─ [Laporan] → ekspor ringkasan untuk kepsek
```

### 3.7 Kepsek

```
[Beranda Kepsek] → dashboard eksekutif (tile KPI + tren)
├─ [Akademik] → ringkasan nilai rata-rata per kelas/mapel
├─ [Kehadiran] → % kehadiran harian/bulanan, tren
├─ [Keuangan]* → laporan ringkas (pendapatan SPP, tunggakan) — read-only
├─ [Ujian] → ringkasan pelaksanaan & hasil
└─ [BK]* → akses terbatas catatan konseling (field-level, audit log) — fase lanjutan
```

### 3.8 Calon Siswa / Orang Tua (PPDB) — publik, tanpa login

```
[Halaman Publik PPDB] (landing sekolah: info, jadwal, syarat)
├─ [Daftar Sekarang] → wizard 4 langkah:
│     [1 Data Calon] → [2 Data Orang Tua] → [3 Upload Dokumen] → [4 Consent & Konfirmasi]
│     → sukses: [Nomor Pendaftaran] (disimpan/cetak)
├─ [Cek Status] → input No. Pendaftaran → [Status Seleksi] (diproses/lulus/tidak lulus)
└─ [Pengumuman] → daftar pengumuman resmi
```

### 3.9 SUPERADMIN (Admin Sistem Sekolah)

```
[Beranda Superadmin] → dashboard admin sistem: statistik adopsi fitur dalam sekolah
├─ [Pengaturan Aplikasi] → [Feature Flags] (toggle, lock, audit) + identitas sekolah/tahun ajaran
├─ [Manajemen User] → reset password oleh SUPERADMIN/OPERATOR
├─ [Audit] → audit log (login, perubahan flag, aksi sensitif)
├─ [Monitoring]* → error rate, latency, log, rate-limit events (G7/G11) — tampilan read-only ops (gelombang 2)
└─ [Backup]* → status & restore backup (G8)
```

Catatan: SUPERADMIN = admin sistem aplikasi sekolah (BUKAN penyedia SaaS) [prd04 §3.1, §5.M].

### 3.10 Wali Murid (Orang Tua Siswa Aktif — read-only, MVP)

Menu minimal read-only — orang tua melihat data anak, tidak ada aksi tulis:

```
[Beranda Orang Tua] → ringkasan anak: nilai terbaru, kehadiran bulan ini, status tagihan
├─ [Nilai Anak] → rekap nilai per mapel (tugas/kuis/ujian) — read-only
├─ [Absensi Anak] → riwayat kehadiran per bulan + % kehadiran — read-only
├─ [Tagihan Anak] → status tagihan SPP — read-only (data tampil saat modul keuangan aktif)
├─ [Notifikasi] → nilai keluar, alpa, tagihan jatuh tempo
└─ [Profil] → data orang tua & tautan akun anak
```

Role orang tua = **MVP (read-only)**: melihat nilai, absensi, dan tagihan anak tanpa aksi tulis [01-master §5.2 Grup C, §6 Fase 8].

> **Pemetaan label-UI → role prd04 §3.1:** Tata Usaha/TU → OPERATOR; Waka → WAKEPSEK; Kepala Sekolah → KEPSEK; Orang Tua (siswa aktif) → WALI_MURID. Heading di atas memakai label ramah pengguna; role teknis dan permission mengikuti prd04 §3.1/§4.

---

## 4. User Flows Kunci

Format: `Tujuan → Aktor → Langkah (dengan keputusan) → State`. Setiap flow menyertakan keputusan `[?]` dan kondisi error yang wajib ditangani.

### 4.1 Onboarding Aplikasi Sekolah (wizard setup oleh SUPERADMIN/OPERATOR) — G9, G19 N/A

**Tujuan:** aplikasi dikonfigurasi oleh SUPERADMIN/OPERATOR via **wizard setup 5 langkah** — tanpa alur daftar-sekolah publik dan tanpa verifikasi antar-sekolah (G19 N/A, prd04 §9.1 Q12).

1. SUPERADMIN/OPERATOR login pertama → **Wizard Setup 5 langkah**:
   - Langkah 1 **Identitas & Tahun Ajaran**: identitas sekolah, NPSN (format 8 digit), jenjang (SMA/SMK), alamat, `current_academic_year_id` (M-ROLLOVER-T1), toggle (data-saver default ON, gamifikasi OFF).
   - Langkah 2 **Profil & Kebijakan**: semester, tanggal mulai, ambang alpa (default 3/bulan), settings.rollover.
   - Langkah 3 **Impor Data** (G9): unduh template Excel (siswa, guru, kelas) → upload → validasi → preview tabel dengan baris error (NISN duplikat, kolom kosong) → konfirmasi impor → laporan hasil (n berhasil, m gagal + unduh daftar error).
   - Langkah 4 **Undang Admin & Staf**: kirim undangan email ke guru/TU/keuangan (link undangan + role) — bisa dilewati ("Selesai nanti").
   - Langkah 5 **Ulasan & Aktifkan**: ringkasan konfigurasi → **State: Aktif** → dashboard aplikasi terbuka.
2. Selesai wizard → **State: Aktif** → dashboard aplikasi terbuka.
   - Error handling: impor gagal total → ulangi dengan file baru; sebagian gagal → import parsial + laporan (tidak membatalkan seluruh batch).

### 4.2 Admin Undang Guru & Siswa (v1 §5.1)

1. TU membuka [Undangan] → (Undang) → pilih tipe (Guru / Siswa), isi nama + email (guru) atau nama + NISN (siswa; email opsional).
2. Sistem membuat link undangan unik ber-role; mengirim email (guru) atau link via WhatsApp/print (siswa).
3. Penerima buka link → login dengan Email/Username + Password (auth in-house; tanpa Google/SSO) [prd04 §5.O].
4. `[?]` Email/username sudah terdaftar? → tolak: 'Akun sudah terdaftar' (username/email unik aplikasi — single-school).
5. **State:** undangan = terkirim → terpakai → kedaluwarsa (7 hari). TU melihat status di tabel; bisa kirim ulang.

### 4.3 Guru: Buat Kelas → Materi → Tugas → Siswa Submit → Guru Nilai (MVP inti)

1. Guru → [Kelas] → (Buat Kelas) → form: nama kelas ("XI IPA 1 — Matematika"), mapel, tahun ajaran, (opsional) kelas fisik.
2. Buka [Detail Kelas] → (Tambah Materi) → upload file / tempel link → judul otomatis dari nama file (dapat diedit) → terbit.
   - `[?]` File besar (>10MB video)? → tampilkan peringatan + rekomendasi kompresi/link eksternal (G16).
3. (Buat Tugas) → form: judul, instruksi (rich text), deadline (tanggal+jam), lampiran, tipe submit (file/teks/keduanya) → terbit → **State: Terbit** (status tugas = Buka/Tutup otomatis saat deadline).
4. Siswa: [Detail Kelas] → [Tugas] → lihat kartu tugas (judul, deadline, status) → (Kerjakan) → submit file/teks → **State: Tersubmit**; sistem tandai **Terlambat** jika > deadline (v1 §5.2) — badge merah + teks.
   - `[?]` Sebelum deadline, siswa bisa batalkan & ganti submit (State: Draft/Diubah). Setelah deadline, kunci ubah (kecuali guru buka).
5. Guru: [Penilaian] queue → buka submission → nilai skor + feedback teks → **State: Dinilai** → siswa lihat nilai + feedback.
6. Rekap: nilai otomatis masuk [Nilai] kelas → dapat diekspor (CSV/PDF) [v1 §5.3].

### 4.4 Buat Kuis & Bank Soal (v1 §5.3)

1. Guru → [Bank Soal] → (Buat Soal) → pilih tipe: PG (auto-grade) / Esai (manual) / Isian singkat (auto, normalize case) / Menjodohkan.
2. Isi: pertanyaan, opsi (untuk PG: tandai kunci), tag (bab, tingkat kesukaran: mudah/sedang/sulit), (opsional) gambar.
3. Simpan → soal masuk bank (State: Tersimpan; bisa edit/arsip).
4. (Buat Kuis) → form: judul, kelas target, pilih soal dari bank (filter tag), durasi, jadwal buka/tutup, acak urutan soal (toggle) → terbit.
5. Siswa kerjakan (lihat 4.6 pola timer) → PG auto-grade instan → nilai tampil; esai menunggu guru.

### 4.5 Ujian Online: Masuk Sesi → Token → Kerjakan → Autosave → Auto-submit → Hasil (v2 §2)

1. Waka/Admin Kurikulum jadwalkan ujian: mapel, angkatan/kelas, tanggal, jam mulai, durasi, ruang, variasi paket (A/B/C), shift ganda bila perlu [v2 §2.2b].
2. Menjelang sesi, siswa melihat [Ujian] → kartu "Ujian aktif: Matematika, 08:00–09:30" → (Masuk Sesi).
3. Layar **Token**: siswa input kode 6 karakter alfanumerik uppercase (tanpa karakter ambigu 0/O/1/I) dari pengawas → validasi server (valid untuk sesi ini, satu akun satu sesi) [v2 §2.2c].
   - `[?]` Token salah 3×? → lockout sementara 60 detik + pesan (rate limiting) [v3 G11].
   - `[?]` Di luar jendela sesi? → tombol nonaktif + teks "Sesi belum dibuka / telah berakhir" (validasi waktu server, bukan device) [v2 §3.3].
4. Layar **Kerjakan**: soal 1 per layar (atau daftar + panel navigasi), timer mundur besar, status koneksi, tombol autosave (indikator "Tersimpan 14:32").
   - Setiap jawaban → simpan lokal + sync server (idempotent, interval ±15 detik) [v2 §2.3]; log perubahan jawaban bertimestamp [v2 §2.3].
   - `[?]` Pindah tab/window? → catat log kecurangan (bukan diskualifikasi otomatis) + toast peringatan [v2 §2.2c].
5. **Auto-submit** saat waktu habis (server-side cutoff) → **State: Terkirim** → siswa tidak bisa kembali.
6. Pengerjaan PG auto-grade; esai manual oleh guru (lihat 4.7). Hasil masuk rekap nilai & rapor [v2 §2.2e].
   - Error: koneksi putus saat submit → retry otomatis dari local queue (offline-first G10); siswa melihat indikator "Menunggu koneksi…" bukan layar gagal.

### 4.6 Absensi QR: Guru Generate → Siswa Scan → Validasi (v2 §3)

1. Guru buka [Kelas] → [Absensi] → (Generate QR) → pilih jenis: Absensi Masuk / Izin-Keluar.
2. Sistem membuat token QR sekali pakai, **kedaluwarsa 5–10 menit** (default 7 menit) [v2 §3.3]; layar menampilkan QR besar + countdown + daftar yang sudah scan (real-time).
3. Siswa di kelas → [Absensi] → (Scan QR) → kamera/scan → token dikirim ke server bersama konteks sesi (tanpa school_id).
4. Validasi server (waktu server, token sekali pakai):
   - **Sukses (Hadir):** layar hijau "Hadir 08:02" → toast + ikon centang.
   - **Terlambat:** jika guru set toleransi (mis. >5 menit setelah sesi mulai) → badge kuning "Terlambat".
   - **Gagal (token kadaluwarsa/duplikat):** layar merah "QR tidak berlaku" → opsi "Minta QR baru ke guru".
   - `[?]` (opsional, anti-titip) radius lokasi dalam 50m sekolah → tambah validasi GPS; gagal jika di luar.
5. Guru melihat rekap live; siswa yang alpa tanpa keterangan → notifikasi otomatis ke wali kelas [v2 §3.2].

### 4.7 Izin/Sakit Online + Verifikasi Wali Kelas (v2 §3.2)

1. Siswa → [Absensi Saya] → (Ajukan Izin/Sakit) → pilih jenis (Sakit / Izin), tanggal (bisa rentang), alasan, upload surat (dokter / orang tua) → kirim → **State: Menunggu Verifikasi**.
2. Wali Kelas → [Izin/Sakit Masuk] → lihat kartu pengajuan (siswa, tanggal, jenis, lampiran) → (Terima) → **State: Disetujui** → catatan absensi otomatis "Sakit/Izin"; atau (Tolak) dengan alasan wajib → **State: Ditolak** → notifikasi ke siswa (alasan tampil).
3. `[?]` Tidak ada surat? → wali kelas bisa setujui dengan catatan "tanpa surat" (keputusan tetap manusia).
4. Rekap: pengajuan yang disetujui masuk rekap absensi; yang ditolak terhitung alpa.

### 4.8 PPDB: Daftar Publik → Upload → Verifikasi TU → Pengumuman → Jadi Siswa (v1 §5.6)

1. Calon siswa/orang tua membuka halaman publik PPDB (tanpa login) → baca info & syarat → (Daftar Sekarang).
2. Wizard 4 langkah:
   - **1 Data Calon:** nama, NISN (opsional), tempat/tanggal lahir, asal sekolah, jalur (reguler/prestasi*).
   - **2 Data Orang Tua:** nama, pekerjaan, no. HP, email.
   - **3 Upload Dokumen:** KK, akta lahir, rapor (foto/scan) — masing-masing dengan ukuran & format valid (PDF/JPG ≤5MB), preview sebelum kirim; autosave draft lokal.
   - **4 Consent & Konfirmasi:** checkbox persetujuan data anak di bawah umur oleh orang tua/wali (wajib, timestamp) [v3 G13] + ringkasan data → kirim.
3. Sukses → **State: Terdaftar** → tampil **Nomor Pendaftaran** (mis. EC-2026-001234) + panduan cek status; email/WA konfirmasi.
4. TU → [PPDB] → verifikasi kelengkapan dokumen: (Terima) / (Minta Perbaikan) dengan catatan → calon mendapat notifikasi.
5. Seleksi (manual input hasil atau kriteria sederhana) → **Pengumuman** diterbitkan.
6. `[?]` Lolos? → **State: Diterima** → sistem otomatis buat akun siswa aktif + undangan aktivasi [v1 §5.6]. Tidak lolos → **State: Tidak Diterima** (tetap bisa akses pengumuman, data diarsip sesuai kebijakan retensi G12).

### 4.9 Dashboard Wali Kelas & Kepsek (pengambilan keputusan)

- **Wali Kelas:** beranda menampilkan 3 kartu: (1) Rata-rata nilai kelas per mapel (bar chart mini), (2) % kehadiran bulan ini + daftar siswa alpa berulang (di-highlight, link ke [Kedisiplinan]), (3) Queue verifikasi izin/sakit. Satu klik dari kartu → aksi lengkap (nilai submission, verifikasi izin, kirim notifikasi orang tua).
- **Kepsek:** beranda = dashboard eksekutif: KPI besar (jumlah siswa aktif, kehadiran hari ini, rata-rata nilai per angkatan, tunggakan SPP*) + tren 6 bulan + daftar "Perlu perhatian" (kelas dengan nilai turun / alpa naik). Semua angka bisa di-klik → drill-down, bukan statis.

---

## 5. Wireframe Layar Kunci (19 layar)

Konvensi ASCII: `[Tombol]` tombol, `(Tab)` tab, `[x]` checkbox, `....` input/teks, `|` tabel. Notasi `<role=alert>` dan `aria-live` pada wireframe menunjukkan LOKASI atribut aksesibilitas yang harus dipasang (spesifikasi desain), bukan tag HTML yang ditulis verbatim. Wireframe mengikuti konvensi "tanpa emoji": ikon diganti label teks pendek seperti `[D]` dokumen, `[V]` video, `[L]` link, `[OK]` sukses, `[!]` peringatan.

### 5.1 Login (semua role)

```
+----------------------------------------------+
| opensis                          (logo)       |
| +------------------------------------------+ |
| | Masuk ke opensis                         | |
| | Masuk dengan akun sekolah Anda          | |
| |                                          | |
| | Email atau Username      [............] | |
| | Kata sandi               [............]  | |
| | Lupa kata sandi? Hubungi OPERATOR/SUPERADMIN | |
| |               (reset in-app)                | |
| | [      Masuk (primary)           ]       | |
| | ----------------------------------------- | |
| | <role=alert> Email atau kata sandi salah | |
| | </role=alert>                            | |
| +------------------------------------------+ |
+----------------------------------------------+
```

- State: error inline `role="alert"`; loading = spinner di tombol + disabled.
- Aksesibel: label eksplisit, `aria-required`, fokus ring pada kedua input, tombol ≥44px.
- Satu metode login: 'Email atau Username' + Password (Argon2id) [prd04 §5.P]; reset password oleh OPERATOR/SUPERADMIN (in-app, tanpa email/SMS) [prd04 §13 Q25]; tanpa tombol Google/SSO (no third-party) [prd04 §5.O].

### 5.2 Dashboard Siswa (mobile)

```
+--------------------------+
| Selamat pagi, Andi  [bell 3]|
| ------------------------- |
| [Kartu Ujian Aktif]       |
|  Matematika PTS 08:00     |
|  [ Masuk Sesi ]           |
| ------------------------- |
| Tugas tenggat terdekat    |
| - Fisika - Minggu 23:59   |
| - Kimia   - Senin 07:00   |
| [ Lihat semua - ]         |
| ------------------------- |
| Kelas Saya                |
| [XI IPA 1 Matematika]     |
| [XI IPA 1 Fisika     ]    |
| [XI IPA 1 Kimia      ]    |
| ------------------------- |
| (bottom nav: Beranda | Kelas | Ujian | Absensi | Profil) |
+--------------------------+
```

- Prioritas visual: ujian aktif (banner) > tenggat > kelas. Bottom nav ≤5 item (P4, kategori navigasi).
- State: tidak ada tugas → kartu empty "Tidak ada tugas mendatang".

### 5.3 Detail Kelas Siswa (materi/tugas)

```
+------------------------------+
| < XI IPA 1 - Matematika      |
| (Tab) Materi | Tugas | Kuis | Nilai |
| ---------------------------- |
| Materi (6)                   |
| [D] Bab 4 Vektor - Minggu    |
| [V] Video Persamaan Garis    |
| [L] Link Modul PDF           |
| [ Muat lebih banyak ]        |
+------------------------------+
```

- Tugas (tab kedua): kartu tugas = judul + deadline + badge status (Buka/Tersubmit/Terlambat/Terlewat) → klik = detail + form submit.
- State: materi kosong → empty state "Guru belum menambah materi" + ikon.

### 5.4 Kerjakan Kuis (siswa)

```
+------------------------------+
| Kuis: Vektor     Waktu: 12:34 |
| Pertanyaan 3 dari 10          |
| ---------------------------- |
| Nilai vektor AB = (3,-4).    |
| Panjang |AB| adalah ...      |
| ( ) 5          ( ) 6         |
| ( ) 7          ( ) -5        |
| ---------------------------- |
| [Sebelumnya]  [Berikutnya]    |
| [  Kumpulkan  ]              |
| Navigator: 1 2 3 4 5 ... 10  |
+------------------------------+
```

- Navigator menandai: dijawab (terisi), belum (kosong), ditandai (flag). Konfirmasi dialog sebelum "Kumpulkan" jika ada yang belum dijawab.
- Kuis non-formal: autosave; mode hemat data menonaktifkan gambar soal (opsional).

### 5.5 Ujian Online — Input Token

```
+------------------------------+
| Ujian: PTS Matematika        |
| Kelas XI IPA 1 * 08:00-09:30 |
| ---------------------------- |
| Masukkan token dari pengawas |
| [ _][ _][ _][ _][ _][ _ ]    |
| (6 karakter alfanumerik      |
|  uppercase, tanpa 0/O/1/I)   |
| [  Mulai Ujian  ]            |
| <role=alert> Token salah. 3  |
| percobaan gagal: coba lagi   |
| dalam 60 detik.</role=alert> |
+------------------------------+
```

- 6 field input terpisah (autofocus beruntun), paste satu string didukung; input hanya menerima 6 karakter alfanumerik uppercase tanpa 0/O/1/I (dikapitalkan otomatis).
- Error: salah → 60s lockout setelah 3× (G11). Di luar jendela → tombol disabled + teks penjelas.
- Sebelum mulai: layar info durasi & aturan (1 halaman, tombol "Saya mengerti, Mulai").

### 5.6 Ujian Online — Kerjakan (timer + autosave + navigasi)

```
+----------------------------------+
| Waktu: 01:12:45   Tersimpan 14:32|
| (peringatan kuning saat <=10 mnt)|
| Soal 12 dari 40   [tandai]       |
| --------------------------------- |
| Jika f(x)=2x+3, nilai f(5)=...   |
| ( ) 10   ( ) 11   ( ) 13  ( ) 15 |
| --------------------------------- |
| [Prev]  navigator  [Next]         |
| (40 kotak; terisi/flag)           |
| [ Kumpulkan & Akhiri ]            |
| <status> Koneksi terputus -       |
| jawaban tersimpan lokal.          |
| Menyambung ulang... </status>     |
+----------------------------------+
```

- Timer mundur besar; 10 menit terakhir = warna kuning, 60 detik = modal peringatan.
- Indikator "Tersimpan HH:MM" setelah tiap autosave (interval ±15 dtk, idempotent).
- Koneksi putus → banner non-blokir + queue lokal (G10); tab switch → log + toast peringatan (v2 §2.2c).
- A11y: `aria-live` untuk timer & status simpan; kontras timer kuning teks gelap (≥4.5:1).

### 5.7 Dashboard Guru

```
+--------------------------------------+
| Beranda Guru                    [bell]|
| ------------------------------------ |
| Perlu dinilai (5)                    |
|  [XI IPA 1 Matematika - 3]           |
|  [X IPS 2 Matematika  - 2]           |
| ------------------------------------ |
| Kelas Saya                           |
|  [XI IPA 1 - Matematika]  [buat +]   |
|  [XI IPS 2 - Matematika]             |
|  [X MIPA 3 - Fisika]                 |
| ------------------------------------ |
| Ujian terjadwal                      |
|  PTS Matematika - Jumat 08:00  [QR]  |
| [ Lihat semua - ]                    |
+--------------------------------------+
```

- CTA primer di pojok kanan atas konten: "Buat Tugas/Kuis" (kontekstual).
- Queue grading selalu terlihat — metrik keberhasilan v1 §11 (guru rutin menilai).

### 5.8 Grading Esai — Side-by-Side (guru)

```
+---------------------------------------------+
| < Penilaian: XI IPA 1 - Matematika          |
| Submission 3/15  (Sisa 12)                  |
| +-----------+---------------------------+   |
| | SOAL KUNCI | JAWABAN SISWA             |   |
| | Soal: ...  | Andi Setiawan (14:02)     |   |
| | Kunci: ... | [..........teks panjang...|   |
| | (referensi)| ............]             |   |
| +-----------+---------------------------+   |
| | Skor (0-100) [  85  ] Feedback [.......]  |
| | [ Simpan & Lanjut ] [Tandai periksa nanti]|
| +-------------------------------------------+ |
+---------------------------------------------+
```

- Tampilan berdampingan: soal+kunci di kiri, jawaban siswa di kanan [v2 §2.2e]; keyboard-only: tab memindah fokus antara kedua panel.
- Skor cepat (numeric input) + feedback teks; shortcut simpan.
- State: "Tandai periksa nanti" → submission tetap di queue; selesai semua → toast sukses + notifikasi siswa.

### 5.9 Absensi QR — Guru Generate

```
+--------------------------------------+
| Absensi: XI IPA 1 - Matematika       |
| Sesi 08:00 (Pertemuan 12)            |
| +----------------------------------+ |
| |        [      QR CODE       ]    | |
| |        [    (large, 240px)   ]   | |
| |   Kedaluwarsa: 06:41              | |
| +----------------------------------+ |
| Sudah scan: 18/24  Hadir 17 Terlambat 1 |
| [ Perpanjang 5 mnt ] [ Tutup Sesi ] |
+--------------------------------------+
```

- Token sekali pakai, expired default 7 menit [v2 §3.3]; countdown besar; daftar scan real-time (Socket.IO).
- (Perpanjang) = token baru; (Tutup Sesi) = hentikan penerimaan, konfirmasi dialog.
- State error: token expired → layar QR berganti pesan "Sesi berakhir".

### 5.10 Absensi QR — Siswa Scan (hasil validasi)

```
+--------------------------+
| Absensi Mapel            |
| [  Buka Kamera / Scan  ] |
| ------------------------ |
| [OK] Hadir               |
|   XI IPA 1 - Matematika  |
|   08:02 (tepat waktu)    |
|   [ OK ]                 |
+--------------------------+
```

- 3 hasil: **Hadir** (hijau), **Terlambat** (kuning, teks gelap), **Gagal** (merah + alasan + CTA "Minta QR baru").
- Status tidak pernah hanya warna: ikon + teks (P3, aksesibilitas).

### 5.11 Dashboard Wali Kelas (rekap + kedisiplinan)

```
+--------------------------------------+
| Wali Kelas XI IPA 1            [bell]|
| +-------+ +-------+ +-------------+ |
| | Nilai | | Hadir | | Izin menunggu| |
| | 78.4  | | 96.2% | | 2           | |
| +-------+ +-------+ +-------------+ |
| Kedisiplinan (alpa >3x/bulan)       |
|  [!] Budi - 4x alpa     [ Notifikasi ]|
|  [!] Sari - 3x alpa     [ Notifikasi ]|
| Rekap nilai per mapel (bar chart)   |
| [ Kelola Kelas - ]                  |
+--------------------------------------+
```

- 3 kartu KPI → klik = halaman detail (rekap nilai, rekap absensi, verifikasi izin).
- Daftar alpa otomatis di-highlight berdasarkan ambang konfigurasi sekolah [v2 §3.2]; CTA kirim notifikasi orang tua (1 klik).

### 5.12 Verifikasi Izin/Sakit (wali kelas)

```
+--------------------------------------+
| Pengajuan Izin/Sakit (2)             |
| +----------------------------------+ |
| | Andi - Sakit - 4-5 Agustus       | |
| | Surat: [lihat lampiran] (JPG)    | |
| | [ Terima ]  [ Tolak ]            | |
| +----------------------------------+ |
| +----------------------------------+ |
| | Sari - Izin - 6 Agustus          | |
| | Surat: - (tanpa surat)           | |
| | [ Terima ]  [ Tolak ]            | |
| +----------------------------------+ |
+--------------------------------------+
```

- Kartu per pengajuan; Tolak → dialog wajib isi alasan (role=alert di area form).
- Setelah aksi → kartu hilang dengan toast sukses; siswa dapat notifikasi (Socket.IO).

### 5.13 Dashboard Kepala Sekolah (eksekutif)

```
+------------------------------------------+
| Dashboard Eksekutif    [tahun 2026/27 v] |
| +---------+---------+---------+--------+ |
| |Siswa    | Hadir   | Rerata  |Tunggakan| |
| | 1,204   | 95.8%   | 78.4    | 12%    | |
| +---------+---------+---------+--------+ |
| Tren kehadiran (bar chart 6 bulan)       |
| Perlu perhatian                          |
|  [!] Kelas XII IPS 2 - nilai turun 6%    |
|  [!] Alpa naik di XI IPA 3 (Budi, Sari)  |
| [ Laporan - ]                            |
+------------------------------------------+
```

- 4 KPI besar + tren; semua angka klik → drill-down (read-only detail).
- "Perlu perhatian" = daftar yang digenerate dari aturan (nilai turun, alpa naik) — data, bukan opini.

### 5.14 Dashboard SUPERADMIN (Admin Sistem Sekolah — statistik dalam sekolah)

```
+----------------------------------------------+
| Superadmin: Statistik Sekolah   [30 hari v]  |
| +----------+----------+----------+----------+ |
| |Siswa     | Guru     | Kelas    | Adopsi   | |
| | 1,204    | 86       | 48       | 64%      | |
| +----------+----------+----------+----------+ |
| Tabel feature flags (ringkas):                |
| | Key             | Kategori   | Status | Aksi|
| | LMS_BASE        | Sistem     | ON     | lock|
| | LMS_MATERIAL    | LMS        | ON     |toggle|
| | LMS_EXAM        | LMS        | ON     |toggle|
| | FINANCE_GATEWAY | Keuangan   | OFF    |toggle|
| | GAMIFIKASI      | Gamifikasi | OFF    | lock|
| [ Pengaturan Aplikasi ] [ Audit Log ] [ Manajemen User ] |
+----------------------------------------------+
```

- KPI dalam sekolah: siswa/guru/kelas aktif, adopsi fitur dalam sekolah — **G21 (analitik lintas-sekolah) TIDAK RELEVAN** [owner-v4.2].
- CTA: [Pengaturan Aplikasi] (identitas sekolah/tahun ajaran + Feature Flags), [Audit Log], [Manajemen User] (reset password oleh SUPERADMIN/OPERATOR).

### 5.14b Pengaturan Aplikasi (Feature Flags) — SUPERADMIN

```
+--------------------------------------------------+
| Pengaturan Aplikasi > Feature Flags              |
| Filter kategori: [ Semua v ] [ Cari flag... ]    |
| | Key             | Kategori   | Status | Aksi   |
| | LMS_BASE        | Sistem     | ON     | locked |
| | LMS_MATERIAL    | LMS        | ON     | [toggle] |
| | LMS_EXAM        | LMS        | ON     | [toggle] |
| | FINANCE_GATEWAY | Keuangan   | OFF    | [toggle] (opsional) |
| | PAYROLL         | Keuangan   | OFF    | [toggle] |
| | GAMIFIKASI      | Gamifikasi | OFF    | locked |
| [ Simpan ]                                       |
+--------------------------------------------------+
```

- OFF = UI disembunyikan, route diblokir, API tolak `FEATURE_DISABLED` (403); flag `locked` tidak bisa diubah; semua toggle diaudit (AuditLog).
- Implementasi: FeatureFlag + AppFeatureSetting + guard FEATURE_DISABLED (F1-T13 di 05-implementation-plan).

### 5.15 Form PPDB — Langkah 3 Upload Dokumen (publik)

```
+--------------------------------------+
| PPDB 2026/27 - Langkah 3 dari 4      |
| [1] Data Calon [2] Orang Tua [3] Dokumen [4] Konfirmasi |
| ------------------------------------ |
| KK (wajib)      [ Pilih File ] (ok) KK.jpg |
| Akta lahir (wajib) [ Pilih File ] (ok) akta.pdf |
| Rapor semester 1 (opsional) [Pilih File] |
| Format: JPG/PNG/PDF maks 5MB          |
| <role=alert> File lebih dari 5MB.     |
| Kompres atau pilih file lain.</role=alert> |
| [Kembali]  [Lanjut]                   |
| Draft tersimpan otomatis (autosave)   |
+--------------------------------------+
```

- Wizard progress di atas; autosave draft lokal (mencegah hilang saat koneksi putus).
- Validasi ukuran/tipe file real-time; error inline + `role=alert`.
- Langkah 4 berisi consent data anak (checkbox wajib, timestamp) [v3 G13] + ringkasan.

### 5.16 Cek Status PPDB (publik)

```
+--------------------------------------+
| Cek Status Pendaftaran               |
| No. Pendaftaran [ EC-2026-001234 ]   |
| [ Cek Status ]                       |
| ------------------------------------ |
| Status: Terdaftar - dokumen          |
| sedang diverifikasi                  |
| (langkah berikutnya: verifikasi TU   |
| - pengumuman 20 Agustus)             |
+--------------------------------------+
```

- Status pipeline: Terdaftar → Dokumen Diverifikasi → Diterima/Tidak Diterima.
- Setiap status = teks + ikon + penjelasan langkah berikutnya (bukan hanya badge).

### 5.17 Admin Sekolah — Kelola User & Undangan (TU)

```
+----------------------------------------------+
| Undangan & User                   [Undang +] |
| (Tab) Guru | Siswa | Staf | Undangan Pending |
| Tabel Guru (cari, filter):                  |
| | Nama        | Mapel  | Status  | Aksi     |
| | Budi S.     | Matematika | Aktif  |[menu]  |
| | Sari W.     | Fisika | Undangan | kirim ulang |
| [ Form Undang (dialog): nama, email, role v, |
|   [ Kirim Undangan ] ]                      |
+----------------------------------------------+
```

- (Undang) membuka Dialog form; status undangan: terkirim/terpakai/kedaluwarsa.
- Tabel responsif: mobile = kartu per user, bukan tabel horizontal scroll.

### 5.18 Onboarding Wizard — Impor Data (TU, G9)

```
+----------------------------------------------+
| Setup Sekolah - Langkah 2: Impor Data        |
| [1] Profil [2] Impor [3] Undang Staf        |
| -------------------------------------------- |
| 1. [ Unduh Template Excel ] (siswa/guru/kelas)|
| 2. [ Pilih File Excel ]    file: siswa.xlsx  |
| -------------------------------------------- |
| Validasi: 248 baris * 4 error                |
| | Baris | Kolom    | Masalah              |
| | 12    | NISN     | Duplikat (sudah ada) |
| | 57    | Nama     | Kosong               |
| [ Perbaiki file ] [  Impor 248 valid  ]     |
| -------------------------------------------- |
| Hasil: 244 berhasil * 4 dilewati (lihat log) |
+----------------------------------------------+
```

- Template → upload → validasi → **preview dengan error per baris** → impor parsial yang aman.
- Import idempoten: menjalankan ulang tidak menduplikasi (validasi NISN/NIP).

### 5.19 Dashboard Orang Tua (read-only — MVP)

```
+---------------------------------------------+
| Selamat datang, Bapak/Ibu          [bell 2] |
| Anak: Andi Setiawan - XI IPA 1 (2026/27)   |
| +---------+ +---------+ +-------------+     |
| | Nilai   | | Absensi | | Tagihan      |    |
| | Rerata  | | Bulan   | | Menunggu 1   |    |
| | 82.5    | | 96.2%   | | (read-only)  |    |
| +---------+ +---------+ +-------------+     |
| Nilai terbaru (read-only):                  |
| | Mapel      | Tugas | Kuis | Ujian | Rerata|
| | Matematika | 90    | 85   | 78    | 84.3  |
| | Fisika     | 80    | 88   | -     | 84.0  |
| [ Lihat detail nilai - ]                    |
+---------------------------------------------+
```

- Satu layar ringkas **read-only**: nilai, absensi, dan tagihan anak; tidak ada aksi tulis (P2: RBAC membatasi role orang tua) [01-master §5.2 Grup C].
- Kartu Tagihan menampilkan status read-only; sebelum modul keuangan aktif, tampilkan empty state "Belum ada data tagihan".
- Semua angka dapat diklik → halaman detail read-only; notifikasi nilai keluar/alpa/tagihan via Socket.IO.
- A11y: kontras AA; tabel nilai mobile → kartu; status tagihan = teks + ikon (bukan warna saja).

---

## 6. Design System

### 6.1 Token Warna (kontras WCAG AA)

Semua kontras dihitung terhadap putih `#FFFFFF` (atau permukaan di mana teks berada). Nilai kontras: rasio minimum **4.5:1 teks normal**, **3:1 elemen UI & teks besar (≥18pt/24px)**.

| Token              | Hex       | Penggunaan                                                 | Kontras vs putih | Kelas WCAG     |
| ------------------ | --------- | ---------------------------------------------------------- | ---------------- | -------------- |
| `--primary-600`    | `#2563EB` | Tombol primer, link aktif, fokus                           | 5.2:1            | AA teks normal |
| `--primary-700`    | `#1D4ED8` | Hover primer                                               | 7.0:1            | AA/AAA         |
| `--primary-100`    | `#DBEAFE` | Latar chip aktif (teks pakai primary-800 `#1E40AF`, 7.8:1) | -                | AA             |
| `--success-600`    | `#059669` | Status sukses, hadir                                       | 4.6:1            | AA             |
| `--warning-700`    | `#B45309` | Status terlambat/peringatan (bukan 600 yang 3.9:1)         | 5.9:1            | AA             |
| `--danger-600`     | `#DC2626` | Error, hapus, alpa                                         | 4.5:1            | AA             |
| `--info-700`       | `#0369A1` | Info, tautan sekunder                                      | 6.2:1            | AA             |
| `--text-primary`   | `#111827` | Judul & body utama                                         | 15.6:1           | AAA            |
| `--text-secondary` | `#4B5563` | Body sekunder, caption penting                             | 7.1:1            | AA/AAA         |
| `--text-muted`     | `#6B7280` | Caption non-esensial (≥14px saja)                          | 4.7:1            | AA             |
| `--border-strong`  | `#6B7280` | Border input (indikator interaktif ≥3:1)                   | 4.7:1            | AA             |
| `--border-subtle`  | `#E5E7EB` | Pemisah kartu (non-interaktif)                             | -                | tidak wajib    |
| `--surface`        | `#FFFFFF` | Kartu, halaman                                             | -                | -              |
| `--surface-alt`    | `#F9FAFB` | Latar halaman/section bergantian                           | -                | -              |

Aturan:

- **Teks di atas warna**: teks putih hanya di atas primary-600/success-600/danger-600/info-700 (semua ≥4.5:1). Di atas warning pakai teks gelap `#111827` (kontras 8.0:1 terhadap `#B45309`).
- **Jangan pernah menyampaikan status dengan warna saja** — selalu + ikon + teks (P3).
- Dark mode = fase lanjutan; wajib token ulang dengan kontras setara, bukan inverter otomatis.

### 6.2 Tipografi

| Level   | Font              | Ukuran / Line-height | Berat | Penggunaan                             |
| ------- | ----------------- | -------------------- | ----- | -------------------------------------- |
| Display | Plus Jakarta Sans | 30px / 1.2           | 700   | Judul halaman (halaman utama)          |
| H1      | Plus Jakarta Sans | 24px / 1.25          | 700   | Judul halaman/detail                   |
| H2      | Plus Jakarta Sans | 20px / 1.3           | 600   | Judul section                          |
| H3      | Inter             | 16px / 1.4           | 600   | Judul kartu                            |
| Body    | Inter             | 16px / 1.5           | 400   | Teks utama (base)                      |
| Body-sm | Inter             | 14px / 1.5           | 400   | Teks sekunder, tabel                   |
| Caption | Inter             | 12px / 1.4           | 500   | Label kecil, timestamp (hindari <12px) |
| Mono    | JetBrains Mono    | 16-24px              | 600   | Token ujian, angka timer               |

- **Plus Jakarta Sans** dipilih karena asal Indonesia & mendukung Latin; **Inter** untuk body agar nyaman di layar; **JetBrains Mono** untuk token/kode yang harus mudah dibedakan (0/O, 1/I/l).
- Base **16px**; line-height **1.5**; panjang baris teks materi ≤ 75 karakter.
- Berat: 400 body, 500 label/tombol, 600 sub-judul, 700 judul. Maksimal 3 berat per layar.

### 6.3 Spacing, Radius, Elevasi

| Token      | Nilai | Penggunaan                              |
| ---------- | ----- | --------------------------------------- |
| `space-1`  | 4px   | Gap antar elemen inline (ikon-teks)     |
| `space-2`  | 8px   | Gap antar kontrol form, padding chip    |
| `space-3`  | 12px  | Padding kompak (badge, input)           |
| `space-4`  | 16px  | Padding kartu, gap antar kartu (mobile) |
| `space-6`  | 24px  | Padding konten utama, gap section       |
| `space-8`  | 32px  | Jarak antar section besar               |
| `space-12` | 48px  | Jarak antar blok halaman                |

| Token             | Nilai            | Penggunaan                            |
| ----------------- | ---------------- | ------------------------------------- |
| `radius-sm`       | 6px              | Input, badge                          |
| `radius-md`       | 8px              | Tombol, kartu kecil                   |
| `radius-lg`       | 12px             | Kartu besar, dialog                   |
| `radius-full`     | 999px            | Pill, avatar, tombol ikon             |
| `shadow-sm/md/lg` | Tailwind default | Kartu (sm), dialog (lg), fokus (ring) |

- Grid: 4px base; konten max-width 1200px (desktop), padding halaman 16px (mobile) / 24px (desktop).
- Target sentuh minimum **44×44px**; jarak antar target ≥8px (kategori Touch & Interaction).

### 6.4 Komponen Inti + Mapping shadcn/ui

| Komponen Produk                                           | shadcn/ui                                                                      | Catatan penyesuaian                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Tombol (primary/secondary/outline/ghost/destructive/link) | `Button`                                                                       | varian sesuai token §6.1; disabled 40% opacity + tetap kontras teks |
| Kartu (kelas, tugas, materi, KPI)                         | `Card` (+ `CardHeader/Content/Footer`)                                         | judul H3, padding space-4                                           |
| Tabel (rekap nilai, absensi, tagihan, audit/flag)         | `Table`                                                                        | header sticky; mobile → kartu (bukan scroll horizontal)             |
| Dialog (konfirmasi, form cepat, preview)                  | `Dialog` + `AlertDialog`                                                       | focus trap, ESC tutup, judul `aria-labelledby`                      |
| Form (tugas, kuis, PPDB, undangan)                        | `Form` + `Input` + `Textarea` + `Select` + `Label` + `Checkbox` + `RadioGroup` | label eksplisit selalu; error inline + `aria-describedby`           |
| Pemberitahuan aksi (sukses/gagal simpan)                  | `Sonner` (toast)                                                               | `aria-live="polite"`; tahan ≥4 detik                                |
| Pemberitahuan penting/error blokir                        | `Alert`                                                                        | `role="alert"`                                                      |
| Tab (materi/tugas/kuis/nilai)                             | `Tabs`                                                                         | keyboard arrow navigation                                           |
| Badge status (Tersubmit/Terlambat/Diverifikasi…)          | `Badge`                                                                        | ikon+teks+warna, bukan warna saja                                   |
| Drawer mobile (filter, detail cepat)                      | `Sheet`                                                                        | swipe & ESC close                                                   |
| Menu aksi per baris                                       | `DropdownMenu`                                                                 | item destruktif terpisah + konfirmasi                               |
| Indikator loading                                         | `Skeleton`                                                                     | skeleton mengikuti bentuk layout (bukan spinner penuh)              |
| Progress (timer ujian, progres kelas)                     | `Progress`                                                                     | + teks persen, `aria-valuenow`                                      |
| Avatar (siswa/guru)                                       | `Avatar`                                                                       | fallback inisial; alt/teks nama selalu ada                          |
| Stepper wizard (onboarding, PPDB)                         | custom `Steps` (kombinasi)                                                     | status: selesai/aktif/terkunci; a11y `aria-current="step"`          |
| Toggle (data-saver, gamifikasi)                           | `Switch`                                                                       | label jelas + state "on/off" teks                                   |
| Tooltip                                                   | `Tooltip`                                                                      | tidak pernah jadi satu-satunya cara akses info                      |
| Empty state                                               | custom (Card + ikon + teks + CTA)                                              | selalu beri CTA aksi pertama                                        |
| Pencarian global*                                         | `Command`                                                                      | fase lanjutan                                                       |

### 6.5 Pola State (wajib konsisten di semua halaman)

| State              | Pola                                                                                          | Contoh                                   |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Loading**        | Skeleton sesuai layout + spinner kecil di tombol aksi; tidak ada layout shift (reserve space) | Detail kelas: 3 baris skeleton kartu     |
| **Error (blokir)** | `Alert role="alert"` di atas konten + tombol "Coba lagi"                                      | Server tidak dapat dijangkau             |
| **Error (form)**   | Inline di bawah field + border danger + `aria-describedby`; ringkasan error di atas form      | "File lebih dari 5MB"                    |
| **Empty**          | Ikon + kalimat singkat + CTA primer                                                           | "Belum ada tugas. (Buat tugas)" (guru)   |
| **Success**        | Toast sukses + status badge berubah; untuk aksi besar: layar konfirmasi                       | "Nilai tersimpan", "Submission terkirim" |
| **Partial**        | Badge "Sebagian gagal" + unduh log                                                            | Impor Excel 244/248 berhasil             |
| **Offline**        | Banner non-blokir + ikon koneksi; input tetap bisa (queue lokal)                              | Ujian saat koneksi putus                 |

### 6.6 Responsive (mobile-first)

| Breakpoint | Lebar   | Perilaku                                                              |
| ---------- | ------- | --------------------------------------------------------------------- |
| Base       | <640px  | 1 kolom; bottom nav 5 item; tabel → kartu; dialog full-screen (Sheet) |
| `sm`       | ≥640px  | 2 kolom kartu; bottom nav tetap                                       |
| `md`       | ≥768px  | Sidebar navigasi muncul (gantikan bottom nav); 2-3 kolom              |
| `lg`       | ≥1024px | Layout penuh: sidebar + konten 3-4 kolom; grading side-by-side aktif  |
| `xl`       | ≥1280px | Maks konten 1200px; padding 24px                                      |

- Tidak pernah horizontal scroll; tabel lebar → pola kartu atau detail drill-down.
- Konten penting (timer ujian, tombol submit) tetap terlihat di viewport mobile tanpa scroll.

---

## 7. Aksesibilitas (G15) — berlaku untuk SEMUA halaman

Sekolah inklusi ada di SMA/SMK reguler; standar aksesibilitas menyeluruh (bukan hanya halaman publik PPDB) [v3 G15].

| Area                   | Standar wajib                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Semantic HTML**      | Satu `<h1>` per halaman; landmark `<header>/<nav>/<main>/<aside>/<footer>`; daftar memakai `<ul>/<ol>`; tabel memakai `<th scope>`; link vs tombol dibedakan benar.                 |
| **Skip link**          | "Lewati ke konten utama" — target pertama di tab, terlihat saat fokus.                                                                                                              |
| **Keyboard**           | Semua interaktif dapat difokus & dioperasikan keyboard; urutan fokus logis (kiri→kanan, atas→bawah); dialog: focus trap + ESC; tabs: arrow keys.                                    |
| **Focus state**        | Focus ring terlihat: outline 2px `--primary-600` + offset 2px; JANGAN dihapus (`outline: none` tanpa pengganti).                                                                    |
| **Kontras**            | AA semua teks (§6.1); status tidak hanya warna (ikon + teks).                                                                                                                       |
| **Form**               | Label eksplisit (bukan placeholder-only); `aria-required`; error inline + `aria-describedby` + `aria-invalid`; ringkasan error di atas form; focus pindah ke field error pertama.   |
| **Error announcement** | Error blokir/inline: `role="alert"` (assertive). Toast sukses: `aria-live="polite"`. Timer ujian & status autosave: `aria-live="polite"` (interval tidak mengganggu pembaca layar). |
| **Timer ujian**        | Waktu selalu teks besar & kontras; peringatan 10/5/1 menit (visual + audio opsional); tombol submit tetap fokusable.                                                                |
| **Motion**             | Hormati `prefers-reduced-motion`: tanpa animasi dekoratif; transisi ≤200ms; tidak ada elemen berkedip >3×/detik.                                                                    |
| **Target sentuh**      | ≥44×44px; jarak ≥8px.                                                                                                                                                               |
| **Gambar/ikon**        | `alt` deskriptif; ikon dekoratif `aria-hidden`; ikon fungsional punya label teks (nama aksesibel).                                                                                  |
| **Bahasa**             | `lang="id"` di root; teks UI Bahasa Indonesia.                                                                                                                                      |
| **Multi-device**       | Satu metode login untuk semua perangkat: 'Email atau Username' + Password (Argon2id); tanpa SSO eksternal (no third-party) [prd04 §5.O].                                            |

Kasus khusus siswa disabilitas:

- **Low vision**: mode teks lebih besar (125%) tidak merusak layout; zoom 200% tanpa kehilangan fungsi (WCAG 1.4.4/1.4.10).
- **Tuli**: materi video wajib teks/transkrip (unggahan guru disarankan menyertakan; platform menyediakan kolom deskripsi).
- **Disleksia**: opsi font spasi lebar (toggle), hindari teks justify, jeda paragraf jelas.

---

## 8. Mode Hemat Kuota / Data-Saver (G16)

Siswa banyak yang akses via kuota seluler terbatas — biaya data bisa menjadi barrier ekonomi [v3 G16]. Desain ini menggabungkan rekomendasi offline-first G10.

| Fitur                    | Implementasi                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Deteksi otomatis**     | Aktif default saat `navigator.connection.saveData` true atau effectiveType 3g/2g; bisa di-toggle manual di Profil/Pengaturan.    |
| **Lazy-load**            | Gambar & lampiran dimuat saat mendekati viewport (IntersectionObserver); placeholder berwarna `--surface-alt` (CLS ≤0.1).        |
| **Kompresi server-side** | Semua upload guru dikompresi otomatis di server sebelum disimpan (WebP/AVIF; target ≤200KB gambar materi) [v3 G10/G16].          |
| **Format adaptif**       | `srcset`/`sizes`; video: thumbnail + pilihan kualitas (rendah default di data-saver), tanpa autoplay.                            |
| **Mode teks-only**       | Toggle per materi: gambar di-skip, dokumen PDF → versi teks/detail ringkas; tombol "Buka file asli" bila perlu.                  |
| **Cache offline (PWA)**  | Service worker cache materi yang sudah dibuka; absensi QR di-queue lokal & sync saat online (G10); indikator "tersedia offline". |
| **Batas notifikasi**     | Push notifikasi diringkas (1 notifikasi per tugas, bukan per aktivitas); notifikasi tidak memuat lampiran berat.                 |
| **Transparansi**         | Badge "Hemat data ON" di header saat aktif; sekali toggle berlaku global (tidak per halaman).                                    |

Indikator data-saver selalu terlihat (ikon di header) agar siswa paham mengapa gambar tidak dimuat.

---

## 9. Gamifikasi Ringan (G17) — opsi non-blokir

Gamifikasi adalah penguat adopsi siswa [v3 G17], bukan gerbang akses. Semua mekanisme **opsional, non-blokir, dan dapat dinonaktifkan oleh admin sekolah** (toggle di Pengaturan Sekolah).

| Elemen                     | Desain                                                                                                     | Aturan non-blokir                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Badge**                  | Badge keterampilan: "Rutin" (submit 10 tugas), "Juara Kuis" (nilai kuis ≥90), "Rajin" (hadir 100% sebulan) | Badge hanya info; tidak ada akses/poin yang ditahan.                       |
| **Progress**               | Bar progres per kelas/materi ("60% materi dibaca"), progress tugas per mapel                               | Progress tidak menghalangi materi berikutnya.                              |
| **Streak**                 | Hitung hari belajar beruntun di Beranda siswa                                                              | Tidak ada penalti jika putus.                                              |
| **Leaderboard (opsional)** | Default NONAKTIF; admin sekolah dapat mengaktifkan per kelas                                               | Privasi: nama samaran/pilih kelas; tidak pernah menampilkan nilai negatif. |
| **Notifikasi positif**     | Toast/netral saat siswa meraih badge — frekuensi dibatasi (≤2/hari)                                        | Bisa dimatikan di pengaturan notifikasi.                                   |

- Aksesibel: pencapaian disampaikan teks + ikon, bukan hanya warna/animasi; hormati `prefers-reduced-motion`.
- Etika: tidak ada mekanisme "kalah"/peringkat publik yang memalukan; fokus penguatan perilaku belajar.

---

## 10. Prioritas Desain per Fase

Prioritas mengikuti prd04 §10 (roadmap): **fondasi + LMS inti + absensi/ujian + e-Rapor dasar + portal orang tua read-only + fondasi teknis** adalah MVP; PPDB/keuangan/live-class ditunda pasca-MVP; modul pendukung sesuai kebutuhan sekolah pilot [prd04 §10].

| Fase                       | Fokus                                                                                           | Desain yang wajib tuntas                                                                                                                                                                                                                                                                                     | Desain yang boleh minimal                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **0-2 (MVP inti)**         | Auth, onboarding, kelas, materi, tugas, submission, grading, notifikasi dasar                   | Login (Email/Username + Password); wizard onboarding (profil+impor+undang); kelas CRUD; detail kelas (materi/tugas); form tugas; submission siswa; queue & grading guru (side-by-side); rekap nilai dasar; design system inti; aksesibilitas dasar (semua halaman); data-saver dasar; notifikasi             | Dashboard kepsek/waka; PPDB; keuangan; analitik                                                |
| **3-4**                    | Kuis & penilaian; absensi online QR; ujian online; e-Rapor; portal orang tua                    | Bank soal & kuis; absensi QR (generate/scan/validasi); ujian online (token, timer, autosave, auto-submit, log kecurangan, hasil); rekap nilai lanjut; izin/sakit + verifikasi wali kelas; dashboard wali kelas; **portal orang tua read-only (dashboard nilai/absensi/tagihan anak)**                        | Dashboard superadmin                                                                           |
| **5 (Gelombang 2 — W2)**   | Keuangan SPP; payroll; aset & depresiasi; konsol admin; kalender terpadu; rollover tahun ajaran | Keuangan (tagihan/verifikasi/laporan) [W2-PAYMENT]; payroll (slip, PPh 21 TER/BPJS) [W2-PAYROLL]; aset (inventaris/depresiasi/opname) [W2-ASSET]; konsol admin sistem sekolah (pengaturan, feature flags, audit) [W2-ADMIN]; kalender terpadu lintas modul [W2-KALENDER]; rollover tahun ajaran [M-ROLLOVER] | PPDB; komunikasi; kesiswaan; perpustakaan; alumni                                              |
| **6 (Gelombang 3 — W3)**   | PPDB; notifikasi penuh; akademik lanjut; kesiswaan; komunikasi                                  | PPDB wizard 4 langkah + verifikasi TU + pengumuman; portal cek status; notifikasi penuh                                                                                                                                                                                                                      | Modul pendukung (BK, sarpras, perpustakaan, alumni, komunikasi) sesuai kebutuhan sekolah pilot |
| **7+ (pasca MVP / DEFER)** | Dashboard kepsek penuh; superadmin; gamifikasi penuh; live class DITUNDA                        | Dashboard kepsek (KPI + tren); superadmin (statistik adopsi fitur dalam sekolah); gamifikasi penuh (G17) dengan toggle; live class DITUNDA (jika dibangun = WebRTC self-hosted; tanpa Jitsi)                                                                                                                 | -                                                                                              |

Aturan fase:

1. **Setiap fase wajib lulus quality gate desain** (hierarki jelas, spacing konsisten, tipografi terbaca, kontras AA, state interaktif lengkap, responsive) sebelum hand-off ke openteam-coder.
2. **Desain tidak boleh mendahului validasi**: fitur SMK (PKL/UKK) dan Dapodik/ANBK hanya didesain setelah validasi ke sekolah SMK riil [v3 §8 #3].
3. Komponen baru yang dipakai di fase berikutnya wajib ditambahkan ke design system (bukan ad-hoc).

---

## 11. Ringkasan Kunci untuk Implementasi (Hand-off Checklist)

1. **Mulai dari token**: terapkan §6.1-6.3 (warna, tipografi, spacing) sebagai Tailwind theme di `packages/ui` sebelum halaman apa pun.
2. **Komponen inti dulu**: Button, Card, Table, Dialog, Form, Toast, Tabs, Badge, Skeleton (§6.4) — semua berbasis shadcn/ui.
3. **Pola state wajib**: setiap halaman punya state loading/error/empty/success (§6.5) — jangan mulai tanpa empty state.
4. **Aksesibilitas bukan pasca-produksi**: fokus ring, label form, `role="alert"`, `aria-live` adalah syarat terima, bukan opsional (§7).
5. **Mobile-first**: rancang & uji 320px sebelum desktop (§6.6).
6. **Alur kritis diuji end-to-end**: onboarding → undangan → kelas → tugas → submit → nilai (4.1-4.3) adalah jalur yang wajib mulus untuk MVP demo.

---

_Referensi: prd01.md (v1.0), prd02.md (v2.0), prd03.md (v3.0), 01-master-prd.md. Wireframe lengkap per modul dapat dirinci sebagai lampiran teknis terpisah bila diperlukan._
