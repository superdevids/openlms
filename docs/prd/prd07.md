# PRD 7: Development PRD v3 — Lanjutan Gelombang Perbaikan, Fitur Per-Role, dan Kesiapan Produksi

**Versi:** 1.0
**Tanggal:** 8 Agustus 2026
**Status:** Draft final untuk eksekusi development
**Pemilik Produk:** Aditya
**Dokumen Sumber:**

- docs/prd/prd06md (v1.0) — PRD development putaran 2: personalisasi, performa, roadmap 3 sprint — disebut **[prd06]**
- docs/prd/prd05.md (v1.0) — penutupan gap audit G-01..G-67, roadmap 3 sprint — disebut **[prd05]**
- docs/riview/riview03.md (v1.0) — laporan review berkala putaran 3 (diterbitkan bersamaan) — disebut **[riview03]**
- docs/riview/riview02.md (v1.0), docs/riview/riview01.md — audit putaran 2 dan 1 — disebut **[riview02]**, **[riview01]**
- docs/04-api-contract.md — kontrak API & matriks RBAC — disebut **[api-04]**
- docs/02-technical-architecture.md — arsitektur monorepo, auth, storage, realtime — disebut **[tek-02]**

> **Sifat dokumen:** PRD development putaran ketiga. Berisi ringkasan eksekusi gelombang
> perbaikan terakhir (integrasi front↔API, testing, sanitasi upload, performa, UI, fitur
> per role, notifikasi realtime, browser storage, landing, rebranding), daftar fitur yang
> diusulkan untuk fase berikutnya (termasuk analisis fitur per role 60+ usulan), roadmap
> 3 sprint, keselarasan dengan gap register [prd05], serta prasyarat produksi.
> Seluruh angka agregat (test, halaman, model, section landing) berasal dari catatan
> eksekusi orkestrator; bagian yang tidak terverifikasi langsung pada source diberi
> keterangan eksplisit.

---

## 1. Ringkasan Eksekutif (BLUF)

**PRD development v3 ini menetapkan program fase berikutnya agar opensis (rebranding
dari openlms) siap menuju produksi: menutup sisa temuan review putaran 3, membangun
fitur per role bernilai tinggi (rapor digital, analisis kelas, aging piutang, dashboard
eksekutif KEPSEK, dst.), menyelesaikan keselarasan regulasi (e-Rapor dua-track G-49,
Dapodik G-50), dan memenuhi prasyarat operasional (observability, Dockerfile, backup,
graceful shutdown, staging, E2E dengan PostgreSQL).**

- **Gelombang perbaikan terakhir tuntas.** Sebelas area eksekusi selesai: integrasi
  front↔API (rollover C1 + H1–H14 + M1/M2/M4), perbaikan 17+6 kegagalan test, sanitasi
  upload, optimasi performa (N+1, impor massal→queue, cache TTL, 3 index), tokenisasi
  UI, dashboard untuk 3 role eksternal (calonsiswa/pembimbing/penguji), notifikasi
  realtime 5 domain, browser storage dimaksimalkan, landing 17 section + 8 berita + ISR
  30s, testing ±2.072 (API 1.971 pass + web 94 pass), dan rebranding openlms→opensis
  (§2).
- **Fase berikutnya berorientasi nilai per role dan kesiapan produksi.** Dari analisis
  fitur per role (60+ usulan, lampiran [riview03]) dipilih fitur berdaya ungkit tinggi:
  rapor digital siswa, analisis kelas guru, aging piutang keuangan, selector anak wali
  murid, forum tanya, leaderboard, dashboard eksekutif KEPSEK dari data nyata (§3).
- **Prasyarat produksi eksplisit.** Gate `DEMO_MODE`, integrasi E2E dengan PostgreSQL,
  backup/restore (RPO/RTO), observability (G-30..G-34), dan indexing migration
  `npm run db:migrate` menjadi syarat go-live (§6).
- **Definisi selesai (DoD) terukur:** ≥ 2.000 test hijau (melanjutkan ±2.072), coverage
  modul inti ≥ 80%, 0 temuan CRITICAL/HIGH terbuka, dan seluruh gap [prd05] yang masih
  terbuka dijadwalkan dengan status jelas (§4–§5).

---

## 2. Ringkasan Eksekusi Terbaru

Gelombang perbaikan terakhir mencakup 11 area. Seluruh item berstatus **SELESAI**
berdasarkan catatan eksekusi orkestrator; kolom "Bukti/Indikator" memuat artefak yang
dapat diverifikasi pada source.

| #   | Area eksekusi                                                                                                | Status  | Bukti / indikator                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **Integrasi front↔API** — rollover C1 (web memakai `/rollover/*` nyata) + H1–H14 + M1/M2/M4                  | SELESAI | `superadmin/rollover/page.tsx` kini memanggil endpoint rollover nyata (perbaikan mismatch lama [riview03]) |
| 2   | **Perbaikan kegagalan test** — 17 + 6 kegagalan diperbaiki                                                   | SELESAI | Catatan eksekusi orkestrator; 5 suite pra-existing masih gagal → dituntaskan Sprint 1 (§4.1)               |
| 3   | **Sanitasi upload** — allowlist ekstensi, magic bytes, Content-Length middleware, Content-Disposition        | SELESAI | Modul `modules/storage`, `MAGIC_SIGNATURES` (konsolidasi [riview02] R-15..R-21)                            |
| 4   | **Performa** — N+1 dihapus di 4 jalur, impor massal→queue, cache TTL landing + app-settings, 3 index baru    | SELESAI | Cache TTL di modul landing/app-settings; test `landing.service.cache.spec.ts`                              |
| 5   | **UI** — 349 warna hardcoded→token semantik, font Plus Jakarta Sans, branding light+dark, konsistensi shadcn | SELESAI | Jumlah 349 warna adalah catatan eksekusi; token semantik aktif di `globals.css`                            |
| 6   | **Fitur per role** — 3 role eksternal mendapat dashboard: calonsiswa, pembimbing, penguji                    | SELESAI | `(calonsiswa)/dashboard`, `(pembimbing)/dashboard`, `(penguji)/dashboard`                                  |
| 7   | **Notifikasi realtime** — di-wire ke 5 domain + event WS baru                                                | SELESAI | Modul `realtime` + `use-socket`; event `notification-events.spec.ts`                                       |
| 8   | **Browser storage dimaksimalkan** — cache TTL, queue offline ujian, token dipindah ke memori                 | SELESAI | `lib/storage.ts`; sesi token di memori (bukan `localStorage`)                                              |
| 9   | **Landing** — 17 section + 8 berita + ISR 30s                                                                | SELESAI | `app/page.tsx:38` `revalidate = 30`; 18 tag `<section>` terdeteksi (17 section + berita)                   |
| 10  | **Testing** — ±2.072 test (API 1.971 pass + web 94 pass)                                                     | SELESAI | Catatan eksekusi orkestrator; **belum diverifikasi ulang penuh** pada penyusunan dokumen ini               |
| 11  | **Rebranding openlms→opensis** — super-app LMS+SIS single-school Indonesia                                   | SELESAI | Monorepo Turborepo NestJS + Next.js + Prisma; 90 model / 62 enum (angka dari catatan eksekusi)             |

**Konteks arsitektur yang menjadi dasar fase ini:** RBAC 3 dimensi _fail-closed_
(permission × role × scope, `permissions.guard.ts` melempar 403 bila tidak ada
deklarasi), JWT in-house dengan rotasi + revoke DB, 90 model/62 enum Prisma, realtime
Socket.IO, queue BullMQ dengan fallback in-process, storage lokal tersanitasi, dan
frontend 52 halaman pada hitungan dokumentasi sebelumnya (verifikasi source per
2026-08-08 menunjukkan **55 file `page.tsx`**, termasuk rute dinamis `[id]`/`[slug]`).

---

## 3. Fitur yang Diusulkan untuk Fase Berikutnya

### 3.1 Analisis fitur per role (60+ usulan)

Sumber utama: lampiran analisis feature-gap [riview03] (dipertahankan dari versi
sebelumnya). Usulan bernilai tinggi dipilih berdasarkan nilai harian pengguna ×
kemudahan implementasi (read-only dari endpoint yang sudah ada = paling murah).

| Role           | Fitur diusulkan (prioritas tinggi)                                                                                           | Basis endpoint                                                   | Effort |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| SISWA          | Rapor digital per semester (view)                                                                                            | `/grades/recap/student/:id`                                      | M      |
|                | Kalender akademik resmi (PTS/PAS/PAT, libur)                                                                                 | model baru `academic_calendar_event`                             | L      |
|                | Status tagihan SPP sendiri (link dari dashboard)                                                                             | `/finance/invoices` (self)                                       | S      |
| GURU / GURU_BK | Analisis kelas guru: rekap nilai, distribusi, anomali per mapel                                                              | `/grades/recap/class-subject/:id`                                | M      |
|                | Input nilai manual cepat per kelas (grid)                                                                                    | `POST /grades`                                                   | M      |
|                | Export nilai per kelas (CSV/PDF) — tombol pada halaman penilaian                                                             | `/grades/export/csv\|pdf`                                        | S      |
|                | Dashboard khusus GURU_BK (konseling, kedisiplinan)                                                                           | endpoint counseling/discipline                                   | M      |
| ORTU           | Selector anak bila >1 (saat ini hanya anak pertama)                                                                          | endpoint children                                                | S      |
|                | Detail tagihan anak (riwayat pembayaran)                                                                                     | `/finance/invoices/:id` + payments                               | M      |
|                | Pengajuan izin anak (permit)                                                                                                 | `permit:request:self`                                            | S      |
|                | Komunikasi wali kelas / forum tanya                                                                                          | modul communication                                              | M      |
| OPERATOR       | Wizard impor siswa/guru (UI form + riwayat ImportBatch)                                                                      | onboarding import                                                | M      |
|                | Manajemen jadwal pelajaran (CRUD + grid per kelas)                                                                           | `/schedules`                                                     | S      |
|                | Dashboard ringkasan PPDB (pendaftar per status)                                                                              | modul `ppdb`                                                     | M      |
| KEUANGAN       | **Aging piutang** — tunggakan per umur (30/60/90+ hari) di dashboard                                                         | `/finance/invoices/summary/monthly` + detail                     | M      |
|                | Cetak tagihan / slip per siswa (PDF)                                                                                         | invoice PDF                                                      | S      |
|                | Riwayat pembayaran siswa dalam satu layar                                                                                    | endpoint ada; page detail siswa                                  | S      |
| WAKEPSEK       | Rekap nilai per kelas semester (read-only)                                                                                   | `/grades/recap/class/:id`                                        | S      |
|                | Rekap kehadiran lintas kelas (discipline)                                                                                    | `/attendance/discipline`                                         | S      |
|                | Jadwal ujian semester (PTS/PAS/PAT)                                                                                          | `/exams` + exam sessions                                         | M      |
| KEPSEK         | **Dashboard eksekutif data nyata** — KPI siswa aktif, kehadiran, tunggakan dari agregat per-role (bukan placeholder)         | endpoint agregat per-role baru (admin-stats dibatasi SUPERADMIN) | M      |
|                | Persetujuan surat/izin via dashboard                                                                                         | `letter:approve:school`                                          | M      |
|                | Ringkasan payroll per periode (read-only)                                                                                    | `/payroll/runs/:id/rekap`                                        | M      |
| SUPERADMIN     | Leaderboard gamifikasi (kelas/siswa — nilai, kehadiran, tugas)                                                               | agregat grades/attendance                                        | M      |
|                | Audit trail per entity (drill-down)                                                                                          | `/admin/change-logs?entity=`                                     | S      |
|                | Backup & restore UI (lapisan infra)                                                                                          | infra-level (G-63)                                               | L      |
| Role eksternal | CALONSISWA: pengumuman & status pendaftaran diperkaya; PEMBIMBING: monitoring magang per siswa; PENGUJI: rekap penilaian UKK | modul ppdb/smk/exam                                              | M      |

Total kandidat dari tabel ini dan lampiran [riview03] berjumlah **60+ usulan**; tabel di
atas menampilkan prioritas tertinggi. Item non-inti digeser ke rilis berikutnya bila
roadmap padat (cut-line §7-R4).

### 3.2 Landing lanjutan

- **Resolusi konflik ISR vs force-dynamic:** root `app/page.tsx` memakai
  `revalidate = 30` (ISR) sementara `(landing)/layout.tsx:12` menetapkan
  `dynamic = "force-dynamic"` — keduanya saling meniadakan dan membuat landing selalu
  dinamis. Keputusan: seragamkan strategi render (ISR penuh dengan fallback CMS) dan
  dokumentasikan di [riview03] §4.
- **Galeri nyata:** section galeri saat ini hanya dirender bila
  `galeriImages.length > 0` (`app/page.tsx:619`); lengkapi alur upload gambar galeri di
  CMS landing agar tidak bergantung placeholder.
- **Berita:** 8 berita eksisting dipertahankan; tambah kategori filter, halaman arsip,
  dan RSS (opsional, effort S).
- **Kontak/FAQ:** form kontak yang disimpan ke DB (menutup catatan R-35 [riview02]).

### 3.3 Notifikasi & WebSocket lanjutan

Melanjutkan wire 5 domain pada gelombang terakhir:

| Event WS baru            | Penerima                                    | Domain           |
| ------------------------ | ------------------------------------------- | ---------------- |
| `attendance:live-record` | ORTU + SISWA (realtime saat guru mencatat)  | attendance       |
| `rollover:progress`      | SUPERADMIN + OPERATOR (progres job panjang) | rollover + queue |

- Kriteria selesai: event terkirim via gateway dengan room validation (pola
  `sanitizeRoom`/`canAccessRoom` dipertahankan), fallback polling bila WS tidak
  tersedia, dan test event per jenis (mengikuti `notification-events.spec.ts`).

### 3.4 e-Rapor dua-track (G-49)

- Konsolidasi Grade (TUGAS/KUIS/UJIAN) + absensi → rapor dua-track (mapel + P5 wadah),
  ekspor PDF, validasi pilot. Detail: [prd05] G-49, [prd04 §5.A.8], referensi
  [tek-05 M-RAPOR] (bila tersedia).
- Effort: **L**. Selesai pada Sprint 3 (§4.3).

### 3.5 Dapodik (G-50)

- Ekspor file terformat (siswa/rombel) — bukan API langsung [tek-02 §9.2]. Effort: **M**.

### 3.6 PWA offline (G-54)

- Queue absensi QR + cache materi (PWA minimal). Fondasi browser storage gelombang
  terakhir (queue offline ujian) menjadi dasar. Effort: **M**.

### 3.7 Observability (G-30..G-34)

| ID   | Item                                             | Effort |
| ---- | ------------------------------------------------ | ------ |
| G-30 | Health check dinamis (DB/storage/queue/socket)   | S      |
| G-31 | Metrik + tracing + alerting (Prometheus/Grafana) | L      |
| G-32 | Slow query log aktif + ambang                    | S      |
| G-33 | Error tracking (agregasi + alert)                | S      |
| G-34 | Rotasi/retensi access log nginx                  | S      |

### 3.8 E2E & load test (G-60/G-61)

- Infrastruktur E2E Playwright yang berjalan **dengan PostgreSQL** (bukan mock
  in-memory) — prasyarat §6.2.
- Load test k6 1.500–2.000 VU (autosave, submit massal, notifikasi) — melanjutkan
  target [prd06 §4].
- Coverage gate ≥ 80% modul inti (api + web). Effort: **L** (keduanya).

### 3.9 Infrastruktur produksi

| ID   | Item                                                         | Effort | Catatan                                     |
| ---- | ------------------------------------------------------------ | ------ | ------------------------------------------- |
| G-62 | Dockerfile api + web, compose aktif, `nginx -t` pass         | M      | service app saat ini dikomentari di compose |
| G-63 | Backup/restore + drill (RPO ≤ 24 j target 15 mnt; RTO ≤ 4 j) | M      | data nilai/rapor legal, wajib               |
| G-64 | Graceful shutdown (SIGTERM drain HTTP/socket/queue/Prisma)   | S      |                                             |
| G-67 | Staging environment (env, seed anonymized, smoke test)       | M      |                                             |

---

## 4. Prioritas & Sprint Roadmap

Urutan eksekusi: **stabilisasi & prasyarat produksi (Sprint 1) → fitur per role
batch 1 + notifikasi lanjutan (Sprint 2) → keselarasan regulasi & kelengkapan
operasional (Sprint 3).** Estimasi mengikuti [prd05 §14]: S < 2 hari, M 2–5 hari,
L 1–2 minggu (tim 1–3 orang). Kolom "Owner" adalah peran yang disarankan; dalam tim
kecil peran dapat dirangkap, namun review dan verifikasi tidak dilakukan oleh pembuat
perubahan yang sama.

### 4.1 Sprint 1 — Stabilisasi Test, E2E, dan Prasyarat Produksi

| ID   | Task                                                                                                                                                                           | Effort | Owner            | Done-Definition                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------- | -------------------------------------------------------------------------------------- |
| P1-1 | Perbaiki 5 suite pra-existing: realtime.gateway.unit, feature-flags.service, queue.in-process, onboarding.service, communication.state-machine (terkait jwt.util/redis/timing) | M      | coder + tester   | 5 suite hijau di CI; akar masalah (timing/redis/jwt) terdokumentasi                    |
| P1-2 | Infrastruktur E2E Playwright dengan PostgreSQL (login, ujian, kuis, tugas, rollover)                                                                                           | L      | tester           | E2E hijau di CI terhadap PostgreSQL nyata; tidak lagi mock in-memory                   |
| P1-3 | Resolusi landing: seragamkan ISR vs force-dynamic; migrasi warna hardcoded `app/page.tsx` ke token semantik                                                                    | M      | coder + reviewer | Satu strategi render terdokumentasi; 0 warna hardcoded di landing; CWV tidak turun     |
| P1-4 | Verifikasi ketat DTO (konfirmasi perilaku disengaja, mis. score string ditolak) + dokumentasi kontrak                                                                          | S      | reviewer         | Matriks validasi DTO terdokumentasi di [api-04]; tidak ada perilaku tak terdokumentasi |
| P1-5 | Keputusan strategi cache multi-instance (in-memory saat ini) — Redis/lock terdistribusi                                                                                        | M      | architect        | ADR cache terdokumentasi; jalur Redis terverifikasi saat `REDIS_URL`                   |
| P1-6 | Health check dinamis (G-30) + slow query log (G-32) + error tracking minimal (G-33)                                                                                            | M      | coder            | Health mencerminkan DB/storage/queue; log aktif; error ter-agregasi                    |
| P1-7 | Graceful shutdown (G-64)                                                                                                                                                       | S      | coder            | SIGTERM drain bersih; test restart                                                     |
| P1-8 | Gate `DEMO_MODE` audit: pastikan tidak ada jalur data demo bocor ke produksi                                                                                                   | S      | reviewer         | Checklist env produksi; jalur demo hanya aktif saat `NEXT_PUBLIC_DEMO=1`               |

**Pintu keluar Sprint 1:** 5 suite hijau; E2E berjalan atas PostgreSQL; landing
terseragamkan; keputusan cache terdokumentasi; observability minimal aktif; graceful
shutdown teruji.

### 4.2 Sprint 2 — Fitur Per-Role Batch 1 & Notifikasi Lanjutan

| ID    | Task                                                                                                        | Effort | Owner            | Done-Definition                                                         |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------ | ---------------- | ----------------------------------------------------------------------- |
| P2-1  | Rapor digital siswa (view + PDF)                                                                            | M      | coder + reviewer | Rapor tampil dari data nyata; PDF terunduh; RBAC sesuai [api-04]        |
| P2-2  | Analisis kelas guru (rekap + distribusi per mapel)                                                          | M      | coder            | Halaman guru menampilkan agregat dari `/grades/recap/*`; test           |
| P2-3  | Aging piutang keuangan (tunggakan 30/60/90+)                                                                | M      | coder            | Agregat aging dari invoice/payments; test kalkulasi                     |
| P2-4  | Selector anak wali murid (>1 anak) + detail tagihan anak                                                    | S      | coder            | Ortu dapat memilih anak; seluruh data mengikuti anak terpilih           |
| P2-5  | Dashboard eksekutif KEPSEK data nyata (KPI siswa aktif, kehadiran, tunggakan)                               | M      | coder + reviewer | Endpoint agregat per-role baru; KPI tanpa placeholder                   |
| P2-6  | Event WS `attendance:live-record` + `rollover:progress`                                                     | M      | coder + tester   | Event terkirim dengan room validation; test per jenis; fallback polling |
| P2-7  | Forum tanya (komunikasi) untuk siswa-guru / wali kelas                                                      | M      | coder            | Thread + notifikasi; RBAC `communication:*` sesuai kontrak              |
| P2-8  | Leaderboard kelas/siswa (nilai, kehadiran, tugas)                                                           | M      | coder            | Agregat terbaca dari data nyata; kontrol visibilitas SUPERADMIN         |
| P2-9  | Landing lanjutan: galeri upload, form kontak, filter berita                                                 | M      | coder            | Galeri tidak placeholder; form kontak tersimpan; test                   |
| P2-10 | Quick wins per role (export nilai guru, cetak tagihan, ringkasan tunggakan KEUANGAN, jadwal ujian WAKEPSEK) | S      | coder            | Fitur read-only dari endpoint eksisting; test                           |

**Pintu keluar Sprint 2:** seluruh fitur P2-1..P2-10 teruji; RBAC sesuai [api-04];
tidak ada placeholder pada dashboard KEPSEK/KEUANGAN.

### 4.3 Sprint 3 — Keselarasan Regulasi & Kelengkapan Operasional

| ID   | Task                                                                                             | Effort | Owner                | Done-Definition                                                           |
| ---- | ------------------------------------------------------------------------------------------------ | ------ | -------------------- | ------------------------------------------------------------------------- |
| P3-1 | e-Rapor dua-track (G-49): konsolidasi Grade + absensi → rapor mapel + P5; ekspor PDF             | L      | coder + reviewer     | Aritmetika benar; PDF terunduh; validasi pilot                            |
| P3-2 | Dapodik (G-50): ekspor file siswa/rombel terformat                                               | M      | coder                | File sesuai struktur; test format                                         |
| P3-3 | PWA offline (G-54): queue absensi QR + cache materi                                              | M      | coder                | Scan offline tersinkron tanpa duplikasi; test                             |
| P3-4 | Observability lengkap (G-31): metrik + tracing + alerting + dashboards                           | L      | architect + reviewer | Alert terpasang (error rate >1% 5 mnt, p95 >3 s); dashboard live          |
| P3-5 | Dockerfile api+web + compose aktif (G-62)                                                        | M      | coder                | Image build; `docker compose up` jalan; `nginx -t` pass                   |
| P3-6 | Backup/restore + drill (G-63)                                                                    | M      | coder + tester       | RPO/RTO tercapai; drill restore sukses terdokumentasi                     |
| P3-7 | Staging environment (G-67)                                                                       | M      | coder                | Staging setara prod; seed anonymized; smoke test                          |
| P3-8 | Kampanye coverage modul inti ≥ 80% + load test final k6 1.500–2.000 VU (G-60/G-61)               | L      | tester + reviewer    | Gate coverage aktif; load lulus: 0 429, p95 autosave < 300 ms, error < 1% |
| P3-9 | Audit ulang keamanan & kualitas; update dokumentasi teknis (02/03/04, README modul, indeks docs) | M      | reviewer + writer    | 0 CRITICAL/HIGH terbuka; dokumentasi sinkron source                       |

**Pintu keluar Sprint 3 (go-live):** seluruh item §4.3 selesai; DoD §4.4 terpenuhi;
staging hijau sebelum produksi.

### 4.4 Definisi Selesai (DoD) — target terukur fase ini

| #   | Kriteria           | Target                                                                                             | Alat ukur                                    |
| --- | ------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Test               | **≥ 2.000 test hijau** (API + web; melanjutkan ±2.072 dengan 5 suite pra-existing ditutup)         | CI pipeline (Jest/Vitest + RTL + Playwright) |
| 2   | Test coverage      | **≥ 80%** (line/branch) modul inti apps/api dan apps/web                                           | Gate coverage CI                             |
| 3   | Temuan kualitas    | **0 temuan CRITICAL/HIGH terbuka** (register [riview03] + audit lanjutan)                          | Audit ulang pasca-perbaikan (file:line)      |
| 4   | Kapasitas ujian    | ≥ 1.500 user bersamaan (puncak 2.000) tanpa 429/timeout; p95 autosave < 300 ms; error < 1%         | k6 (lanjut [prd06 §4])                       |
| 5   | E2E                | Alur inti (login, ujian, kuis, tugas, rollover) hijau atas **PostgreSQL**                          | Playwright CI                                |
| 6   | Landing & UI       | Satu strategi render (ISR) terdokumentasi; 0 warna hardcoded pada halaman landing                  | Grep token + CWV                             |
| 7   | Prasyarat produksi | `npm run db:migrate` bersih; backup/restore drill sukses; observability alert aktif; staging hijau | Migrasi + drill + smoke test                 |
| 8   | Dokumentasi        | `02/03/04`, README modul, indeks docs sinkron; PRD dan riview diperbarui                           | Review dokumentasi per perubahan             |

Kriteria go/no-go produksi: **kriteria 1, 3, 4, 5, 7 wajib hijau**; kriteria 2, 6, 8
dikejar paralel.

---

## 5. Keselarasan dengan Gap Register [prd05] (G-01..G-67)

Gap register [prd05] memuat 67 baris (G-01..G-67). Setelah gelombang perbaikan
terakhir, sebagian besar cluster A–D dan beberapa item lain telah tertutup oleh
eksekusi (§2). Item yang **masih terbuka** dan dijadwalkan pada PRD ini:

| ID   | Deskripsi singkat                     | Severity | Dijadwalkan             |
| ---- | ------------------------------------- | -------- | ----------------------- |
| G-30 | Health endpoint statis                | MEDIUM   | Sprint 1 (P1-6)         |
| G-31 | Tidak ada metrik/tracing/alerting     | HIGH     | Sprint 3 (P3-4)         |
| G-32 | Slow query log tidak aktif            | MEDIUM   | Sprint 1 (P1-6)         |
| G-33 | Error tracking tidak terpasang        | MEDIUM   | Sprint 1 (P1-6)         |
| G-34 | Access log nginx tanpa rotasi         | LOW      | Sprint 3 (P3-4)         |
| G-49 | Modul e-Rapor belum ada               | HIGH     | Sprint 3 (P3-1)         |
| G-50 | Sinkronisasi/ekspor Dapodik belum ada | MEDIUM   | Sprint 3 (P3-2)         |
| G-54 | Offline-first/PWA belum ada           | MEDIUM   | Sprint 3 (P3-3)         |
| G-60 | Nol test web/E2E/load                 | HIGH     | Sprint 1–3 (P1-2, P3-8) |
| G-61 | Coverage modul kritis tanpa gate      | HIGH     | Sprint 3 (P3-8)         |
| G-62 | Dockerfile belum ada                  | HIGH     | Sprint 3 (P3-5)         |
| G-63 | Backup/restore belum ada              | HIGH     | Sprint 3 (P3-6)         |
| G-64 | Graceful shutdown belum ada           | MEDIUM   | Sprint 1 (P1-7)         |
| G-67 | Environment staging belum ada         | MEDIUM   | Sprint 3 (P3-7)         |

Catatan: status selengkapnya per baris register dapat dilihat di [prd05 §2.2]; item di
luar tabel di atas dianggap telah ditutup oleh eksekusi putaran sebelumnya atau
dipindahkan sebagai temuan lanjutan [riview03] (mis. kualitas data AuditLog R-13/R-14,
rate-limit upload R-22, navigasi per-role R-10).

---

## 6. Prasyarat Produksi

Go-live produksi opensis hanya diizinkan bila seluruh prasyarat berikut hijau:

| #   | Prasyarat                                                                                                                      | Verifikasi                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | **Gate `DEMO_MODE`** — jalur data demo/fallback hanya aktif saat `NEXT_PUBLIC_DEMO=1`; tidak ada data contoh bocor ke produksi | Checklist env + audit jalur `DEMO_MODE` (Sprint 1 P1-8)                           |
| 2   | **Integrasi E2E dengan PostgreSQL** — suite E2E berjalan terhadap database nyata, bukan mock in-memory                         | Playwright CI dengan PostgreSQL (P1-2)                                            |
| 3   | **Backup/restore** — RPO ≤ 24 jam (target 15 menit), RTO ≤ 4 jam, drill bulanan terdokumentasi                                 | Drill restore (P3-6)                                                              |
| 4   | **Observability** — health dinamis, metrik, slow query log, error tracking, alerting                                           | G-30..G-34 (P1-6, P3-4)                                                           |
| 5   | **Indexing migration** — seluruh migrasi Prisma diterapkan dengan `npm run db:migrate`; hot path tanpa seq scan                | Migrasi bersih di staging; `EXPLAIN` hot path (lanjut [prd05] G-18, [prd06 §3.7]) |
| 6   | **Secret & env produksi** — JWT secret wajib diset (fail-fast di produksi [riview02] H-2); CORS whitelist                      | Env review checklist                                                              |
| 7   | **Staging hijau** — environment staging setara produksi dengan smoke test                                                      | G-67 (P3-7)                                                                       |

---

## 7. Risiko & Asumsi

### 7.1 Risiko

| #   | Risiko                                                                                    | Severity | Mitigasi                                                                                    |
| --- | ----------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| R1  | 5 suite pra-existing bergantung timing/Redis/jwt — perbaikan bisa menyentuh perilaku inti | MEDIUM   | Kerjakan di awal Sprint 1 dengan isolasi; dokumentasikan akar masalah; jaga 0 regresi       |
| R2  | Cakupan fitur per role (Sprint 2) membengkak dan menunda prasyarat produksi               | MEDIUM   | Cut-line eksplisit: fitur non-inti digeser; prasyarat §6 tidak boleh tergeser               |
| R3  | E2E atas PostgreSQL memerlukan env/seed stabil — flaky test dapat memakan waktu           | MEDIUM   | Seed idempoten + isolasi test; retry terbatas; jalankan paralel dengan unit test            |
| R4  | Cache in-memory multi-instance tidak konsisten bila instance > 1                          | MEDIUM   | Keputusan ADR di Sprint 1 (P1-5); jalur Redis distandarkan sebelum skala                    |
| R5  | e-Rapor (P3-1) adalah fitur paling kompleks (dua-track, aritmetika, PDF)                  | HIGH     | Mulai dari data nyata + validasi pilot; PDF via template sederhana dulu; ulur ekspor massal |
| R6  | Load test 1.500–2.000 VU memerlukan hardware/env khusus                                   | MEDIUM   | Jalankan di staging/CI terisolasi; mulai dari 500 VU lalu naik bertahap                     |
| R7  | Evidence `file:line` adalah snapshot 2026-08-08; nomor baris bergeser setelah perbaikan   | MEDIUM   | Regenerate referensi saat audit lanjutan; jaga traceability per ID (G-/P-/R-)               |

### 7.2 Asumsi

| #   | Asumsi                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------- |
| A1  | Aplikasi melayani SATU sekolah (single-school, satu NPSN) tanpa multi-tenant [prd04 §2.4][tek-02 ADR-001].                  |
| A2  | Target 1.500–2.000 pengguna puncak = satu shift ujian (PTS/PAS/PAT); baseline idle 500 stabil (lanjut [prd06 §4]).          |
| A3  | Redis tersedia untuk cache/socket/lock/rate-limit terdistribusi; fallback in-process tetap didukung dan terdokumentasi.     |
| A4  | Seluruh fitur per role dibangun di atas endpoint eksisting bila memungkinkan; endpoint baru hanya bila mutlak diperlukan.   |
| A5  | Rebranding opensis tidak mengubah kontrak API (`/api/v1`), model Prisma, atau arsitektur monorepo — hanya identitas produk. |
| A6  | Bahasa dokumen dan UI: Bahasa Indonesia; mata uang Rupiah.                                                                  |
| A7  | Dokumen ini membangun di atas kondisi [riview03] (seluruh temuan HIGH ke bawah non-blocking; temuan tersisa dijadwalkan).   |

---

_End of document — PRD 7 Development v3, opensis (openlms), 8 Agustus 2026._
