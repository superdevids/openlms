# BACKUP.md — Backup & Restore opensis

## Ringkasan

opensis menyimpan dua jenis data yang wajib di-backup bersama:

| Data     | Lokasi (DEV)                                               | Lokasi (PROD)                             | Alat backup               |
| -------- | ---------------------------------------------------------- | ----------------------------------------- | ------------------------- |
| Database | PostgreSQL `localhost:5432` (container `opensis-postgres`) | sama (port dipublish)                     | `pg_dump` (format custom) |
| Storage  | `apps/api/storage` (host) — BUKAN `./storage`              | volume `opensis-storage` → `/app/storage` | `tar.gz`                  |

Skrip disediakan di `deploy/scripts/`:

- `backup.sh` — backup DB + storage ke `deploy/backups/`.
- `restore.sh` — restore DB (dengan konfirmasi DESTRUKTIF) + storage.

**Target SLA:** RPO ≤ 24 jam (backup harian otomatis), RTO ≤ 4 jam (prosedur
restore terdokumentasi + drill bulanan; lihat [RPO/RTO](#rporto)).

> ⚠️ Backup hanya berguna jika tersimpan di luar server yang sama (off-host).
> Setelah backup selesai, sinkronkan `deploy/backups/` ke mesin lain
> (rsync/scp/object storage). Jangan pernah bergantung hanya pada disk server
> produksi.

---

## Yang Dihasilkan `backup.sh`

Menjalankan `bash deploy/scripts/backup.sh` menghasilkan dua file ber-timestamp
di `BACKUP_DIR` (default `deploy/backups/`):

```
opensis-db-20260809-023000.dump          # pg_dump format custom (-Fc)
opensis-storage-20260809-023000.tar.gz   # arsip storage lokal
```

Variabel env yang bisa di-override (semua punya default dari `.env` root):

| Env                 | Default                   | Keterangan                                                |
| ------------------- | ------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`      | dari `.env`               | URL koneksi PostgreSQL                                    |
| `BACKUP_DIR`        | `deploy/backups`          | Direktori tujuan backup                                   |
| `STORAGE_LOCAL_DIR` | dari `.env` (`./storage`) | Direktori storage lokal — DEV nyata di `apps/api/storage` |
| `BACKUP_KEEP_DAYS`  | `14`                      | Hapus backup lebih lama dari N hari (`0` = nonaktif)      |

Catatan `backup.sh`:

- Jika `pg_dump` tidak ada di host, script otomatis memakai
  `docker compose exec -T postgres pg_dump` (cocok untuk PROD yang app-nya
  berjalan di container; `POSTGRES_USER`/`POSTGRES_DB`/`POSTGRES_PASSWORD`
  diambil dari `.env`, default `postgres`/`opensis`/`postgres`).
- Setelah `pg_dump`, dump diverifikasi dengan `pg_restore --list` (host atau
  via `docker compose exec`); gagal verifikasi → backup dianggap gagal.
- Jika direktori storage tidak ada, bagian storage dilewati dengan peringatan
  (bukan gagal total). Di DEV, upload runtime berada di `apps/api/storage` —
  bila `STORAGE_LOCAL_DIR` yang dikonfigurasi tidak ada/kosong, `backup.sh`
  otomatis memakai `apps/api/storage` (asalkan berisi).
- Retensi default 14 hari — sesuaikan bila kebijakan arsip mengharuskan lebih
  panjang (mis. `BACKUP_KEEP_DAYS=30`).

---

## 1. Backup Otomatis (Cron)

Contoh crontab (setiap hari 02:30, log ke `deploy/backups/backup.log`):

```cron
30 2 * * * cd /opt/opensis && bash deploy/scripts/backup.sh >> deploy/backups/backup.log 2>&1
```

Langkah aktivasi di server Linux (PROD):

1. `crontab -e` lalu tempel baris di atas (sesuaikan path `/opt/opensis`).
2. Pastikan baris ditutup newline dan server punya klien PostgreSQL
   (`pg_dump`) atau Docker dengan compose.
3. Verifikasi log setelah jadwal pertama lewat:
   `tail -n 20 deploy/backups/backup.log` — harus ada baris `[backup] Selesai:`.
4. **Wajib satu kali**: pindahkan/copy `deploy/backups/` ke penyimpanan
   off-host (mis. `rsync -av deploy/backups/ backup-server:/srv/opensis-backups/`).

> Cron memakai path relatif — selalu `cd` ke root proyek di dalam baris cron
> (seperti contoh) agar `.env` terbaca.

## 2. Backup Manual

```bash
# Dari root proyek opensis
bash deploy/scripts/backup.sh

# Dengan override env (mis. retensi 30 hari, direktori lain)
BACKUP_DIR=/srv/backups BACKUP_KEEP_DAYS=30 bash deploy/scripts/backup.sh
```

---

## 3. Restore — Langkah Demi Langkah

Restore bersifat **DESTRUKTIF**: database target di-drop (`pg_restore --clean`)
dan storage ditimpa. Pastikan Anda benar-benar ingin mengembalikan titik waktu
tersebut.

### 3a. Verifikasi dump sebelum restore (disarankan)

```bash
bash deploy/scripts/restore.sh --list deploy/backups/opensis-db-20260809-023000.dump
```

`--list` hanya menampilkan isi dump, tidak mengubah apa pun.

### 3b. Restore ke produksi (overwrite)

```bash
# Restore DB + storage sekaligus
bash deploy/scripts/restore.sh --yes \
  deploy/backups/opensis-db-20260809-023000.dump \
  deploy/backups/opensis-storage-20260809-023000.tar.gz

# Restore DB saja (tanpa --yes → diminta konfirmasi interaktif)
bash deploy/scripts/restore.sh deploy/backups/opensis-db-20260809-023000.dump
```

Alur yang dijalankan `restore.sh`:

1. Konfirmasi (kecuali `--yes`): tampilkan host/db target, minta ketik `yes`.
2. Restore DB: `.dump` → `pg_restore --clean --if-exists --no-owner`;
   `.sql` → `psql`.
3. Verifikasi singkat: daftar tabel (`\dt`) setelah restore.
4. Restore storage: `tar -xzf` ke induk `STORAGE_LOCAL_DIR`.

### 3c. Restore storage saja

Gunakan `tar` langsung (cara ini tidak menyentuh database):

```bash
# PROD: pastikan volume ter-mount lalu ekstrak
tar -xzf deploy/backups/opensis-storage-20260809-023000.tar.gz -C /app
# DEV: ekstrak ke induk apps/api/storage (lokasi storage dev nyata)
tar -xzf deploy/backups/opensis-storage-20260809-023000.tar.gz -C apps/api
```

---

## 4. Drill Plan Bulanan (Restore ke DB Terpisah)

Tujuan: membuktikan backup bisa di-restore TANPA mengganggu produksi, dengan
mengukur durasi restore (input RTO) dan memvalidasi integritas data.

Jadwal: **setiap bulan**, operator memilih satu dump terbaru untuk diuji.

### 4a. Langkah drill

```bash
# 1) Buat database drill terpisah
createdb -h localhost -U postgres opensis_drill

# 2) Restore dump ke database drill (TANPA --clean → aman)
pg_restore --no-owner \
  -d "postgresql://postgres:postgres@localhost:5432/opensis_drill" \
  deploy/backups/opensis-db-20260809-023000.dump

# 3) Verifikasi integritas
psql "postgresql://postgres:postgres@localhost:5432/opensis_drill" -c '\dt'
psql "postgresql://postgres:postgres@localhost:5432/opensis_drill" -c \
  'SELECT count(*) FROM "_prisma_migrations";'

# 4) (Opsional) bandingkan jumlah baris tabel penting dengan produksi
#    psql -c 'SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM courses);'

# 5) Restore storage ke direktori temp (jangan timpa produksi)
mkdir -p /tmp/opensis-drill-storage
tar -xzf deploy/backups/opensis-storage-20260809-023000.tar.gz -C /tmp/opensis-drill-storage
find /tmp/opensis-drill-storage -type f | wc -l      # jumlah file harus > 0

# 6) Bersihkan
dropdb -h localhost -U postgres opensis_drill
rm -rf /tmp/opensis-drill-storage
```

### 4b. Checklist penerimaan (semua harus PASS)

| #   | Item verifikasi         | Cara cek                                    | Kriteria PASS                                   |
| --- | ----------------------- | ------------------------------------------- | ----------------------------------------------- |
| 1   | Dump terbaca            | `restore.sh --list`                         | Tidak ada error, isi dump tampil                |
| 2   | DB restore tanpa error  | `pg_restore ... opensis_drill`              | Exit 0, tidak ada ERROR di output               |
| 3   | Tabel ada               | `\dt` di DB drill                           | Tabel `users`, `_prisma_migrations`, dll tampil |
| 4   | Migrasi lengkap         | `SELECT count(*) FROM "_prisma_migrations"` | Jumlah = jumlah di produksi                     |
| 5   | Storage isi             | `find ... \| wc -l`                         | Jumlah file > 0 dan masuk akal                  |
| 6   | Durasi restore tercatat | lihat template log                          | Durasi DB + storage tercatat                    |
| 7   | Log drill diisi         | template di bawah                           | Kolom hasil = PASS                              |

Jika salah satu gagal → tandai **FAIL**, buka insiden, dan ulangi backup +
drill pada dump berikutnya.

### 4c. Template log drill

Simpan sebagai `deploy/backups/drill-log-YYYY-MM.md` (satu entri per bulan):

```markdown
# Drill Restore — YYYY-MM-DD

- Operator: <nama>
- Artefak yang diuji: opensis-db-<timestamp>.dump + opensis-storage-<timestamp>.tar.gz
- DB drill: opensis_drill
- Durasi restore DB: <menit:detik>
- Durasi restore storage: <menit:detik>
- Verifikasi:
  - Jumlah tabel: <n>
  - Jumlah baris _prisma_migrations: <n>
  - Jumlah file storage: <n>
  - Perbandingan baris users/courses vs produksi: <ok/cek manual>
- Checklist: [x] 1 [x] 2 [x] 3 [x] 4 [x] 5 [x] 6 [x] 7
- Hasil: PASS / FAIL
- Catatan: <kendala / temuan>
```

---

## RPO/RTO

| Metrik                             | Target   | Pemenuhan                                                                                                                                                                    |
| ---------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RPO** (Recovery Point Objective) | ≤ 24 jam | Backup harian via cron (02:30). Data maksimal kehilangan 24 jam.                                                                                                             |
| **RTO** (Recovery Time Objective)  | ≤ 4 jam  | Prosedur restore terdokumentasi + drill bulanan. Estimasi: `pg_restore` volume kecil-menengah + `tar -xzf` storage biasanya < 1 jam; sisa waktu untuk verifikasi & validasi. |

Faktor yang menjaga RTO:

- Prosedur restore diuji tiap bulan (drill) sehingga operator hafal langkah.
- Skrip `restore.sh --yes` meminimalkan langkah manual.
- Backup tersimpan off-host sehingga tersedia saat server produksi rusak total.

Faktor yang memperbesar risiko (wajib dijaga):

- Backup hanya di disk server yang sama → hilang saat server mati. **Solusi: rsync off-host.**
- Tidak ada drill → restore pertama kali saat insiden sering gagal. **Solusi: drill bulanan wajib.**

---

## Troubleshooting

| Gejala                                                                  | Kemungkinan penyebab / solusi                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pg_dump: error: connection to server ... failed`                       | `DATABASE_URL` salah / postgres belum up. Cek `docker compose ps`, lalu `.env`.                                                      |
| `ERROR: DATABASE_URL kosong`                                            | `.env` tidak terbaca (path relatif dari `cd` berbeda). Jalankan dari root proyek atau set env eksplisit.                             |
| `pg_restore: error: could not execute query: role "..." does not exist` | Restore memakai `--no-owner`, tetapi skrip lama dump tanpa flag itu. Biasanya aman diabaikan; gunakan dump terbaru dari `backup.sh`. |
| Storage tidak muncul setelah restore                                    | Pastikan `STORAGE_LOCAL_DIR` benar (`/app/storage` PROD) dan tar diekstrak ke induk yang sama dengan asal backup.                    |
| Cron tidak jalan                                                        | Cek `crontab -l`, pastikan baris diakhiri newline, path `bash` benar (`which bash`), dan log cron: `grep CRON /var/log/syslog`.      |
