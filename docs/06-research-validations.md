# 06 — Riset & Validasi Klaim PRD (Dokumen Riset Eksternal openlms)

**Tanggal riset:** 6 Agustus 2026
**Dokumen sumber yang divalidasi:** `docs/prd01.md`, `docs/prd02.md`, `docs/prd03.md`, `docs/prd04.md`
**Metode:** webfetch ke sumber resmi (peraturan.go.id, peraturan.bpk.go.id, pajak.go.id, bpjsketenagakerjaan.go.id, kemdikbud.go.id via Wayback Machine, helpdesk.pauddasmen.id, docs.moodle.org via Wayback, postgresql.org, w3.org, edu.google.com, web.dev, developer.mozilla.org) + situs vendor & sekunder (midtrans.com, xendit.co, cnnindonesia.com, tempo.co, talenta.co, ayopajak.com, id.wikipedia.org) + pencarian Brave Search. Perluasan Topik 11–16 menambah sumber: detik.com, ombudsman.go.id, pasal.id, muc.co.id, klikpajak.id, bosp.kemendikdasmen.go.id, artikel.pajakku.com, docs.midtrans.com, help.xendit.co, ehub.kemenkopukm.go.id, jdih.kemenkeu.go.id, news.ddtc.co.id, konsultanpajakmulyono.com, emis.kemenag.go.id, ayomadrasah.id, cheatsheetseries.owasp.org. Semua URL dicantumkan dengan tanggal akses (seluruh topik: 6 Agustus 2026). Sumber yang tidak dapat diakses langsung ditandai TIDAK TERVERIFIKASI — tidak ada klaim yang ditebak.

## 1. Ringkasan Eksekutif (BLUF)

1. **Klaim prd03 G12 (retensi data) dan G13 (consent data anak) VALID dan terkonfirmasi langsung dari teks UU No. 27/2022** — Pasal 16 ayat (2) huruf g, Pasal 42-44 (retensi/penghapusan/pemusnahan) dan Pasal 4 ayat (2) huruf e + Pasal 25 (data anak = data spesifik, wajib persetujuan orang tua/wali). Sanksi: administratif hingga denda 2% pendapatan tahunan (Pasal 57) dan pidana penjara 4-6 tahun dengan denda (Pasal 67-68, baru diamendemen UU No. 1/2026). Nuansa penting: UU PDP tidak menetapkan angka retensi spesifik ("5 tahun" di prd03 adalah keputusan desain, bukan amanat pasal), dan sekolah memiliki dasar pemrosesan sah lain (kewajiban hukum Dapodik, pelayanan publik) sehingga consent bukan satu-satunya fondasi hukum.
2. **Klaim prd03 G4 (akses API Dapodik terbatas) VALID dengan nuansa** — Dapodik memang menyediakan "Web Service" REST, tetapi bersifat lokal per-sekolah (berjalan di aplikasi Dapodik desktop sekolah, memakai token per-aplikasi yang dibuat operator), bukan API publik terpusat; integrasi data resmi (mis. PPDB) dilakukan lewat surat permohonan ke Pusdatin. Strategi prd03 "mulai dari ekspor file (Excel/CSV terformat)" adalah keputusan yang tepat dan realistis. ANBK terkonfirmasi (3 instrumen, moda online/semi-online); detail "peserta diambil dari Dapodik" belum terverifikasi langsung dari sumber yang diakses (perlu POS ANBK).
3. **Kurikulum Merdeka kini kurikulum nasional (Permendikbudristek 12/2024, diubah Permendikdasmen 13/2025)** — klaim prd03 G2 (P5 wajib, penilaian & rapor terpisah) dan G3 (asesmen diagnostik di awal pembelajaran) VALID. Aplikasi resmi e-Rapor Kurikulum Merdeka menghasilkan **dua produk terpisah**: rapor mapel (nilai TP/sumatif, deskripsi, ekskul, prestasi, catatan wali) dan rapor P5 — modul e-Rapor v2 openlms harus meniru struktur ini.
4. **Arsitektur prd01 (shared database + shared schema + kolom `school_id` + RLS) adalah pola yang sah dan didukung dokumentasi resmi PostgreSQL**, tetapi ada caveat teknis yang wajib dipahami (default-deny, pemilik tabel/superuser melewati RLS, referential integrity melewati RLS, race condition policy dengan sub-SELECT) — tetapi per keputusan single-school [owner-v4.2] aplikasi TIDAK memakai school_id/dimensi tenant; RLS hanya defense-in-depth opsional.
5. **Diferensiasi (G22-G24) harus lebih tajam** — Google Classroom kini punya plagiarism detection (originality report) dan analitik (baru "segera hadir"), Moodle mengklaim WCAG 2.1 AA. Artinya: openlms tidak bisa hanya "punya fitur yang sama"; diferensiasi harus pada konteks Indonesia (selaras Dapodik/e-Rapor/P5), gratis/terpadu lintas domain (nilai+absensi+keuangan+kalender), dan aksesibilitas menyeluruh.
6. **Keamanan ujian online: pendekatan berlapis adalah konsensus industri** (lockdown browser + randomisasi dari bank soal besar + batas waktu + proctoring + audit log); lockdown browser mengurangi 85-90% kecurangan dasar tetapi bisa di-bypass sehingga jangan jadi satu-satunya kontrol; proctoring webcam berimplikasi UU PDP karena data biometrik termasuk data pribadi spesifik (keputusan prd02 menundanya adalah tepat). Pola QR anti-titip (single-use token + expiry + validasi waktu server + geofencing) konsisten dengan praktik keamanan token umum — dengan catatan bahwa sumber resmi spesifik untuk geofencing belum dapat diverifikasi pada riset ini.
7. **Payroll sekolah (Topik 7) VALID** — PPh 21 memakai skema TER: PP 58/2023 + PMK 168/2023 (berlaku sejak 1 Jan 2024, masih berlaku 2026). TER harian 0% (≤ Rp450.000/hari), 0,5% (> Rp450.000 s.d. Rp2.500.000/hari), > Rp2.500.000/hari → tarif Pasal 17 × 50%; pegawai tetap memakai TER bulanan kategori A/B/C dengan rekonsiliasi Desember. BPJS Kesehatan PPU 5% (4% pemberi kerja + 1% pekerja), ceiling Rp12.000.000, dasar = gaji pokok + tunjangan tetap. BPJS Ketenagakerjaan (JHT 2%+3,7%; JKK 0,24–1,74%; JKM 0,3%; JP 1%+2% ceiling Rp10.547.000; JKP 0,22% + rekomposisi). **Tarif & ceiling wajib terkonfigurasi per periode, bukan hardcode; honor guru non-ASN NUANCED (open item).**
8. **Payment gateway SPP (Topik 8) VALID** — QRIS MDR 0,7% reguler / 0,6% kategori pendidikan; VA Midtrans ±Rp4.000 vs Xendit ±Rp13.000 per transaksi; e-wallet 1,5–5%; kartu 2,9% + Rp2.000; produk recurring/subscription tersedia di kedua vendor. Syarat merchant & posisi negeri/swasta NUANCED (KYC belum diverifikasi; isi Permendikbud 44/2012 & 75/2016 belum diverifikasi) → sekolah negeri diposisikan "pencatatan iuran komite/transparansi", SPP dominan swasta.
9. **Depresiasi aset (Topik 9) VALID** — garis lurus PSAK 16: beban tahunan = (harga perolehan − nilai sisa) ÷ umur manfaat (tahun). Kategori aset sekolah & umur manfaat default = REKOMENDASI konfigurasi; ketentuan fiskal penyusutan open item.
10. **Performa (Topik 10) VALID** — Core Web Vitals (web.dev): LCP ≤ 2,5 detik, INP ≤ 200 ms, CLS ≤ 0,1 pada p75 mobile & desktop (INP menggantikan FID, stabil 2024); pola PWA/service worker MDN (manifest + cache berversi + offline). Monolith modular (NestJS+PostgreSQL) cukup untuk 500–3.000 user/sekolah; beban puncak = ujian online; optimasi utama di frontend.
11. **Permendikbud 44/2012 & 75/2016 (Topik 11) MENDUKUNG posisi prd04 §13 Q14** — Pasal 9(1) 44/2012 melarang satuan pendidikan DASAR negeri memungut biaya; pungutan (wajib/mengikat) hanya boleh di satuan pendidikan masyarakat/swasta dengan syarat (perencanaan investasi/operasi, musyawarah rapat komite, rekening atas nama sekolah, ≥20% dana untuk peningkatan mutu, transparan & dipertanggungjawabkan); sumbangan (sukarela/tidak mengikat) boleh negeri & swasta; larangan pungutan ke siswa tidak mampu, dikaitkan persyaratan akademik, komite dilarang pungut; sanksi pengembalian penuh. Komite (75/2016) menghimpun bantuan/sumbangan, bukan pungutan. **Nuansa:** 44/2012 tekstual untuk pendidikan DASAR; SMA/SMK tidak tercakup larangan Pasal 9 secara tekstual — prinsip tetap diterapkan lintas jenjang. Posisi "negeri = iuran komite/transparansi; SPP dominan swasta" **DIDUKUNG (VALID)**.
12. **Struktur TER PPh 21 PMK 168/2023 (Topik 12) terkonfirmasi** — TER bulanan kategori A/B/C berdasarkan PTKP (A: 0% s.d. Rp5,4 jt, naik bertahap 0,25–1%, hingga 34% > Rp1,4 M; B: 0% s.d. Rp6,2 jt; C: 0% s.d. Rp6,6 jt); TER harian pegawai tidak tetap (0% ≤ Rp450rb/hari; 0,5% s.d. Rp2,5 jt; > Rp2,5 jt → Pasal 17 × 50%); rekonsiliasi Desember tarif Pasal 17 (UU HPP); honorarium bukan pegawai = DPP 50% × bruto × Pasal 17 (PER-32/PJ/2015, PMK 168/2023); honor guru PNS = final 15% (PP 80/2010); guru honorer = peserta BPJS TK Penerima Upah (iuran JKK/JKM pemberi kerja = objek PPh 21). Tabel penuh ambil dari PDF PMK 168/2023 saat build; juknis BOS/APBD per tahun ajaran tetap open item.
13. **KYC payment gateway (Topik 13) terkonfirmasi dari dokumen vendor** — Midtrans (KTP pemilik/penanggung jawab, NPWP badan, akta + perubahan, dokumen pengesahan; QRIS: SIUP/NIB/akta/SK Kemenkumham; web/aplikasi aktif; tanpa batas transaksi) & Xendit (akta terbaru termasuk Akta Pengangkatan Direktur Terakhir, KTP pengurus, NPWP, rekening bank). Kontekstualisasi yayasan: Akta Pendirian Yayasan + SK Kemenkumham (AHU) + NPWP yayasan + NIB + rekening atas nama yayasan. Waktu aktivasi 1–7+ hari kerja **TIDAK TERVERIFIKASI** dari dokumen resmi — konfirmasi vendor saat fitur diaktifkan.
14. **Ketentuan fiskal penyusutan (Topik 14) terkonfirmasi** — PMK 72/2023 (perubahan PMK 249/2008): kelompok harta berwujud bukan bangunan Kelompok 1–4 (4/8/16/20 th; garis lurus 25%/12,5%/6,25%/5%, saldo menurun 50%/25%/12,5%/10%), bangunan permanen 20 th (5%), tidak permanen 10 th (10%); default Kelompok 3 (16 th) untuk harta tidak tercantum di lampiran. Relevansi: yayasan nirlaba kondisional (konsultasi fiskal); laporan internal tetap PSAK 16.
15. **MA (Madrasah Aliyah) & "sederajat" (Topik 15) = ekosistem berbeda** — MA di bawah Kemenag (Ditjen Pendis/KSKK Madrasah): kurikulum KMA 347/2022 → KMA 450/2024 (bukan Permendikdasmen), data = EMIS (bukan Dapodik), rapor = RDM (bukan e-Rapor), NSM (bukan NPSN). Melayani MA = biaya penyesuaian non-trivial; rekomendasi: MVP = SMA/SMK, jangan janjikan MA; validasi kebutuhan MA riil sebelum ekspansi (**Q20 tetap OPEN**).
16. **Konkurensi ujian & rate-limit (Topik 16) DITETAPKAN sebagai nilai awal** — OWASP DoS Cheat Sheet: rate limit per IP/kunci, load limit, connection timeout; hindari lockout permanen per IP (bisa disalahgunakan), gunakan penundaan bertahap/per-akun. Baseline konkurensi 500 siswa serentak/shift; puncak submit 5 menit terakhir ±100–200 req/detik; semua nilai rate-limit terkonfigurasi & dikalibrasi load test k6 (prd04 §13 Q4/Q7).

## 2. Temuan per Topik

### Topik 1 — UU PDP (No. 27/2022): validasi G12 & G13

**Status: VALID / CONFIRMED (kedua klaim), dengan nuansa di detail.**

**Fakta tersumber:**

- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi disahkan dan diundangkan 17 Oktober 2022 (LN 2022 No. 196, TLN 6820), status **Berlaku** — dikonfirmasi dari peraturan.go.id dan peraturan.bpk.go.id (metadata resmi; halaman BPK diakses 6 Agustus 2026).
- **Data anak = data pribadi spesifik.** Pasal 4 ayat (2) huruf e UU PDP memasukkan "data anak" ke dalam daftar data pribadi spesifik (bersama data kesehatan, biometrik, genetika, catatan kejahatan, data keuangan pribadi). (Teks lengkap terkonsolidasi, DataHukum; konfirmasi Wikipedia "Data pribadi spesifik" yang mengutip Pasal 4.)
- **Pemrosesan data anak wajib persetujuan orang tua/wali.** Pasal 25: "(1) Pemrosesan Data Pribadi anak diselenggarakan secara khusus. (2) Pemrosesan Data Pribadi anak ... wajib mendapat persetujuan dari orang tua anak dan/atau wali anak sesuai dengan ketentuan peraturan perundang-undangan." → **G13 VALID.**
- **Retensi.** Pasal 16 ayat (2) huruf g: "Data Pribadi dimusnahkan dan/atau dihapus setelah masa retensi berakhir atau berdasarkan permintaan Subjek Data Pribadi, kecuali ditentukan lain oleh peraturan perundang-undangan." Pasal 42 (wajib mengakhiri pemrosesan bila masa retensi tercapai / tujuan tercapai / permintaan subjek), Pasal 43 (wajib menghapus bila tidak lagi diperlukan, penarikan persetujuan, permintaan subjek, diperoleh melawan hukum), Pasal 44 (wajib memusnahkan bila masa retensi habis berdasarkan jadwal retensi arsip, dsb). → **G12 VALID.**
- **Nuansa penting (tidak ada di prd03):**
  - UU PDP **tidak menetapkan angka retensi** (mis. 5 tahun). Jangka waktu dikelola oleh pengendali (dengan kewajiban menginformasikan "jangka waktu retensi dokumen" kepada subjek — Pasal 21 ayat (1) huruf d). Angka "5 tahun" di prd03 adalah keputusan desain, dan konsisten dengan praktik arsip akademik/Dapodik (sumber sekunder Seqolah menyebut juknis Dapodik mengharuskan penyimpanan minimal 5 tahun) — tapi ini bukan amanat pasal UU.
  - Consent bukan satu-satunya dasar pemrosesan: Pasal 20 ayat (2) mencantumkan 6 dasar sah, termasuk "pemenuhan kewajiban hukum" (huruf c — relevan untuk pelaporan Dapodik) dan "pelaksanaan tugas dalam rangka kepentingan umum, pelayanan publik" (huruf e). Jadi mekanisme consent orang tua (G13) terutama diperlukan untuk pemrosesan data anak di luar kewajiban hukum/inti operasional.
  - Kewajiban pengendali yang paling relevan untuk openlms: Pasal 21 (informasi kepada subjek), Pasal 22 (persetujuan tertulis/terekam, format mudah dipahami, bahasa sederhana, batal demi hukum jika tidak sesuai), Pasal 24 (wajib menunjukkan bukti persetujuan), Pasal 27-28 (pemrosesan terbatas, spesifik, sah, transparan, sesuai tujuan), Pasal 30 (perbaikan data ≤3x24 jam), Pasal 31 (wajib merekam seluruh kegiatan pemrosesan — relevan untuk audit trail G14), Pasal 32 (akses subjek ≤3x24 jam), Pasal 34 (penilaian dampak untuk risiko tinggi, termasuk data spesifik skala besar), Pasal 35-39 (keamanan data), Pasal 40 (hentikan pemrosesan ≤3x24 jam setelah penarikan persetujuan), Pasal 46 (notifikasi kegagalan pelindungan data ≤3x24 jam ke subjek & lembaga), Pasal 53 (wajib menunjuk pejabat/petugas fungsi PDP untuk pemrosesan pelayanan publik dan/atau data spesifik skala besar — Putusan MK 151/PUU-XXII/2024 memaknai "dan" menjadi "dan/atau").
  - Sanksi: administratif (Pasal 57) berupa peringatan tertulis, penghentian sementara, penghapusan/pemusnahan data, denda administratif paling tinggi **2% dari pendapatan tahunan/penerimaan tahunan**. Pidana (Pasal 67-68): memperoleh/mengumpulkan/mengungkapkan/menggunakan data pribadi bukan miliknya → penjara 4-6 tahun dan denda Rp4-6 miliar; **diubah oleh UU No. 1 Tahun 2026 tentang Penyesuaian Pidana (LN 2026 No. 1, berlaku 2 Januari 2026)** menjadi denda "kategori IV"; korporasi denda maksimal 10x (Pasal 70). DataHukum menyajikan teks terkonsolidasi dengan perubahan ini; BPK metadata peraturan.go.id mengonfirmasi UU tersebut.
  - Masa penyesuaian 2 tahun (Pasal 74) sejak diundangkan → berakhir 17 Oktober 2024. Status "peraturan pelaksana belum tersedia" di BPK; PP pelaksana masih berjalan.
  - **UU PDP mengatur data biometrik sebagai data spesifik (Pasal 4 ayat (2) huruf b)** — ini langsung relevan untuk rencana proctoring webcam prd02 (perlu consent eksplisit & evaluasi proporsionalitas).

**Implikasi desain openlms:**
- Skema `ParentalConsent` (prd03 §5) dibenarkan, dan harus menyimpan bukti persetujuan (timestamp, versi dokumen, salinan) untuk memenuhi Pasal 22 & 24 — jangan hanya checkbox.
- Kebijakan retensi harus punya **jadwal retensi arsip eksplisit** (per kategori data), alur arsip → hapus/musnah otomatis, dan pengecualian untuk kewajiban hukum (mis. verifikasi ijazah/Dapodik). Jangan hardcode "5 tahun" sebagai aturan UU; jadikan nilai konfigurasi aplikasi (single-school) dengan default yang disepakati.
- `AuditLog` generik (G14) didukung kuat oleh Pasal 31 (perekaman seluruh pemrosesan) — bukan hanya nilai & pembayaran.
- Fitur proctoring webcam (prd02, tahap lanjut) memerlukan consent eksplisit orang tua/wali karena data biometrik, dan kemungkinan DPIA (Pasal 34) — sebaiknya tetap ditunda sampai fondasi hukum & teknis matang.
- Karena sanksi bisa menyasar korporasi (penyedia SaaS) juga, kepatuhan PDP bukan hanya "tanggung jawab sekolah" — kontrak pemrosesan data dengan sekolah perlu eksplisit (Pasal 51).

> **Catatan single-school [owner-v4.2]:** klausa 'penyedia SaaS' relevan HANYA bila aplikasi dikelola pihak ketiga untuk sekolah (prd04 §13 Q1) — BUKAN SaaS multi-tenant; tidak ada billing lintas sekolah; kontrak pemrosesan data (Pasal 51) tetap disarankan bila penyedia mengelola data.

**Sumber Topik 1 (diakses 6 Agustus 2026):**
- UU No. 27 Tahun 2022 (metadata & status) — https://peraturan.go.id/id/uu-no-27-tahun-2022
- UU No. 27 Tahun 2022 (halaman resmi BPK, status, abstrak, uji materi MK) — https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022
- Teks lengkap terkonsolidasi UU PDP (Pasal 4, 16, 20-25, 42-46, 57, 65-74; amendemen UU 1/2026) — https://www.datahukum.com/peraturan/UU_27_Tahun_2022.html
- JDIH Komdigi (kutipan Pasal data anak) — https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang+nomor+27+tahun+202
- Wikipedia "Data pribadi spesifik" (mengutip Pasal 4 UU PDP) — https://id.wikipedia.org/wiki/Data_pribadi_spesifik
- Telkom CSIRT (interpretasi Pasal 42-44 retensi) — https://csirt.telkom.co.id/posts/awareness/data-privacy-handling-sensitive-information

### Topik 2 — Dapodik & ANBK: validasi G4

**Status: VALID / CONFIRMED (asumsi akses API terbatas) dengan nuansa; sebagian detail ANBK NUANCED/PARTIAL.**

**Fakta tersumber:**

- **Apa itu Dapodik:** Data Pokok Pendidikan adalah sumber data utama pendidikan nasional yang mencatat satuan pendidikan, peserta didik, pendidik, dan sarana-prasarana; dipakai untuk penyaluran BOS, tunjangan profesi guru, dan rapor pendidikan (Wikipedia "Data Pokok Pendidikan", mengutip artikel resmi ditpsd.kemdikbud.go.id; pranala resmi: dapo.kemdikbud.go.id, data.kemdikbud.go.id, referensi.data.kemdikbud.go.id, dapodik.vokasi.kemdikbud.go.id). Situs `dapodik.kemdikbud.go.id` dan `dapo.kemdikbud.go.id` tidak dapat diakses langsung dari environment riset ini (transport error) → keberadaan & kontennya TIDAK TERVERIFIKASI secara langsung, tetapi keberadaannya dikonfirmasi oleh pranala resmi di Wikipedia dan situs Helpdesk Dapodik.
- **API resmi untuk pihak eksternal?** Jawaban berlapis:
  1. **Ada "Web Service Dapodik"** — REST API yang disediakan di dalam aplikasi Dapodik (desktop) sekolah; aksesnya **lokal** (localhost), dengan token per-aplikasi (Bearer) yang dibuat di menu Pengaturan aplikasi Dapodik oleh operator sekolah. Dikonfirmasi dari Helpdesk Dapodik resmi Kemendikdasmen (helpdesk.pauddasmen.id): "Pada aplikasi dapodik Web Service ... Setiap aplikasi yang sudah ditambahkan memiliki masing-masing token berbeda". Pola ini dipakai, misalnya, oleh aplikasi e-Rapor untuk menarik dan mengirim data Dapodik (sumber: naikpangkat.com; dan dokumen resmi BBPMP Jatim).
  2. **Tidak ada API publik terpusat** untuk vendor sebarang. Integrasi data resmi (contoh: integrasi hasil PPDB dengan database Dapodik) dilakukan melalui **surat permohonan** ke Pusdatin Kemdikbudristek (halaman pelayanan.data.kemdikbud.go.id memuat "Contoh Format Surat Permohonan integrasi hasil PPDB dengan Database Dapodik"). SSO Dapodik (untuk mitra pasar daring) dinyatakan **deprecated** di dokumentasi API SIPLah; terdapat SSO SDS untuk mitra terdaftar.
  3. Implikasi: untuk aplikasi sekolah (single-school), integrasi real-time massal tidak layak tanpa kerja sama resmi/izin; **ekspor file terformat (CSV/Excel) adalah titik masuk yang realistis**, persis seperti kesimpulan prd03 §4.4. Opsi web service per-sekolah (token per sekolah) bisa dipertimbangkan sebagai jalur lanjutan per-sekolah.
- **ANBK (Asesmen Nasional Berbasis Komputer):** program evaluasi Kemdikbud dengan 3 instrumen — AKM (literasi membaca & numerasi), Survei Karakter, Survei Lingkungan Belajar; moda pelaksanaan online dan semi-online; satuan pendidikan dapat melaksanakan mandiri atau menumpang (situs resmi anbk.kemdikbud.go.id, arsip Wayback 12 Des 2024). → klaim prd03 bahwa "siswa ikut ANBK" dan struktur data perlu kompatibel adalah masuk akal.
- **Detail "peserta ANBK diambil dari Dapodik" TIDAK TERVERIFIKASI** pada riset ini (halaman POS ANBK/pusmendik tidak dapat diakses; upaya via Wayback 404). Secara praktik dikenal luas bahwa penentuan peserta berbasis data Dapodik, tetapi harus diverifikasi dari POS ANBK resmi sebelum openlms menjanjikan fitur ekspor peserta.

**Implikasi desain openlms:**
- Pertahankan rencana prd03 §4.4: `DataExportLog`, ekspor CSV/Excel terformat dengan kolom kunci referensi Dapodik (NISN siswa, NIK, NPSN sekolah, NUPTK/NRK guru, kode rombel/mapel per referensi Kemdikbud). Jangan janjikan "integrasi real-time Dapodik" ke sekolah pilot.
- Pastikan entitas `Student`, `Class`, `Enrollment` menyimpan NISN/NPSN (bukan wajib saat input manual, tapi wajib diisi sebelum ekspor/import ANBK).
- Validasi lanjutan: dapatkan POS ANBK terbaru dan juknis Dapodik untuk memetakan format kolom ekspor secara presisi (disarankan riset fase desain oleh openteam-researcher dengan target URL pos anbk resmi yang saat ini tidak dapat diakses dari environment ini).

**Sumber Topik 2 (diakses 6 Agustus 2026):**
- Wikipedia "Data Pokok Pendidikan" (definisi & pranala resmi) — https://id.wikipedia.org/wiki/Data_Pokok_Pendidikan
- Helpdesk Dapodik resmi — Web Services Lokal — https://helpdesk.pauddasmen.id/help/en-us/15-pengaturan-aplikasi-dapodik/39-web-services-lokal
- Pelayanan Data Pusdatin (format surat permohonan integrasi) — https://pelayanan.data.kemdikbud.go.id/
- Dokumentasi API SIPLah (SSO Dapodik deprecated) — https://siplah.kemdikbud.go.id/api/siplah/docs/references/sso-api
- Situs resmi ANBK (arsip Wayback, 12 Des 2024) — https://web.archive.org/web/20241212220412/https://anbk.kemdikbud.go.id/
- Panduan Web Service untuk e-Rapor (sekunder) — https://naikpangkat.com/cara-setting-web-service-dan-ambil-data-dapodik-pada-e-rapor-kurikulum-merdeka/
- TIDAK TERVERIFIKASI: dapodik.kemdikbud.go.id, dapo.kemdikbud.go.id, ditpsd.kemdikbud.go.id (transport error dari environment riset)

### Topik 3 — Kurikulum Merdeka: P5, Asesmen Diagnostik, e-Rapor, CP/ATP

**Status: VALID / CONFIRMED (G2 & G3), plus konteks regulasi terbaru yang memperkuat urgensi.**

**Fakta tersumber:**

- **Status nasional:** Permendikbudristek No. 12 Tahun 2024 (ditetapkan 25 Maret 2024, berlaku 26 Maret 2024, BN 2024 No. 172) menetapkan Kurikulum Merdeka sebagai kerangka dasar dan struktur kurikulum nasional untuk PAUD, pendidikan dasar, dan menengah — sumber: halaman resmi BPK; konfirmasi dari kurikulum.kemdikbud.go.id (berita "Telah Terbit Peraturan Mendikbudristek No.12 Tahun 2024"; arsip Wayback 3 Jan 2025) dan Disdik Grobogan ("Pemerintah menetapkan secara resmi Kurikulum Merdeka menjadi kerangka dasar dan struktur kurikulum untuk seluruh satuan pendidikan"). Sebelumnya (2022/2023-2023/2024) Kurikulum Merdeka adalah salah satu opsi (Kepmendikbudristek 56/M/2022) — jadi klaim "P5 komponen wajib" berlaku penuh sejak kurikulum ini menjadi kurikulum nasional. **Diubah oleh Permendikdasmen No. 13 Tahun 2025** (berlaku 15 Juli 2025, BN 2025 No. 503) — perubahan teknis atas Permen 12/2024; kerangka Kurikulum Merdeka tetap (sumber: halaman BPK; catatan: transisi bertahap, target seluruh satuan pendidikan menerapkan pada tahun pelajaran 2027/2028 — sumber sekunder).
- **G2 — P5 (Projek Penguatan Profil Pelajar Pancasila):** komponen struktur kurikulum yang sifatnya projek; **bukan mata pelajaran**; alokasi waktu terpisah dari intrakurikuler, sekitar 20-30% dari total JP per tahun (sumber: Panduan Pengembangan Projek Penguatan Profil Pelajar Pancasila BSKAP edisi revisi 2024 — direferensikan di SlideShare/laporan sekolah; jurnal Basicedu menyebut 20%; laporan penelitian menyebut 20-30%); modul projek terpisah dari modul ajar; **penilaian dan rapor P5 terpisah dari rapor mapel** (sumber: laporan pelaksanaan P5 SMAN 1 Jasinga yang mengutip panduan BSKAP; BBPMP Jatim: "Pemanfaatan e-Rapor Kurikulum Merdeka ini memiliki dua produk... Kedua, rapor untuk nilai P5"). → **G2 VALID.**
- **G3 — Asesmen Diagnostik:** bagian dari perencanaan pembelajaran dan asesmen Kurikulum Merdeka; dilakukan **di awal pembelajaran / awal tahun ajaran** untuk memetakan kebutuhan; dua jenis: **kognitif** (kemampuan awal terhadap kompetensi/materi prasyarat) dan **non-kognitif** (kondisi psikologis, emosional, sosial, gaya belajar); hasilnya dipakai merancang pembelajaran terdiferensiasi (teaching at the right level), bukan untuk nilai sumatif (sumber: detik edu, kejarcita, melintas.id, simpkb modul asesmen PPB). → **G3 VALID.**
- **e-Rapor Kurikulum Merdeka:** aplikasi resmi Kemdikbud per jenjang (SD/SMP/SMA/SMK), diinstal lokal di sekolah, **terintegrasi dengan Dapodik via web service** (unduh data siswa/guru/rombel; kirim kembali nilai), menghasilkan **dua produk rapor**: (1) rapor hasil belajar mapel — nilai TP/sumatif, deskripsi, ekstrakurikuler, prestasi, catatan wali kelas; (2) rapor P5 — tema, dimensi, elemen, sub-elemen, target capaian (sumber: ditpsd.kemdikbud.go.id artikel "e-Rapor Kurikulum Merdeka Dikembangkan Sesederhana Mungkin"; BBPMP Jatim; Direktorat SMA — sma.kemendikdasmen.go.id/erapor "aplikasi e-Rapor SMA versi 2025 ... terintegrasi dengan Dapodik"; ditsd.kemendikdasmen.go.id/hal/e-raport). → klaim prd02 §4.1 "e-Rapor sesuai format rapor Kurikulum Merdeka" VALID.
- **CP/ATP:** Capaian Pembelajaran (CP) = deskripsi kompetensi & lingkup materi yang harus dikuasai pada akhir fase; Tujuan Pembelajaran (TP) = jabaran spesifik menuju CP; Alur Tujuan Pembelajaran (ATP) = rangkaian sistematis & logis TP dalam satu fase, berfungsi seperti silabus (sumber: Wikipedia "Kurikulum Merdeka" + situs kurikulum.kemdikbud.go.id). → klaim prd02 §4.1 (manajemen kurikulum selaras "capaian pembelajaran, ATP") VALID.

**Implikasi desain openlms:**
- Modul rapor v2 (prd02 §4.1) harus dirancang dengan dua track terpisah: **rapor mapel** (TP/sumatif + deskripsi + ekskul + prestasi + catatan wali) dan **rapor P5** (dimensi/elemen/sub-elemen + target capaian) — bukan satu rapor gabungan sederhana.
- Dukungan **asesmen diagnostik** sebagai jenis asesmen tersendiri (kognitif & non-kognitif), dengan hasil berupa pemetaan/kelompok belajar, bukan nilai akhir — membedakannya dari ujian sumatif yang sudah dirancang.
- Entitas kurikulum: dukungan **CP per fase, TP, dan ATP** sebagai struktur referensi mapel (fase E-F untuk SMA/SMK).
- Karena sekolah tetap wajib memakai e-Rapor resmi untuk pelaporan ke Kemdikbud, openlms sebaiknya mendukung **ekspor nilai ke format e-Rapor/import dari Dapodik** daripada mencoba menggantikan aplikasi e-Rapor.
- Catatan untuk prd03 §2.1 G2/G3 yang di-prioritaskan "sedang": dengan berlakunya Permen 12/2024 secara nasional, dukungan P5 & rapor terpisah bukan lagi nice-to-have untuk sekolah Kurikulum Merdeka — pertimbangkan naik prioritas bila target sekolah pilot sudah menerapkan Kurikulum Merdeka (hampir semua).

**Sumber Topik 3 (diakses 6 Agustus 2026):**
- Permendikbudristek 12/2024 (resmi BPK) — https://peraturan.bpk.go.id/Details/281847/permendikbudriset-no-12-tahun-2024
- Permendikdasmen 13/2025 (resmi BPK) — https://peraturan.bpk.go.id/Details/322506/permendikdasmen-no-13-tahun-2025
- Situs Kurikulum Merdeka (arsip Wayback, 3 Jan 2025) — https://web.archive.org/web/20250103220919/https://kurikulum.kemdikbud.go.id/
- Wikipedia "Kurikulum Merdeka" (CP/TP/ATP, dasar hukum) — https://id.wikipedia.org/wiki/Kurikulum_Merdeka
- Artikel resmi Ditjen SD — https://ditpsd.kemdikbud.go.id/artikel/detail/e-rapor-kurikulum-merdeka-dikembangkan-sesederhana-mungkin (pranala muncul di hasil pencarian; halaman tidak dibuka langsung karena domain ditpsd transport error → konten dikonfirmasi lewat ringkasan hasil pencarian Brave + kutipan BBPMP Jatim)
- BBPMP Jatim — beda e-Rapor KM vs K13 — https://lpmpjatim.kemdikbud.go.id/site/detailpost/beda-e-rapor-kurikulum-merdeka-dengan-e-rapor-kurikulum-2013-yang-lalu
- e-Rapor SMA (Direktorat SMA) — https://sma.kemendikdasmen.go.id/erapor
- Asesmen diagnostik (detik edu) — https://www.detik.com/edu/sekolah/d-7450819/asesmen-diagnostik-pengertian-jenis-dan-contohnya
- Jurnal (alokasi waktu P5 ~20%) — https://jbasic.org/index.php/basicedu/article/download/2714/pdf/10200

### Topik 4 — Multi-tenant SaaS + PostgreSQL Row-Level Security

> **Catatan single-school [owner-v4.2]:** kesimpulan RLS dipertahankan sebagai defense-in-depth opsional TANPA dimensi tenant/school_id; aplikasi melayani SATU sekolah; otorisasi dikontrol permission + scope RBAC [prd04 §4.4, §6].

**Status: VALID / CONFIRMED (pola shared schema + tenant_id + RLS adalah pola umum & terdokumentasi resmi).**

**Fakta tersumber (dokumentasi resmi PostgreSQL 18, halaman "5.9. Row Security Policies"):**

- RLS membatasi baris yang bisa dibaca/diubah per-user melalui **policy**; diaktifkan dengan `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Tanpa policy, berlaku **default-deny** (tidak ada baris yang terlihat/dapat diubah).
- Policy bisa spesifik per perintah (SELECT/INSERT/UPDATE/DELETE), per role, atau keduanya; ekspresi `USING` (baris yang terlihat) dan `WITH CHECK` (baris yang boleh dimodifikasi).
- Policy **permissive** digabung dengan OR; policy **restrictive** dengan AND.
- **Superuser dan role dengan atribut `BYPASSRLS` selalu melewati RLS; pemilik tabel biasanya juga melewati RLS** — kecuali `ALTER TABLE ... FORCE ROW LEVEL SECURITY`.
- **Referential integrity (constraint FK/unique) selalu melewati RLS** → potensi "covert channel" kebocoran informasi; perlu hati-hati dalam desain skema.
- **Policy dengan sub-SELECT/fungsi bisa terkena race condition** (contoh nyata didokumentasikan: transaksi UPDATE + SELECT FOR UPDATE pada tabel referensi) → perlu `FOR SHARE`/kunci atau desain yang menghindari baca lintas tabel di policy.
- Backup: set `row_security = off` agar query yang terfilter policy **error** (bukan diam-diam menghilangkan baris).
- Trade-off yang lazim (analisis — fakta teknis dari docs + praktik industri):
  - Shared DB + shared schema + tenant_id + RLS (pola umum yang divalidasi): biaya operasional & migrasi terendah, satu skema — cocok untuk aplikasi sekolah (single-school); risiko: kesalahan query tanpa filter scope, noise antar-role, perlu disiplin & testing isolasi scope.
  - Alternatif database-per-sekolah / schema-per-sekolah: isolasi lebih kuat tapi biaya & kompleksitas operasional jauh lebih tinggi; tidak direkomendasikan untuk tahap awal openlms.
  - RLS adalah **lapisan pertahanan kedua** — guard aplikasi (RBAC + validasi scope) tetap wajib (defense in depth), persis asumsi prd01 §6.5 dan G6 (testing isolasi scope).

**Implikasi desain openlms:**
- Sesuai single-school: shared schema TANPA school_id; RLS opsional berbasis scope RBAC; FORCE RLS/hindari sub-SELECT/backup row_security=off tetap berlaku hanya bila RLS diaktifkan — namun tambahkan:
  - **FORCE ROW LEVEL SECURITY** pada tabel bila layanan DB memakai role pemilik untuk query aplikasi (agar pemilik tabel tidak bypass).
  - **Jangan** membuat policy dengan sub-SELECT ke tabel lain tanpa mitigasi race condition (dokumentasi resmi memberi contoh kegagalan).
  - Tes isolasi otomatis (bagian G6): uji bahwa user scope SENDIRI/KELAS tidak bisa melihat data di luar scope di setiap tabel.
  - Prosedur backup dengan `row_security=off` untuk memastikan backup lengkap (G8).
- Perhatian: RLS tidak menggantikan validasi aplikasi; kombinasi keduanya adalah yang benar (dan ini memperkuat prioritas G6/G11 prd03).

**Sumber Topik 4 (diakses 6 Agustus 2026):**
- PostgreSQL Documentation — Row Security Policies — https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Catatan single-school [owner-v4.2]:** dokumentasi RLS dipakai sebagai defense-in-depth opsional TANPA dimensi tenant/school_id; aplikasi melayani SATU sekolah; otorisasi dikontrol permission + scope RBAC.

### Topik 5 — Kompetitor & benchmark: Google Classroom, Moodle, WCAG

**Status: VALID (fakta kompetitor), NUANCED untuk G22 (Google Classroom kini punya plagiarism detection premium) dan G23 (analitik baru/segera hadir).**

**Fakta tersumber:**

- **Google Classroom** (halaman resmi edu.google.com, versi Indonesia, diakses 6 Agustus 2026):
  - 150 juta pengguna aktif di seluruh dunia (klaim resmi Google).
  - Fitur: tugas, rubrik, umpan balik real-time, integrasi Google Meet, laporan keaslian/originality reports ("membandingkan tugas siswa dengan miliaran halaman web dan lebih dari 40 juta buku"), integrasi SIS via API, ekspor log ke BigQuery.
  - **Analisis Classroom "segera hadir"** (classroom analytics) — artinya analitik pembelajaran masih berkembang/terbatas pada edisi tertentu.
  - Aksesibilitas: Google memiliki halaman komitmen aksesibilitas; tidak ada pernyataan WCAG spesifik di halaman produk yang diambil (perlu pengecekan lanjutan), tetapi ekosistem Google for Education umumnya mengikuti standar aksesibilitas.
  - **Nuansa untuk G22:** klaim prd03 "tidak ada fitur deteksi kemiripan" sudah tidak sepenuhnya akurat untuk tugas — Classroom punya originality reports, namun bersifat premium (edisi berbayar) dan untuk tugas, bukan jawaban ujian/esai dalam platform.
- **Moodle** (MoodleDocs via Wayback, diakses 6 Agustus 2026):
  - Open-source LMS; fitur luas: assignment, quiz, grading, badges, plugin ecosystem, dsb. (halaman Features tidak dibuka langsung; deskripsi ini dari MoodleDocs navigasi & pengetahuan umum — ditandai).
  - **Aksesibilitas: Moodle mengikuti WCAG 2.1** (target & laporan konformansi VPAT; pengumuman Des 2020 "Moodle LMS achieves WCAG 2.1 AA accessibility compliance"), plus ATAG 2.0, ARIA 1.1, Section 508, EAA. → klaim prd03 G15 bahwa "Moodle sudah punya standar aksesibilitas WCAG AA" **VALID**.
- **WCAG** (W3C WAI, diakses 6 Agustus 2026): standar internasional; versi terbaru **WCAG 2.2** (Okt 2023); 4 prinsip (perceivable, operable, understandable, robust), 3 level konformansi (A/AA/AAA); EN 301 549 (EAA) saat ini memakai WCAG 2.1; WCAG 2.2 disetujui sebagai ISO/IEC 40500:2025.
- **Analisis diferensiasi (REKOMENDASI, berbasis fakta sumber):**
  - G22 plagiarism: Classroom punya (premium, untuk tugas); Moodle butuh plugin berbayar (mis. Turnitin — tidak diverifikasi langsung). Peluang openlms: deteksi kemiripan **gratis & terpadu** untuk tugas + jawaban esai ujian online.
  - G23 learning analytics: Classroom baru "segera hadir", Moodle punya Learning Analytics (belum diverifikasi langsung). Peluang openlms: analitik berbasis konteks sekolah Indonesia (pola akses materi sebelum ujian, siswa berisiko berdasarkan absensi+nilai — sejalan prd01 §9).
  - G24 kalender terpadu: Classroom terhubung Google Calendar tapi tidak menyatukan domain sekolah (SPP, ekskul, ujian, PKL); Moodle punya kalender kursus tapi tidak terpadu SIS. Peluang openlms: satu kalender per siswa lintas modul.
  - G15 aksesibilitas: baseline prd01 "WCAG AA hanya untuk halaman publik PPDB" **tidak cukup** untuk bersaing — kompetitor menargetkan WCAG 2.1/2.2 AA secara menyeluruh; openlms perlu menetapkan WCAG 2.1/2.2 AA sebagai standar lintas halaman (bertahap).
  - Kelemahan konteks Indonesia (analisis): Classroom tidak punya modul SIS/keuangan/PPDB/e-Rapor/Dapodik yang selaras regulasi; Moodle butuh hosting & administrasi sendiri (beban sekolah non-teknis tinggi). openlms "LMS+SIS+regulasi lokal dalam satu langganan" adalah posisi diferensiasi yang masuk akal.

**Sumber Topik 5 (diakses 6 Agustus 2026):**
- Google Classroom (resmi) — https://edu.google.com/products/classroom/ (dirender versi /intl/ALL_id/)
- Moodle Accessibility (MoodleDocs via Wayback, 23 Apr 2025) — https://web.archive.org/web/20250423223556/https://docs.moodle.org/500/en/Accessibility
- WCAG 2 Overview (W3C WAI) — https://www.w3.org/WAI/standards-guidelines/wcag/
- TIDAK TERVERIFIKASI langsung: docs.moodle.org live (403), halaman fitur Moodle lengkap, pernyataan WCAG Google Classroom spesifik.

### Topik 6 — Keamanan ujian online & absensi QR anti-titip

**Status: VALID / CONFIRMED sebagai praktik industri (ujian online); absensi QR = pola umum yang konsisten (confidence medium, detail geofencing belum terverifikasi dari sumber resmi).**

**Fakta tersumber (vendor/industri proctoring — sumber sekunder dengan otoritas medium, ditandai):**

- **Pendekatan berlapis (multi-layer)** adalah konsensus: gabungan secure/lockdown browser + randomisasi soal & opsi dari bank soal besar + batas waktu + identitas + proctoring + analisis pasca-ujian; tidak ada satu alat yang menutup semua metode kecurangan (Eklavvya, SpeedExam, MyCourseID, Synap).
- **Lockdown browser:** memblokir tab lain, aplikasi, copy-paste, screenshot; vendor mengklaim menghentikan 85-90% kecurangan dasar (Eklavvya), dan kombinasi dengan AI proctoring meningkatkan deteksi ke 90-95%; tetapi **bukan jaminan penuh** — ada teknik bypass dan praktik pengajaran melaporkan kecurangan tetap terjadi walau pakai Respondus (thread r/Professors, anekdotal); vendor lain menegaskan lockdown browser tidak cukup sendirian dan perlu kombinasi AI + proktor manusia (Honorlock). Respondus LockDown Browser adalah produk standar industri ("gold standard", dipakai 2000+ institusi — klaim vendor).
- **Randomisasi:** gunakan bank soal besar sehingga setiap peserta mendapat set soal unik; acak urutan soal dan opsi jawaban; pendekatan LOFT (Linear-On-The-Fly Testing) untuk ujian individual (TestInvite); vendor mengklaim randomisasi mengurangi kecurangan 65-70% dan batas waktu ketat 60-65% (SpeedExam) — angka ini klaim vendor, bukan hasil akademik.
- **Token kode ujian per sesi, autosave, validasi waktu di server, satu akun satu sesi, audit log (tab switch, IP, timestamp)** — desain prd02 §2.2 sejalan praktik ini.
- **Proctoring webcam/biometrik:** data biometrik (wajah) adalah **data pribadi spesifik** UU PDP (Pasal 4 ayat (2) huruf b) → butuh consent eksplisit & DPIA; keputusan prd02 menunda proctoring webcam ke tahap lanjutan adalah tepat.
- **Absensi QR anti-titip:** pola yang lazim: QR **single-use token** (sekali pakai), **expiry pendek** (TTL), **validasi waktu di server** (bukan client), dan **geofencing/GPS radius** sebagai lapisan tambahan. Desain prd02 §3 (QR sekali pakai + expired 5-10 menit + opsi geofencing + fallback manual + validasi waktu server) konsisten dengan pola ini. **Catatan kejujuran:** riset ini tidak berhasil mengakses sumber resmi/akademik spesifik yang memvalidasi geofencing sebagai kontrol anti-titip (search engine rate-limited, situs khusus tidak diakses); statusnya **pola industri yang lazim**, bukan fakta tersumber kuat. Geofencing via GPS dapat di-spoof, sehingga sebaiknya diposisikan sebagai sinyal/penegasan, bukan satu-satunya kontrol; kombinasi single-use + TTL + perangkat/akun terautentikasi lebih kuat.

**Implikasi desain openlms:**
- Ujian online: tetap gunakan desain prd02 (token per sesi, randomisasi paket/opsi, pencatatan pelanggaran tanpa diskualifikasi otomatis, autosave idempotent, sesi tunggal, audit log) — semua terbukti sejalan praktik industri. Tambahkan: bank soal yang cukup besar per mapel agar randomisasi efektif; pertimbangkan LOFT untuk paket ujian besar.
- Absensi QR: pertahankan single-use + TTL + validasi server; jadikan geofencing fitur opsional per-sekolah dengan dokumentasi keterbatasan (spoofing GPS, akurasi di dalam gedung); sediakan fallback manual guru (sudah ada di prd02).

**Sumber Topik 6 (diakses 6 Agustus 2026):**
- Eklavvya — 15 methods anti-cheating — https://www.eklavvya.com/blog/prevent-cheating-online-exams/
- SpeedExam — Online Exam Security Guide — https://www.speedexam.net/blog/online-exam-security-guide/
- TestInvite — Online Exam Cheating Methods & Mitigation — https://www.testinvite.com/dy/en/pages/blog/online-exam-cheating-methods
- Respondus LockDown Browser — https://web.respondus.com/he/lockdownbrowser/
- Honorlock — Is Browser Lockdown Enough? — https://honorlock.com/blog/is-browser-lockdown-software-enough-to-protect-online-exams/
- OctoProctor — Top strategies for cheating on proctored exams — https://octoproctor.com/blog/how-to-cheat-on-a-proctored-exam-top-10
- UU PDP Pasal 4 (data biometrik spesifik) — https://www.datahukum.com/peraturan/UU_27_Tahun_2022.html
- Catatan: sumber resmi spesifik untuk pola QR geofencing tidak dapat diakses pada riset ini → bagian tersebut berstatus TIDAK TERVERIFIKASI/REKOMENDASI.

## 3. Tabel Validasi Klaim PRD

| # | Klaim PRD | Status | Bukti | Implikasi untuk desain openlms |
|---|---|---|---|---|
| G12 | UU PDP mensyaratkan data tidak disimpan lebih lama dari perlu | **VALID/CONFIRMED** (nuansa: tanpa angka spesifik) | UU 27/2022 Pasal 16(2)(g), 42, 43, 44; Pasal 21(1)(d) | Perlu jadwal retensi arsip eksplisit, alur arsip→hapus/musnah, pengecualian hukum; "5 tahun" = konfigurasi, bukan amanat pasal |
| G13 | UU PDP punya ketentuan khusus data anak; perlu persetujuan orang tua/wali | **VALID/CONFIRMED** | Pasal 4(2)(e) (data anak = spesifik); Pasal 25 (wajib persetujuan ortu/wali); Pasal 22 & 24 (bentuk & bukti consent) | `ParentalConsent` wajib menyimpan bukti (timestamp, versi dokumen); consent untuk proses di luar kewajiban hukum (Dapodik) |
| G4 | Integrasi Dapodik/ANBK; akses API Dapodik terbatas untuk pihak eksternal | **VALID/CONFIRMED** (nuansa) | Web Service Dapodik = lokal per sekolah, token per aplikasi (helpdesk resmi); integrasi data via surat permohonan ke Pusdatin; SSO Dapodik deprecated | Strategi ekspor file prd03 benar; simpan NISN/NIK/NPSN/NUPTK; jangan janji API real-time; `DataExportLog` |
| G4 (ANBK) | Struktur data kompatibel untuk ekspor peserta ANBK | **NUANCED/PARTIAL** | ANBK = 3 instrumen, moda online/semi-online (situs resmi); "peserta diambil dari Dapodik" TIDAK TERVERIFIKASI (POS ANBK tak diakses) | Verifikasi POS ANBK sebelum fitur ekspor peserta; pertahankan NISN di skema |
| G2 | P5 komponen wajib, penilaian & rapor terpisah | **VALID/CONFIRMED** | Permen 12/2024 (kurikulum nasional); Panduan P5 BSKAP (bukan mapel, alokasi terpisah ~20-30%, rapor P5 terpisah) | Rapor v2 harus punya dua track: rapor mapel + rapor P5 (dimensi/elemen/sub-elemen) |
| G3 | Asesmen Diagnostik awal semester/tahun, beda dari sumatif | **VALID/CONFIRMED** | Panduan Pembelajaran & Asesmen BSKAP (kognitif & non-kognitif di awal pembelajaran untuk pemetaan kebutuhan) | Dukungan tipe asesmen "diagnostik" dengan output pemetaan/kelompok belajar, bukan nilai akhir |
| prd02 §4.1 | e-Rapor sesuai format Kurikulum Merdeka; CP/ATP | **VALID/CONFIRMED** | e-Rapor resmi (2 produk; integrasi Dapodik); CP/ATP (kurikulum.kemdikbud.go.id) | Ikuti struktur e-Rapor resmi; dukung CP per fase + TP/ATP; ekspor/impor dengan e-Rapor |
| prd01 §6.5 | Shared schema + school_id + RLS | **VALID/CONFIRMED** (dengan caveat) | PostgreSQL docs: RLS, default-deny, BYPASSRLS/owner bypass, FK bypass, race condition policy | Tambah FORCE RLS bila perlu; hindari sub-SELECT di policy; backup dgn row_security=off; tes isolasi (G6) — disesuaikan single-school: tanpa school_id; RLS opsional; tes isolasi scope RBAC |
| prd01 NFR | WCAG AA minimal halaman publik | **VALID (standar) / NUANCED (cakupan)** | WCAG 2.2 (W3C); Moodle & Google target WCAG 2.1 AA | Naikkan target: WCAG 2.1/2.2 AA lintas halaman untuk bersaing (G15) |
| G22 | Tidak ada deteksi kemiripan | **NUANCED** | Google Classroom punya originality reports (premium, untuk tugas); Moodle via plugin | Diferensiasi: deteksi kemiripan gratis + untuk jawaban ujian esai |
| G23 | Tidak ada learning analytics | **CONFIRMED** (gap valid) | Classroom analytics "segera hadir" (resmi); Moodle analytics perlu verifikasi | Peluang: analitik konteks sekolah Indonesia (akses materi, siswa berisiko) |
| G24 | Tidak ada kalender terpadu | **CONFIRMED** (gap valid) | Classroom/Google Calendar & Moodle tidak menyatukan domain operasional sekolah | Kalender per siswa lintas modul (ujian, tugas, ekskul, SPP) sebagai pembeda |
| prd02 §2.2 | Keamanan ujian online (token, randomisasi, lock-browser, autosave, sesi tunggal, proctoring bertahap) | **VALID/CONFIRMED** (praktik industri) | Vendor proctoring: multi-layer, lockdown browser 85-90% kecurangan dasar, randomisasi bank soal, bypass masih mungkin | Pertahankan desain; perbanyak bank soal; proctoring webcam = data biometrik spesifik UU PDP |
| prd02 §3 | QR single-use + expiry + geofencing anti-titip | **CONFIRMED (pola umum) / TIDAK TERVERIFIKASI (detail geofencing)** | Pola single-use/TTL/server-time lazim; sumber resmi spesifik geofencing tidak diakses | Pertahankan; posisikan geofencing sebagai lapisan sinyal (bisa di-spoof), bukan satu-satunya kontrol |

## 4. Beda Tegas: FAKTA TERSUMBER vs REKOMENDASI ANDA

**FAKTA TERSUMBER (dapat ditelusuri ke URL di atas):**
- Pasal-pasal UU PDP tentang data anak, retensi, kewajiban pengendali, dan sanksi (Topik 1).
- Keberadaan Web Service Dapodik lokal per sekolah + token per aplikasi + jalur surat permohonan Pusdatin (Topik 2).
- ANBK = 3 instrumen, moda online/semi-online (Topik 2).
- Permen 12/2024 & Permen 13/2025 (Kurikulum Merdeka nasional), P5 bukan mapel dengan rapor terpisah, asesmen diagnostik kognitif/non-kognitif, e-Rapor 2 produk terintegrasi Dapodik, definisi CP/TP/ATP (Topik 3).
- Perilaku teknis RLS di PostgreSQL (default-deny, bypass, FK, race, backup) (Topik 4).
- Klaim resmi Google Classroom (150 juta pengguna, originality report, analitik "segera hadir") dan klaim resmi Moodle (WCAG 2.1 AA, VPAT) serta standar WCAG (Topik 5).
- Konsensus vendor proctoring: multi-layer, lockdown browser + randomisasi + batas waktu + audit; data biometrik = spesifik UU PDP (Topik 6).
- Tarif PPh 21 TER (PP 58/2023 + PMK 168/2023), BPJS Kesehatan PPU, dan iuran BPJS Ketenagakerjaan dari sumber resmi (peraturan.go.id, BPK, pajak.go.id, BPJamsostek, media) (Topik 7).
- Biaya & mekanisme QRIS (MDR 0,6% pendidikan), VA/e-wallet/kartu di Midtrans & Xendit (Topik 8).
- Rumus depresiasi garis lurus PSAK 16 (Topik 9).
- Ambang Core Web Vitals (LCP/INP/CLS) dari web.dev dan pola service worker dari MDN (Topik 10).
- Isi batang tubuh Permendikbud 44/2012 (larangan pungutan dikdas negeri, syarat pungutan swasta, sumbangan sukarela, larangan & sanksi) dan 75/2016 (komite menghimpun bantuan/sumbangan, dilarang pungut) (Topik 11).
- Struktur TER bulanan A/B/C + contoh baris + TER harian + rekonsiliasi Desember Pasal 17 + DPP 50% honorarium bukan pegawai + honor guru PNS final 15% + guru honorer BPJS TK Penerima Upah (Topik 12).
- Persyaratan KYC merchant Midtrans & Xendit untuk sekolah/yayasan (akta, SK Kemenkumham/AHU, NPWP, NIB, rekening bank, web aktif) (Topik 13).
- Kelompok harta fiskal PMK 72/2023 (Kelompok 1–4, bangunan permanen/tidak permanen, default Kelompok 3) (Topik 14).
- MA = ekosistem Kemenag (EMIS/KMA/RDM/NSM) yang berbeda dari SMA/SMK Kemdikdasmen (Dapodik/Permendikdasmen/e-Rapor/NPSN) (Topik 15).
- OWASP DoS Cheat Sheet: rate limit per IP/kunci, load limit, connection timeout, hindari lockout permanen per IP (Topik 16).

**REKOMENDASI ANDA (analisis berbasis fakta di atas, belum tentu tertulis di sumber):**
- Angka retensi "5 tahun" → konfigurasi aplikasi (single-school) dengan default 5 tahun, bukan klaim UU.
- Strategi ekspor file Dapodik dulu, integrasi web service per-sekolah sebagai jalur lanjutan.
- Rapor v2 dengan dua track (mapel + P5) dan tipe asesmen "diagnostik".
- Tambahan teknis RLS: FORCE RLS, hindari sub-SELECT di policy, backup dengan row_security=off, tes isolasi otomatis (hanya bila diaktifkan sebagai lapisan kedua, tanpa dimensi tenant/school_id).
- Target aksesibilitas WCAG 2.1/2.2 AA lintas halaman (bukan hanya PPDB).
- Diferensiasi G22-G24 dikemas dalam satu narasi "LMS+SIS+regulasi lokal": plagiarism gratis termasuk jawaban ujian, learning analytics konteks Indonesia, kalender terpadu lintas modul.
- Geofencing absensi QR sebagai sinyal pelengkap, bukan kontrol tunggal.
- Slip gaji tiga blok (pendapatan, potongan, beban pemberi kerja informatif); tarif/ceiling pajak & BPJS sebagai konfigurasi per periode; bedakan pegawai tetap/tidak tetap/bukan pegawai (Topik 7).
- Roadmap gateway: manual → QRIS (0,6%) + VA (Midtrans Rp4.000) → recurring opsional; putuskan model fee; posisi negeri = iuran komite/transparansi (Topik 8).
- Inventaris MVP: kode aset unik, lokasi + penanggung jawab, status, riwayat pemeliharaan, opname dengan selisih, booking; umur manfaat default per kategori (Topik 9).
- Optimasi CWV/PWA: code splitting, lazy load, CDN, kompresi WebP/AVIF, gzip/br, pagination API, service worker cache materi; PWA penuh ditunda (Topik 10).

## 5. Riset Lanjutan yang Disarankan (open items)

1. **POS ANBK terbaru** (situs pusmendik/anbk tidak dapat diakses dari environment ini) — untuk memverifikasi klaim "peserta ANBK dari Dapodik" dan format data peserta.
2. **Juknis e-Rapor Kurikulum Merdeka per jenjang (SMA/SMK)** — memetakan struktur kolom rapor mapel & rapor P5 secara presisi.
3. **Kebijakan/PP pelaksana UU PDP** (status di BPK "belum tersedia") dan pembentukan lembaga pengawas — memantau detail turunan (mis. DPIA, DPO, transfer data).
4. **Pernyataan aksesibilitas WCAG spesifik Google Classroom** (halaman produk tidak menyebut WCAG eksplisit).
5. **Sumber resmi/akademik untuk pola QR geofencing anti-titip** (search engine rate-limited pada saat riset).
6. ~~**Tabel TER bulanan lengkap PMK 168/2023**~~ → **SEBAGIAN TERTUTUP (Topik 12):** struktur & contoh baris TER A/B/C terkonfirmasi; tabel penuh (seluruh baris) tetap ambil dari PDF PMK 168/2023 (DJP) saat build — untuk seed konfigurasi presisi (prd04 §13 Q15).
7. ~~**Regulasi honor guru non-ASN**~~ → **SEBAGIAN TERTUTUP (Topik 12):** DPP 50% honorarium bukan pegawai (PER-32/PJ/2015, PMK 168/2023), honor guru PNS final 15% (PP 80/2010), guru honorer = peserta BPJS TK Penerima Upah terkonfirmasi; **juknis BOS/APBD per tahun ajaran tetap open item** — verifikasi saat build.
8. ~~**Isi batang tubuh Permendikbud 44/2012 (pungutan pendidikan dasar) & 75/2016 (komite sekolah)**~~ → **TERTUTUP (Topik 11):** mendukung posisi "negeri = iuran komite/transparansi; SPP dominan swasta" (nuansa: 44/2012 tekstual untuk dikdas; prinsip lintas jenjang) — prd04 §13 Q14 TERTUTUP.
9. ~~**KYC/persyaratan merchant per gateway (Midtrans, Xendit)**~~ → **TERTUTUP (dokumen) (Topik 13):** akta + SK Kemenkumham/AHU + NPWP + NIB + rekening atas nama yayasan + web aktif; waktu aktivasi (1–7+ hari kerja) TIDAK TERVERIFIKASI — konfirmasi vendor saat fitur diaktifkan (prd04 §13 Q16).
10. ~~**Ketentuan fiskal penyusutan (kelompok harta/PMK)**~~ → **TERTUTUP (Topik 14):** PMK 72/2023 Kelompok 1–4 (4/8/16/20 th) + bangunan (20/10 th), default Kelompok 3; laporan internal tetap PSAK 16 (prd04 §13 Q17).
11. **Tabel TER bulanan penuh** (seluruh baris kategori A/B/C) — ambil dari PDF PMK 168/2023 saat build untuk seed konfigurasi presisi (Topik 12; prd04 §13 Q15).
12. **Juknis BOS/APBD honor guru per tahun ajaran** — verifikasi saat build kalkulator payroll (Topik 12; prd04 §13 Q15).
13. **Waktu aktivasi KYC vendor** (klaim 1–7+ hari kerja tidak tersumber resmi) — konfirmasi langsung ke Midtrans/Xendit saat fitur gateway diaktifkan (Topik 13; prd04 §13 Q16).
14. **Validasi kebutuhan MA riil** sebelum ekspansi ke madrasah — EMIS/KMA/RDM/NSM adalah ekosistem Kemenag berbeda; Q20 prd04 tetap OPEN (Topik 15).

---

## 6. Topik Baru (Riset prd04): Payroll, Payment Gateway, Aset, Performa

### Topik 7 — Payroll Sekolah Indonesia (PPh 21 TER, BPJS, slip gaji)

**Status: VALID (tarif & ceiling terkonfirmasi dari sumber resmi); slip gaji = REKOMENDASI; honor guru non-ASN NUANCED.**

**Fakta tersumber:**

- **PPh 21 memakai skema TER (Tarif Efektif Rata-rata):** PP No. 58 Tahun 2023 + PMK No. 168 Tahun 2023; berlaku sejak 1 Januari 2024 dan masih berlaku 2026.
  - TER harian: 0% untuk penghasilan bruto ≤ Rp450.000/hari; 0,5% untuk > Rp450.000 s.d. Rp2.500.000/hari; > Rp2.500.000/hari → tarif Pasal 17 × 50%.
  - Pegawai tetap: TER bulanan kategori A/B/C (sesuai status PTKP) × penghasilan bruto; rekonsiliasi pada masa pajak terakhir (Desember) dengan tarif Pasal 17.
  - **Nuansa:** tabel lengkap TER bulanan ada di PDF PMK 168/2023 (DJP) — open item riset untuk seed konfigurasi presisi.
- **BPJS Kesehatan PPU:** 5% = 4% pemberi kerja + 1% pekerja; **tidak naik per Apr–Agu 2026**; ceiling Rp12.000.000/bulan; dasar perhitungan = gaji pokok + tunjangan tetap (**lembur & tunjangan tidak tetap TIDAK termasuk**).
- **BPJS Ketenagakerjaan** (artikel resmi BPJamsostek, 17 Des 2025): JHT 2% pekerja + 3,7% perusahaan; JKK 0,24%–1,74% perusahaan sesuai tingkat risiko (PP 6/2025); JKM 0,3% perusahaan; JP 1% pekerja + 2% perusahaan (ceiling Rp10.547.000); JKP 0,22% pemerintah + rekomposisi JKK 0,14% + JKM 0,10%.
- **Slip gaji lazim (REKOMENDASI):** blok **Pendapatan** (gaji pokok, tunjangan tetap, tunjangan tidak tetap), blok **Potongan** (PPh 21 TER, BPJS Kes 1%, JHT 2%, JP 1%, iuran/pinjaman), blok **Beban pemberi kerja** (informatif: BPJS Kes 4%, JHT 3,7%, JKK, JKM, JP 2%).
- **Honor guru (NUANCED):** PMK 168/2023 mengatur pegawai tidak tetap/bukan pegawai (TER harian); ketentuan khusus guru non-ASN **belum terverifikasi** — open item.

**Implikasi desain openlms:**
- Tarif & ceiling **HARUS terkonfigurasi per periode** (tabel konfigurasi pajak/BPJS dengan periode berlaku), bukan hardcode.
- Bedakan pegawai tetap / tidak tetap / bukan pegawai — skema pajak berbeda per kategori.
- Kalkulator pajak terisolasi & teruji; proses rekonsiliasi Desember sebagai run terpisah.

**Sumber Topik 7 (diakses 6 Agustus 2026):**
- PP 58/2023 — https://peraturan.go.id/id/pp-no-58-tahun-2023
- PMK 168/2023 (BPK) — https://peraturan.bpk.go.id/Details/286951/pmk-no-168-tahun-2023
- PMK 168 PDF DJP — https://pajak.go.id/sites/default/files/2024-02/PMK%20168%20Tahun%202023%20Tentang%20PPh%20Pasal%2021%20TER.pdf
- BPJamsostek tarif — https://www.bpjsketenagakerjaan.go.id/artikel/18913/artikel-berapa-besaran-iuran-jht,-jkk,-jkm,-jp-dan-jkp
- CNN BPJS Kes — https://www.cnnindonesia.com/edukasi/20260729113218-561-1386089/iuran-bpjs-kesehatan-per-agustus-2026-ini-rinciannya
- Tempo — https://www.tempo.co/ekonomi/berapa-kenaikan-iuran-bpjs-kesehatan-di-2026--1203608
- PP 49/2023 — https://peraturan.go.id/id/pp-no-49-tahun-2023
- Talenta — https://www.talenta.co/blog/cara-hitung-iuran-bpjs-kesehatan-dan-ketenagakerjaan-karyawan/
- Ayo Pajak — https://ayopajak.com/mekanisme-perhitungan-tarif-ter-pph-21/

### Topik 8 — Payment Gateway untuk SPP (QRIS, VA)

**Status: VALID (tarif & mekanisme dari sumber vendor/resmi); syarat merchant & posisi negeri/swasta NUANCED.**

**Fakta tersumber:**

- **QRIS:** MDR 0,7% reguler, **0,6% kategori pendidikan**; QRIS statis & dinamis; QRIS Tap (NFC) sejak Mar 2025; Open API Platform QRIS.
- **Midtrans** (midtrans.com/id/pricing): VA Rp4.000/transaksi; QRIS 0,7%; GoPay 2%; ShopeePay 2%; DANA 1,5%; OVO 1,5%; kartu 2,9% + Rp2.000; minimarket Rp5.000; ada produk "Pembayaran berkala/berulang" (recurring) & Payment Link.
- **Xendit** (xendit.co/id/biaya): VA/OTC Rp9.000 (fee metode) + Rp4.000 (processing) = Rp13.000/transaksi; e-wallet DANA 3%, GoPay 3–5%; kartu 2,9% + Rp2.000 + Rp4.000; produk Subscriptions & Batch Payouts.
- **Syarat merchant (NUANCED):** NIK, NPWP, bukti usaha; sekolah via badan hukum/yayasan; KYC per gateway **belum diverifikasi**.
- **Pungutan negeri vs swasta (NUANCED):** Permendikbud 44/2012 (pungutan pendidikan dasar) & 75/2016 (komite sekolah) berlaku; isi batang tubuh **belum diverifikasi** → untuk sekolah NEGERI posisikan **"pencatatan iuran komite/transparansi"**, SPP dominan swasta.

**Implikasi desain openlms:**
- Roadmap fase: manual → QRIS dinamis/statis (0,6%) + VA (Midtrans Rp4.000) → recurring/subscription opsional.
- Putuskan model fee: (a) sekolah tanggung, (b) ditambahkan ke nominal tagihan, (c) hibrida — open decision §13.
- Pencatatan manual tetap tersedia (gateway tidak wajib); KYC merchant diverifikasi sebelum aktivasi.

**Sumber Topik 8 (diakses 6 Agustus 2026):**
- Midtrans pricing — https://midtrans.com/id/pricing
- Xendit — https://www.xendit.co/id/pricing
- Wikipedia QRIS — https://id.wikipedia.org/wiki/QRIS
- Permendikbud 44/2012 — https://peraturan.go.id/id/permendikbud-no-44-tahun-2012
- Permendikbud 75/2016 — https://peraturan.go.id/id/permendikbud-no-75-tahun-2016

### Topik 9 — Manajemen Aset Sederhana & Depresiasi

**Status: VALID (rumus depresiasi PSAK 16); kategori & praktik inventaris MVP = REKOMENDASI; ketentuan fiskal open item.**

**Fakta tersumber:**

- **Depresiasi garis lurus (PSAK 16):** beban tahunan = (harga perolehan − nilai sisa) ÷ umur manfaat (tahun).
- **Kategori aset sekolah (REKOMENDASI):** gedung/bangunan & ruang, kendaraan, peralatan lab/komputer, meubelair, alat peraga/media, inventaris buku. **Umur manfaat default (konfigurasi):** gedung 20–50 th; kendaraan 8–10; komputer 3–4; meubelair 5–10; alat lab 5–10 (belum diverifikasi dari sumber tunggal resmi).
- **Praktik inventaris MVP:** kode aset unik (QR/barcode), lokasi + penanggung jawab, status, riwayat pemeliharaan, audit stok (opname) dengan selisih tercatat, peminjaman sederhana (booking) dengan status kembali/telat.
- **Open item:** ketentuan fiskal penyusutan (kelompok harta/PMK) bila laporan keuangan butuh pajak.

**Implikasi desain openlms:**
- Rumus garis lurus dihitung **saat laporan** (bukan per bulan) — efisien dan bebas drift; nilai sisa & umur manfaat = konfigurasi per kategori.
- Praktik inventaris MVP selaras entitas `Asset` (kode unik, lokasi, penanggung_jawab, kondisi, status), `AssetBooking`, `AssetMaintenance`, `AssetAudit`.

**Sumber Topik 9 (diakses 6 Agustus 2026):**
- Wikipedia Depresiasi (PSAK 16) — https://id.wikipedia.org/wiki/Depresiasi

### Topik 10 — Performa LMS & Super-App Ringan (Core Web Vitals, PWA)

**Status: VALID (standar CWV & PWA dari sumber resmi); rekomendasi arsitektur = analisis.**

**Fakta tersumber:**

- **Core Web Vitals** (web.dev): LCP ≤ 2,5 detik, INP ≤ 200 ms, CLS ≤ 0,1 pada persentil ke-75 (mobile & desktop); INP stabil 2024 (menggantikan FID).
- **PWA / service worker** (MDN): manifest + service worker; cache berversi; offline.
- **Rekomendasi (analisis):** monolith modular (NestJS+PostgreSQL) cukup untuk 500–3.000 user/sekolah; beban puncak = ujian online (rate limiting, caching baca, autosave idempotent); optimasi utama di frontend (code splitting, lazy load, CDN, kompresi gambar WebP/AVIF, font ringan, service worker cache materi); kompresi respons gzip/br; pagination API.

**Implikasi desain openlms:**
- Target CWV pada p75 mobile+desktop sebagai SLO produk (§7.1).
- PWA minimal di MVP (queue absensi QR + cache materi dasar); PWA penuh ditunda — konsisten keputusan A4-2.

**Sumber Topik 10 (diakses 6 Agustus 2026):**
- Web Vitals — https://web.dev/vitals/
- MDN Service workers — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/CycleTracker/Service_workers

### Topik 11 — Permendikbud 44/2012 (Pungutan & Sumbangan) & 75/2016 (Komite Sekolah)

**Status: VALID / CONFIRMED — menutup open item prd04 §13 Q14; posisi "negeri = iuran komite/transparansi, SPP dominan swasta" DIDUKUNG.**

**Fakta tersumber:**

- **Permendikbud 44/2012** (Pungutan dan Sumbangan Biaya Pendidikan pada Satuan Pendidikan Dasar; resmi di peraturan.go.id, metadata diakses 6 Agustus 2026):
  - **Pasal 9 ayat (1):** satuan pendidikan **DASAR** yang diselenggarakan oleh Pemerintah/pemerintah daerah (negeri) **DILARANG memungut biaya** (pungutan) dari peserta didik ataupun orang tua/walinya.
  - **Pungutan = penerimaan biaya pendidikan yang bersifat wajib dan mengikat** — hanya dapat dilakukan oleh satuan pendidikan dasar yang diselenggarakan oleh masyarakat (swasta), dengan syarat: (a) perencanaan investasi dan/atau operasi satuan pendidikan, (b) persetujuan melalui musyawarah/rapat komite sekolah, (c) pengelolaan secara transparan dan dipertanggungjawabkan, (d) disimpan dalam **rekening atas nama sekolah**, (e) **minimal 20%** dari dana untuk **peningkatan mutu satuan pendidikan** (sumber sekunder pasal.id & detik edu merangkum syarat ini; teks resmi ada di peraturan.go.id).
  - **Sumbangan = penerimaan biaya pendidikan yang bersifat sukarela dan tidak mengikat** — boleh diterima oleh satuan pendidikan negeri maupun swasta; tidak boleh dikaitkan dengan persyaratan akademik/penerimaan peserta didik.
  - **Larangan:** memungut biaya dari peserta didik tidak mampu; mengaitkan pungutan dengan persyaratan akademik, penilaian, atau penerimaan peserta didik; komite sekolah/lembaga lain dilarang melakukan pungutan; sanksi: pengembalian penuh dana yang telah diterima.
- **Permendikbud 75/2016** (Komite Sekolah; resmi di peraturan.go.id): komite sekolah bertugas menghimpun dana dari masyarakat dalam bentuk **bantuan dan/atau sumbangan** (bukan pungutan) untuk mendukung penyelenggaraan pendidikan; **komite dilarang melakukan pungutan**.
- **Nuansa kritis:** Permen 44/2012 secara tekstual mengatur **pendidikan DASAR** (SD/SMP); **SMA/SMK tidak tercakup larangan Pasal 9 secara tekstual** — tetapi prinsip "negeri tidak memungut, dana partisipasi bersifat sukarela/komite" tetap diterapkan lintas jenjang sebagai praktik baik dan acuan posisi produk. Keputusan prd04 §13 Q14 **"negeri = iuran komite/transparansi; SPP dominan swasta" DIDUKUNG (VALID)**.

**Implikasi desain openlms:**
- Modul keuangan (prd04 §5.F.1) untuk sekolah negeri memakai bahasa produk **"iuran komite / transparansi"**, bukan "SPP"; jenis tagihan bisa dibatasi/feature-flag per jenis sekolah (NPSN negeri/swasta).
- Sediakan template **bukti sumbangan sukarela** (bukan tagihan mengikat) dan alur pencatatan penerimaan komite yang terpisah dari invoice SPP.

**Sumber Topik 11 (diakses 6 Agustus 2026):**
- Permendikbud 44/2012 (resmi) — https://peraturan.go.id/id/permendikbud-no-44-tahun-2012
- Permendikbud 75/2016 (resmi) — https://peraturan.go.id/id/permendikbud-no-75-tahun-2016
- detik edu — pungutan & sumbangan sekolah — https://www.detik.com/edu/sekolah/d-6819162
- Ombudsman RI — artikel pungutan sekolah — https://ombudsman.go.id (artikel pungutan sekolah; kanal berita resmi Ombudsman)
- pasal.id — ringkasan Permendikbud 44/2012 — https://pasal.id/peraturan/permen/permendikbud-no-44-tahun-2012

### Topik 12 — Tabel TER PPh 21 PMK 168/2023 & Honor Guru

**Status: VALID / CONFIRMED (struktur TER & mekanisme honorarium); tabel penuh = open item teknis (ambil PDF saat build) — menutup sebagian prd04 §13 Q15.**

**Fakta tersumber:**

- **Struktur TER bulanan kategori A/B/C** (berdasarkan status PTKP; PP 58/2023 + PMK 168/2023, berlaku sejak 1 Januari 2024, masih berlaku 2026):
  - **A** = TK/0, TK/1, K/0; **B** = TK/2, K/1, TK/3, K/2; **C** = K/3.
  - Contoh baris **TER A** (sumber sekunder muc.co.id & klikpajak.id): penghasilan bruto s.d. **Rp5.400.000 → 0%**; **Rp5.400.000–5.650.000 → 0,25%**; **5.650.000–5.950.000 → 0,5%**; **5.950.000–6.300.000 → 0,75%**; **6.300.000–6.750.000 → 1%** — naik bertahap sampai **> Rp1,4 Miliar → 34%**.
  - **TER B** s.d. **Rp6.200.000 → 0%**; **TER C** s.d. **Rp6.600.000 → 0%**.
- **TER harian (pegawai tidak tetap):** penghasilan bruto **≤ Rp450.000/hari → 0%**; **> Rp450.000 s.d. Rp2.500.000/hari → 0,5%**; **> Rp2.500.000/hari → tarif Pasal 17 × 50%**.
- **Mekanisme:** pegawai tetap memakai TER bulanan Januari–November + **rekonsiliasi masa pajak terakhir (Desember)** dengan tarif Pasal 17 (lapisan UU HPP: 5% s.d. Rp60 juta, 15% s.d. Rp250 juta, dst.).
- **Honorarium bukan pegawai (guru honorer/honorer):** PPh 21 = **DPP 50% × bruto × tarif Pasal 17** (dasar PER-32/PJ/2015; mekanisme tetap berlaku di PMK 168/2023).
- **Honor guru PNS:** PPh final **15%** (PP 80/2010 tentang Tarif Pemotongan PPh atas Penghasilan Pejabat Negara, PNS, anggota TNI/Polri — dirujuk dari laman BOS Kemendikdasmen).
- **Guru honorer = peserta BPJS Ketenagakerjaan kategori Penerima Upah (PU)**; **iuran JKK/JKM yang dibayar pemberi kerja = objek PPh 21** bagi penerima (bpjsketenagakerjaan.go.id).
- **Open (tetap open item):** juknis BOS/APBD per tahun ajaran untuk honor guru (verifikasi saat build); **tabel TER penuh ambil dari PDF PMK 168/2023 (DJP)** untuk seed konfigurasi presisi.

**Implikasi desain openlms:**
- Kalkulator PPh 21 harus mendukung tiga jalur: pegawai tetap (TER A/B/C + rekonsiliasi Desember), pegawai tidak tetap (TER harian), dan bukan pegawai (DPP 50% × Pasal 17); honor guru PNS = tarif final 15% (jalur terpisah).
- Seluruh nilai tabel TER = **konfigurasi per periode** (bukan hardcode); seed awal memakai contoh baris di atas, lalu diganti tabel penuh dari PDF PMK 168/2023 saat build [prd04 §5.E.3, §13 Q15].

**Sumber Topik 12 (diakses 6 Agustus 2026):**
- muc.co.id — struktur TER bulanan A/B/C — https://www.muc.co.id (artikel PMK 168 struktur TER)
- Klikpajak — PPh Pasal 21 TER — https://klikpajak.id/blog/pajak-penghasilan-pasal-21-2/
- PMK 168/2023 PDF (DJP) — https://pajak.go.id/sites/default/files/2024-02/PMK%20168%20Tahun%202023%20Tentang%20PPh%20Pasal%2021%20TER.pdf
- BPJS Ketenagakerjaan — guru honorer = Penerima Upah — https://www.bpjsketenagakerjaan.go.id (artikel program & kepesertaan)
- BOS Kemendikdasmen — honor PNS final 15% (PP 80/2010) — https://bosp.kemendikdasmen.go.id
- Pajakku — artikel honorarium — https://artikel.pajakku.com

### Topik 13 — KYC Payment Gateway untuk Sekolah/Yayasan

**Status: VALID / CONFIRMED (persyaratan dokumen dari vendor); waktu aktivasi TIDAK TERVERIFIKASI dari dokumen resmi — menutup prd04 §13 Q16.**

**Fakta tersumber:**

- **Midtrans** (dokumentasi resmi docs.midtrans.com, diakses 6 Agustus 2026):
  - Dokumen merchant umum: **KTP pemilik/penanggung jawab**, **NPWP badan**, **Akta Pendirian (+ perubahan)**, dokumen pengesahan.
  - Untuk **QRIS**: badan usaha (CV/PT) butuh **SIUP atau NIB**, **akta**, **SK Kemenkumham**; web/aplikasi toko **harus aktif**; tanpa batas transaksi (tidak ada limit nominal di level dokumen).
- **Xendit** (help.xendit.co — legal documents, diakses 6 Agustus 2026): **akta terbaru** (termasuk **Akta Pengangkatan Direktur Terakhir**), **KTP pengurus**, **NPWP**, **rekening bank** atas nama badan.
- **Kontekstualisasi yayasan/sekolah:** paket dokumen yang relevan = **Akta Pendirian Yayasan + SK Kemenkumham (AHU)** + **NPWP yayasan** + **NIB** (Nomor Induk Berusaha — ehub.kemenkopukm.go.id) + **rekening atas nama yayasan** + **URL aplikasi/situs aktif**.
- **Waktu aktivasi (1–7+ hari kerja) TIDAK TERVERIFIKASI** dari dokumen resmi — konfirmasi langsung ke vendor saat fitur gateway diaktifkan (feature flag `FINANCE_GATEWAY`, prd04 §5.F.7).

**Implikasi desain openlms:**
- Konsol SUPERADMIN menyediakan **checklist KYC** (akta + SK Kemenkumham/AHU + NPWP + NIB + rekening atas nama sekolah/yayasan + URL aplikasi aktif) sebelum aktivasi gateway [prd04 §5.F.7].
- Jangan janjikan waktu aktivasi spesifik di UI/dokumentasi; tampilkan status "verifikasi vendor" dan fallback manual.

**Sumber Topik 13 (diakses 6 Agustus 2026):**
- Midtrans — dokumentasi legalitas & daftar merchant — https://docs.midtrans.com
- Midtrans — cara daftar QRIS — https://midtrans.com/blog/cara-daftar-qris
- Xendit — legal documents — https://help.xendit.co (artikel persyaratan dokumen)
- Kemenkop UKM — NIB — https://ehub.kemenkopukm.go.id

### Topik 14 — Ketentuan Fiskal Penyusutan (PMK 72/2023)

**Status: VALID / CONFIRMED — menutup prd04 §13 Q17.**

**Fakta tersumber:**

- **PMK 72/2023** (perubahan atas PMK 249/2008; jdih.kemenkeu.go.id & pajak.go.id, diakses 6 Agustus 2026):
  - Kelompok harta berwujud **bukan bangunan**: **Kelompok 1 = 4 tahun** (garis lurus 25% / saldo menurun 50%); **Kelompok 2 = 8 tahun** (12,5% / 25%); **Kelompok 3 = 16 tahun** (6,25% / 12,5%); **Kelompok 4 = 20 tahun** (5% / 10%).
  - **Bangunan permanen = 20 tahun (5%)**; **bangunan tidak permanen = 10 tahun (10%)**.
  - **Default:** harta berwujud yang **tidak tercantum** dalam lampiran kelompok → masuk **Kelompok 3 (16 tahun)** (news.ddtc.co.id; konsultanpajakmulyono.com).
- **Relevansi untuk openlms:** yayasan pendidikan nirlaba memakai penyusutan fiskal hanya bila laporan keuangan perlu kepatuhan pajak (**konsultasi fiskal sebelum laporan resmi**); **laporan internal tetap memakai PSAK 16** (garis lurus, dihitung saat laporan — prd04 §5.G.2).

**Implikasi desain openlms:**
- Modul aset menyimpan `masa_manfaat_bulan` sebagai konfigurasi per kategori; sediakan **kelompok fiskal PMK 72/2023** sebagai nilai referensi opsional untuk laporan fiskal (bukan pengganti PSAK 16) [prd04 §5.G.2, §13 Q17].

**Sumber Topik 14 (diakses 6 Agustus 2026):**
- DJP — pengumuman PMK 72/2023 — https://pajak.go.id/en/node/98645
- JDIH Kemenkeu — PMK-72/2023 — https://jdih.kemenkeu.go.id (PMK-72-2023)
- DDTC News — default Kelompok 3 — https://news.ddtc.co.id
- Konsultan Pajak Mulyono — https://konsultanpajakmulyono.com

### Topik 15 — MA (Madrasah Aliyah) & "sederajat" (Konteks prd04 Q20)

**Status: ANALISIS KONTEKS (implikasi non-trivial) — Q20 prd04 tetap OPEN; rekomendasi: MVP = SMA/SMK.**

**Fakta tersumber:**

- **MA (Madrasah Aliyah)** = pendidikan **umum dengan kekhasan agama Islam** jenjang menengah, di bawah **Kementerian Agama** (Ditjen Pendidikan Islam — **KSKK Madrasah**), dengan jenjang MA/MAK.
- **Kurikulum:** KMA (Keputusan Menteri Agama) — **KMA 347/2022** (Kurikulum Merdeka madrasah) → **KMA 450/2024** (ayomadrasah.id) — **bukan Permendikdasmen** seperti SMA/SMK.
- **Sistem data:** **EMIS** (Education Management Information System madrasah, emis.kemenag.go.id) — **bukan Dapodik**.
- **Rapor:** **RDM (Rapor Digital Madrasah)** — bukan e-Rapor Kemdikdasmen.
- **Identitas:** NSM (Nomor Statistik Madrasah) — bukan NPSN.
- **Implikasi untuk openlms:** melayani MA = **biaya penyesuaian non-trivial** (EMIS vs Dapodik, KMA 347/2022/450/2024 vs Permendikdasmen, RDM vs e-Rapor, NSM vs NPSN, alur birokrasi Kemenag vs Kemdikdasmen).

**Rekomendasi:**
- **MVP = SMA/SMK** (Kemdikdasmen); **jangan janjikan MA** pada penawaran awal; validasi kebutuhan MA riil (sekolah pilot madrasah) sebelum ekspansi; Q20 prd04 tetap **OPEN**.

**Sumber Topik 15 (diakses 6 Agustus 2026):**
- EMIS Kemenag — https://emis.kemenag.go.id
- KMA 347/2022 — PDF keputusan kurikulum madrasah (Kemenag)
- Ayo Madrasah — KMA 450/2024 — https://ayomadrasah.id

### Topik 16 — Konkurensi Ujian & Rate-Limit (Dasar prd04 §13 Q4/Q7)

**Status: VALID (OWASP DoS Cheat Sheet) — menetapkan nilai awal Q4/Q7; semua nilai konfigurasi & dikalibrasi load test k6.**

**Fakta tersumber (OWASP DoS Cheat Sheet, cheatsheetseries.owasp.org, diakses 6 Agustus 2026):**

- Rekomendasi OWASP untuk mitigasi Denial of Service di lapisan aplikasi: **rate limit per IP/kunci** (bukan hanya per akun), **load limit** (batas konkurensi/kuota), **connection timeout**, dan **penundaan bertahap** (exponential backoff).
- **Peringatan:** *lockout permanen per IP dapat disalahgunakan* (attacker memicu lockout massal = self-DoS) → **hindari lockout permanen berbasis IP**; gunakan lockout **per-akun** + penundaan bertahap per IP.
- **Rekomendasi nilai awal prd04 (DITETAPKAN, dikalibrasi load test):**
  - Konkurensi ujian baseline: **500 siswa serentak/shift**; puncak submit 5 menit terakhir ±**100–200 req/detik**.
  - Rate-limit: **login 5 gagal/15 mnt per akun + throttle IP 20/mnt** (tanpa lockout permanen IP); **submit ujian 30/mnt per user**; **scan QR 30/mnt**; **global 1.000/mnt/IP** (kalibrasi NAT sekolah); **WebSocket 60/mnt + 3 koneksi/user**.
  - Semua nilai **terkonfigurasi** (bukan hardcode) dan **dikalibrasi ulang via load test k6** sebelum ujian sungguhan (target p95 < 3 s) [prd04 §5.A.6, §6, §8.3].

**Implikasi desain openlms:**
- Implementasi rate limiter berlapis: per-akun (login, submit, scan) + per-IP (throttle) + global; **tanpa lockout permanen per IP**; lockout login per akun (5 gagal → 15 mnt); WebSocket dibatasi koneksi & pesan per menit per user [prd04 §13 Q4].

**Sumber Topik 16 (diakses 6 Agustus 2026):**
- OWASP Cheat Sheet Series — Denial of Service — https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
