#!/usr/bin/env bash
#
# backup.sh — Backup database PostgreSQL + storage lokal untuk opensis
#
# ============================================================================
# CARA PAKAI
# ----------------------------------------------------------------------------
#   bash deploy/scripts/backup.sh
#
#   Variabel env (opsional; default diambil dari .env root proyek):
#     DATABASE_URL       URL koneksi PostgreSQL (default: dari .env)
#     BACKUP_DIR         Direktori tujuan backup (default: deploy/backups)
#     STORAGE_LOCAL_DIR  Direktori storage lokal (default: ./storage dari .env;
#                        fallback dev: apps/api/storage bila yang dikonfigurasi kosong)
#     BACKUP_KEEP_DAYS   Hapus backup lebih lama dari N hari (default: 14; 0 = nonaktif)
#
#   Hasil (di BACKUP_DIR):
#     opensis-db-YYYYMMDD-HHMMSS.dump          — pg_dump format custom (-Fc)
#     opensis-storage-YYYYMMDD-HHMMSS.tar.gz   — arsip tar.gz STORAGE_LOCAL_DIR
#
# CONTOH CRONTAB (setiap hari 02:30 waktu server)
# ----------------------------------------------------------------------------
#   30 2 * * * cd /opt/opensis && bash deploy/scripts/backup.sh >> deploy/backups/backup.log 2>&1
#
# CATATAN RESTORE
# ----------------------------------------------------------------------------
#   - .dump = format custom → restore dengan pg_restore:
#       bash deploy/scripts/restore.sh --yes deploy/backups/opensis-db-YYYYMMDD-HHMMSS.dump
#   - File .tar.gz storage di-restore bila dilewatkan sebagai argumen kedua:
#       bash deploy/scripts/restore.sh --yes deploy/backups/opensis-db-....dump \
#           deploy/backups/opensis-storage-....tar.gz
#   - Prasyarat host: klien PostgreSQL (pg_dump/pg_restore). Jika tidak ada,
#     script memakai `docker compose exec -T postgres pg_dump` (PROD).
#   - BACKUP_DIR sebaiknya disinkronkan off-host (rsync/object storage) agar
#     recovery benar-benar bertahan dari kegagalan server.
#
# CATATAN ATOMIC WRITE
# ----------------------------------------------------------------------------
#   - Dump DB & tar storage ditulis ke file `.tmp` dulu, lalu di-rename saat
#     sukses. Bila ada langkah gagal, file `.tmp` parsial otomatis dihapus
#     (trap EXIT) — tidak ada dump parsial yang tampak seperti backup valid.
# ============================================================================

set -euo pipefail

# --- Pembersihan file parsial bila script gagal -----------------------------
# Backup ditulis ke file .tmp dulu lalu di-rename (atomic) saat sukses; bila
# ada langkah yang gagal (exit non-zero), file .tmp dibuang agar tidak ada
# dump/storage parsial yang tertinggal dan terlihat seperti backup valid.
TMP_FILES=()
cleanup() {
  local rc=$?
  set +e
  if [ "${rc}" -ne 0 ] && [ "${#TMP_FILES[@]}" -gt 0 ]; then
    echo "[backup] Gagal (rc=${rc}); hapus file parsial:" >&2
    for f in "${TMP_FILES[@]}"; do
      if [ -f "${f}" ]; then
        echo "  ${f}" >&2
        rm -f -- "${f}"
      fi
    done
  fi
}
trap cleanup EXIT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

# --- Baca satu variabel dari file .env (tanpa mengeksekusi isi file) --------
load_env() {
  local key="$1" file="${2:-${ENV_FILE}}" line
  [ -f "${file}" ] || return 0
  line="$(grep -E "^${key}=" "${file}" | head -n 1 | cut -d= -f2-)" || return 0
  [ -n "${line}" ] || return 0
  # buang kutip di sekeliling nilai
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  # trim spasi di awal/akhir
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  printf '%s' "${line}"
}

# --- Konfigurasi ------------------------------------------------------------
DATABASE_URL="${DATABASE_URL:-}"
if [ -z "${DATABASE_URL}" ]; then
  DATABASE_URL="$(load_env DATABASE_URL)"
fi

STORAGE_LOCAL_DIR="${STORAGE_LOCAL_DIR:-}"
if [ -z "${STORAGE_LOCAL_DIR}" ]; then
  STORAGE_LOCAL_DIR="$(load_env STORAGE_LOCAL_DIR)"
fi
if [ -z "${STORAGE_LOCAL_DIR}" ]; then
  STORAGE_LOCAL_DIR="${PROJECT_ROOT}/storage"
fi
case "${STORAGE_LOCAL_DIR}" in
  /*) : ;;
  *) STORAGE_LOCAL_DIR="${PROJECT_ROOT}/${STORAGE_LOCAL_DIR}" ;;
esac

# Fallback DEV: aplikasi dev (npm run dev) menyimpan upload di apps/api/storage
# (bukan ./storage di root proyek — lihat apps/api/src/modules/storage/
# storage.constants.ts; cwd apps/api). Bila direktori yang dikonfigurasi
# tidak ada ATAU kosong, pakai apps/api/storage bila berisi — agar backup dev
# menangkap upload runtime.
if [ ! -d "${STORAGE_LOCAL_DIR}" ] || [ -z "$(ls -A "${STORAGE_LOCAL_DIR}" 2>/dev/null)" ]; then
  if [ -d "${PROJECT_ROOT}/apps/api/storage" ] && [ -n "$(ls -A "${PROJECT_ROOT}/apps/api/storage" 2>/dev/null)" ]; then
    echo "[backup] STORAGE_LOCAL_DIR (${STORAGE_LOCAL_DIR}) tidak ada/kosong; fallback ke ${PROJECT_ROOT}/apps/api/storage"
    STORAGE_LOCAL_DIR="${PROJECT_ROOT}/apps/api/storage"
  fi
fi

BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/deploy/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL kosong. Set env atau isi .env di root proyek." >&2
  exit 1
fi

# --- Mulai ------------------------------------------------------------------
TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

echo "[backup] Mulai $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "[backup] BACKUP_DIR        = ${BACKUP_DIR}"
echo "[backup] STORAGE_LOCAL_DIR = ${STORAGE_LOCAL_DIR}"

# --- 1) Database PostgreSQL -------------------------------------------------
DB_DUMP="${BACKUP_DIR}/opensis-db-${TS}.dump"
DB_DUMP_TMP="${DB_DUMP}.tmp"
TMP_FILES+=("${DB_DUMP_TMP}")
if command -v pg_dump >/dev/null 2>&1; then
  echo "[backup] pg_dump (host) → ${DB_DUMP}"
  pg_dump --format=custom --no-owner "${DATABASE_URL}" > "${DB_DUMP_TMP}"
else
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "[backup] pg_dump tidak ada di host; fallback docker compose exec postgres → ${DB_DUMP}"
    postgres_user="$(load_env POSTGRES_USER)"; [ -n "${postgres_user}" ] || postgres_user="${POSTGRES_USER:-postgres}"
    postgres_db="$(load_env POSTGRES_DB)";     [ -n "${postgres_db}" ]   || postgres_db="${POSTGRES_DB:-opensis}"
    postgres_pass="$(load_env POSTGRES_PASSWORD)"; [ -n "${postgres_pass}" ] || postgres_pass="${POSTGRES_PASSWORD:-postgres}"
    docker compose exec -T -e PGPASSWORD="${postgres_pass}" postgres \
      pg_dump --format=custom --no-owner --username="${postgres_user}" --dbname="${postgres_db}" \
      > "${DB_DUMP_TMP}"
  else
    echo "ERROR: pg_dump maupun docker compose tidak tersedia. Install klien PostgreSQL (mis. postgresql-client) atau jalankan di host yang punya Docker." >&2
    exit 1
  fi
fi
# Rename hanya setelah pg_dump sukses → tidak ada dump parsial yang "jadi".
mv "${DB_DUMP_TMP}" "${DB_DUMP}"

# --- Smoke check dump -------------------------------------------------------
# Pastikan dump VALID (format custom terbaca pg_restore) SEBELUM dianggap
# backup sukses — gagal verifikasi = backup dianggap gagal (exit non-zero).
if command -v pg_restore >/dev/null 2>&1; then
  echo "[backup] Verifikasi dump: pg_restore --list"
  pg_restore --list "${DB_DUMP}" >/dev/null 2>&1 || {
    echo "ERROR: dump tidak valid (pg_restore --list gagal): ${DB_DUMP}" >&2
    exit 1
  }
else
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "[backup] Verifikasi dump: pg_restore --list via docker compose exec"
    docker compose exec -T postgres pg_restore --list - < "${DB_DUMP}" >/dev/null 2>&1 || {
      echo "ERROR: dump tidak valid (pg_restore --list via docker gagal): ${DB_DUMP}" >&2
      exit 1
    }
  else
    echo "[backup] WARN: pg_restore maupun docker tidak tersedia; verifikasi dump dilewati." >&2
  fi
fi

# --- 2) Storage lokal -------------------------------------------------------
STORAGE_TAR=""
if [ -d "${STORAGE_LOCAL_DIR}" ]; then
  STORAGE_TAR="${BACKUP_DIR}/opensis-storage-${TS}.tar.gz"
  STORAGE_TAR_TMP="${STORAGE_TAR}.tmp"
  TMP_FILES+=("${STORAGE_TAR_TMP}")
  echo "[backup] tar → ${STORAGE_TAR}"
  tar -czf "${STORAGE_TAR_TMP}" -C "$(dirname "${STORAGE_LOCAL_DIR}")" "$(basename "${STORAGE_LOCAL_DIR}")"
  mv "${STORAGE_TAR_TMP}" "${STORAGE_TAR}"
else
  echo "[backup] WARN: direktori storage tidak ada (${STORAGE_LOCAL_DIR}); storage dilewati." >&2
fi

# --- 3) Ringkasan -----------------------------------------------------------
echo "[backup] Selesai:"
echo "  DB      : ${DB_DUMP} ($(du -h "${DB_DUMP}" | cut -f1))"
[ -n "${STORAGE_TAR}" ] && echo "  Storage : ${STORAGE_TAR} ($(du -h "${STORAGE_TAR}" | cut -f1))"

# --- 4) Retensi (hapus backup lebih lama dari BACKUP_KEEP_DAYS) -------------
if [ "${BACKUP_KEEP_DAYS}" -gt 0 ] 2>/dev/null; then
  # Sertakan *.tmp lama (sisa crash/SIGKILL yang tidak tertangkap trap) agar
  # file parsial tidak menumpuk.
  find "${BACKUP_DIR}" -maxdepth 1 -type f \
    \( -name 'opensis-db-*.dump' -o -name 'opensis-storage-*.tar.gz' \
       -o -name 'opensis-db-*.dump.tmp' -o -name 'opensis-storage-*.tar.gz.tmp' \) \
    -mtime "+${BACKUP_KEEP_DAYS}" -delete
fi
