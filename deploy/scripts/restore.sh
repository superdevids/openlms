#!/usr/bin/env bash
#
# restore.sh — Restore database PostgreSQL + storage lokal opensis
#
# ============================================================================
# CARA PAKAI
# ----------------------------------------------------------------------------
#   bash deploy/scripts/restore.sh [--yes] deploy/backups/opensis-db-YYYYMMDD-HHMMSS.dump \
#       [deploy/backups/opensis-storage-YYYYMMDD-HHMMSS.tar.gz]
#
#   --yes      Lewati konfirmasi. TANPA flag ini script meminta ketik "yes".
#   --list     Tampilkan isi file dump (verifikasi) TANPA meng-restore apa pun.
#
# DESTRUKTIF!
# ----------------------------------------------------------------------------
#   Restore DB memakai pg_restore --clean --if-exists: objek yang ada di
#   database target di-drop lalu dibuat ulang. Data saat ini HILANG.
#
#   Untuk uji aman (drill), restore ke database TERPISAH — ganti nama db di
#   DATABASE_URL, mis. postgresql://postgres:postgres@localhost:5432/opensis_drill
#   lalu jalankan pg_restore --no-owner (tanpa --clean):
#     createdb -h localhost -U postgres opensis_drill
#     pg_restore --no-owner -d postgresql://postgres:postgres@localhost:5432/opensis_drill \
#       deploy/backups/opensis-db-....dump
#
# CATATAN
#   - File .dump (format custom) → pg_restore; file .sql → psql.
#   - Klien PostgreSQL dijalankan dari HOST; bila pg_restore/psql tidak
#     tersedia di host, script otomatis memakai
#     `docker compose exec -T postgres pg_restore/psql` (pola sama backup.sh;
#     cocok untuk stack compose lokal — `localhost:5432` di dalam container
#     postgres merujuk server postgres yang sama).
#   - Storage .tar.gz diekstrak ke direktori yang sama dengan asalnya
#     (STORAGE_LOCAL_DIR, default ./storage → /app/storage di PROD).
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

# --- Baca satu variabel dari file .env (tanpa mengeksekusi isi file) --------
load_env() {
  local key="$1" file="${2:-${ENV_FILE}}" line
  [ -f "${file}" ] || return 0
  line="$(grep -E "^${key}=" "${file}" | head -n 1 | cut -d= -f2-)" || return 0
  [ -n "${line}" ] || return 0
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  printf '%s' "${line}"
}

# --- Parsing argumen --------------------------------------------------------
# Posisi: argumen 1 = file dump DB (.dump/.sql/.sql.gz), argumen 2 = storage
# (.tar.gz). Ekstensi divalidasi per posisi — argumen tunggal .tar.gz berarti
# storage-only dan TIDAK dianggap sebagai file DB (restore storage saja tidak
# didukung skrip ini; lihat deploy/BACKUP.md §3c untuk tar langsung).
CONFIRM_YES=0
LIST_ONLY=0
DB_FILE=""
STORAGE_FILE=""
POSITIONAL=()
for arg in "$@"; do
  case "${arg}" in
    --yes)
      CONFIRM_YES=1
      ;;
    --list)
      LIST_ONLY=1
      ;;
    -*)
      echo "ERROR: argumen tidak dikenal: ${arg}" >&2
      exit 1
      ;;
    *)
      POSITIONAL+=("${arg}")
      ;;
  esac
done

case "${#POSITIONAL[@]}" in
  0)
    echo "ERROR: file dump DB wajib (argumen 1)." >&2
    exit 1
    ;;
  1)
    case "${POSITIONAL[0]}" in
      *.dump|*.sql|*.sql.gz)
        DB_FILE="${POSITIONAL[0]}"
        ;;
      *.tar.gz)
        echo "ERROR: argumen tunggal .tar.gz = storage-only; restore storage tanpa DB tidak didukung. Berikan file dump DB (.dump/.sql/.sql.gz) sebagai argumen 1 — untuk restore storage saja gunakan tar langsung (deploy/BACKUP.md §3c)." >&2
        exit 1
        ;;
      *)
        echo "ERROR: argumen 1 harus .dump/.sql/.sql.gz (file dump DB), bukan: ${POSITIONAL[0]}" >&2
        exit 1
        ;;
    esac
    ;;
  2)
    case "${POSITIONAL[0]}" in
      *.dump|*.sql|*.sql.gz)
        DB_FILE="${POSITIONAL[0]}"
        ;;
      *)
        echo "ERROR: argumen 1 harus .dump/.sql/.sql.gz (file dump DB), bukan: ${POSITIONAL[0]}" >&2
        exit 1
        ;;
    esac
    case "${POSITIONAL[1]}" in
      *.tar.gz)
        STORAGE_FILE="${POSITIONAL[1]}"
        ;;
      *)
        echo "ERROR: argumen 2 harus .tar.gz (arsip storage), bukan: ${POSITIONAL[1]}" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "ERROR: terlalu banyak argumen (maks 2: file dump DB + storage .tar.gz)." >&2
    exit 1
    ;;
esac

[ -n "${DB_FILE}" ] || { echo "ERROR: file dump DB wajib (argumen 1)." >&2; exit 1; }
[ -f "${DB_FILE}" ] || { echo "ERROR: file tidak ditemukan: ${DB_FILE}" >&2; exit 1; }
if [ -n "${STORAGE_FILE}" ] && [ ! -f "${STORAGE_FILE}" ]; then
  echo "ERROR: file storage tidak ditemukan: ${STORAGE_FILE}" >&2
  exit 1
fi

# --- Konfigurasi ------------------------------------------------------------
DATABASE_URL="${DATABASE_URL:-}"
if [ -z "${DATABASE_URL}" ]; then
  DATABASE_URL="$(load_env DATABASE_URL)"
fi
if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL kosong. Set env atau isi .env di root proyek." >&2
  exit 1
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

# --- Deteksi klien PostgreSQL: host dulu, fallback docker compose (PROD) ----
# pg_restore/psql harus tersedia di host; bila tidak, semua perintah DB
# dijalankan di dalam container `postgres` (pola sama seperti backup.sh).
POSTGRES_HOST_CLIENT=1
if ! command -v pg_restore >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1; then
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    POSTGRES_HOST_CLIENT=0
    echo "[restore] pg_restore/psql tidak ada di host; fallback docker compose exec postgres"
  else
    echo "ERROR: pg_restore/psql maupun docker compose tidak tersedia. Install klien PostgreSQL (mis. postgresql-client) atau jalankan di host yang punya Docker." >&2
    exit 1
  fi
fi

target_host="$(printf '%s' "${DATABASE_URL}" | sed -E 's|^postgres(ql)?://[^@]*@||; s|[:/?].*||')"
target_db="$(printf '%s' "${DATABASE_URL}" | sed -E 's|^postgres(ql)?://[^/]*/([^?]*).*|\2|')"

# --- Mode --list: verifikasi isi dump tanpa restore -------------------------
if [ "${LIST_ONLY}" -eq 1 ]; then
  echo "[restore] Isi dump (80 baris pertama) — tidak ada yang di-restore:"
  case "${DB_FILE}" in
    *.sql|*.sql.gz)
      zcat -f "${DB_FILE}" 2>/dev/null | head -n 80
      ;;
    *)
      if [ "${POSTGRES_HOST_CLIENT}" -eq 1 ]; then
        pg_restore --list "${DB_FILE}" | head -n 80
      else
        docker compose exec -T postgres pg_restore --list < "${DB_FILE}" | head -n 80
      fi
      ;;
  esac
  exit 0
fi

# --- Konfirmasi DESTRUKTIF --------------------------------------------------
if [ "${CONFIRM_YES}" -ne 1 ]; then
  echo "PERINGATAN: restore akan MENIMPA target berikut:"
  echo "  host   : ${target_host}"
  echo "  db     : ${target_db}"
  [ -n "${STORAGE_FILE}" ] && echo "  storage: ${STORAGE_LOCAL_DIR}"
  read -r -p "Ketik 'yes' untuk melanjutkan: " answer
  [ "${answer}" = "yes" ] || { echo "Dibatalkan."; exit 1; }
else
  echo "[restore] Konfirmasi dilewati (--yes)."
fi

echo "[restore] Target: host=${target_host} db=${target_db} storage=${STORAGE_LOCAL_DIR}"

# --- Restore database -------------------------------------------------------
case "${DB_FILE}" in
  *.sql|*.sql.gz)
    echo "[restore] psql → ${target_db} (${DB_FILE})"
    if [ "${POSTGRES_HOST_CLIENT}" -eq 1 ]; then
      zcat -f "${DB_FILE}" | psql "${DATABASE_URL}"
    else
      zcat -f "${DB_FILE}" | docker compose exec -T postgres psql "${DATABASE_URL}"
    fi
    ;;
  *)
    echo "[restore] pg_restore → ${target_db} (${DB_FILE})"
    if [ "${POSTGRES_HOST_CLIENT}" -eq 1 ]; then
      pg_restore --clean --if-exists --no-owner --verbose --dbname="${DATABASE_URL}" "${DB_FILE}"
    else
      # file dump dikirim via stdin (host path tidak ter-mount di container)
      docker compose exec -T postgres pg_restore --clean --if-exists --no-owner --verbose --dbname="${DATABASE_URL}" < "${DB_FILE}"
    fi
    ;;
esac

echo "[restore] Verifikasi singkat — daftar tabel:"
if [ "${POSTGRES_HOST_CLIENT}" -eq 1 ]; then
  psql "${DATABASE_URL}" -c '\dt' | head -n 30
else
  docker compose exec -T postgres psql "${DATABASE_URL}" -c '\dt' | head -n 30
fi

# --- Restore storage --------------------------------------------------------
if [ -n "${STORAGE_FILE}" ]; then
  echo "[restore] tar -xzf → ${STORAGE_LOCAL_DIR} (${STORAGE_FILE})"
  mkdir -p "$(dirname "${STORAGE_LOCAL_DIR}")"
  tar -xzf "${STORAGE_FILE}" -C "$(dirname "${STORAGE_LOCAL_DIR}")"
  echo "[restore] Storage selesai."
fi

echo "[restore] Selesai."
