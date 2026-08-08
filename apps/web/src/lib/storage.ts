/**
 * Helper browser storage (localStorage/sessionStorage) — audit R-23.
 * - SSR guard: semua fungsi no-op aman saat dijalankan di server.
 * - Namespaced key `opensis_*` (satu sumber kebenaran — jangan hardcode
 *   string key di tempat lain; pakai STORAGE_KEYS).
 * - QuotaExceededError ditangani: safeSet/rawSet return false + console.warn.
 * - PII/disposable data (draft PPDB, attempt ujian) → pakai kind "session".
 */

export const STORAGE_KEYS = {
  theme: "opensis_theme",
  fontScale: "opensis_font_scale",
  onboardingDismissed: "opensis_onboarding_dismissed",
  demoFlags: "opensis_demo_flags",
  demoRole: "opensis_demo_role",
  brandingCache: "opensis_branding_cache",
  dashboardConfig: "opensis_dashboard_config",
  permissionSnapshot: "opensis_permissions",
  ppdbDraft: "opensis_ppdb_draft",
  examAttempt: "opensis_exam_attempt",
  examPendingAnswers: "opensis_exam_pending_answers",
  lastReadNotif: "opensis_last_read_notif",
  dataSaver: "opensis_data_saver",
  tabState: "opensis_tab_state"
} as const;

export type StorageKind = "local" | "session";

function getStore(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Cek apakah storage tersedia (bukan private mode / storage diblokir). */
export function storageAvailable(kind: StorageKind = "local"): boolean {
  const store = getStore(kind);
  if (!store) return false;
  try {
    const probe = "__opensis_probe__";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Baca string mentah; null bila tidak ada / SSR / error. */
export function rawGet(key: string, kind: StorageKind = "local"): string | null {
  const store = getStore(kind);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** Tulis string mentah; false bila gagal (quota/private mode/SSR). */
export function rawSet(key: string, value: string, kind: StorageKind = "local"): boolean {
  const store = getStore(kind);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      console.warn(`[storage] kuota penuh untuk key "${key}"`);
    }
    return false;
  }
}

/** Hapus key; no-op bila tidak ada / SSR / error. */
export function rawRemove(key: string, kind: StorageKind = "local"): void {
  const store = getStore(kind);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    // abaikan
  }
}

/** Baca + parse JSON; null bila tidak ada / korup / SSR. */
export function safeGet<T>(key: string, kind: StorageKind = "local"): T | null {
  const raw = rawGet(key, kind);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Serialize + tulis; false bila gagal. */
export function safeSet<T>(key: string, value: T, kind: StorageKind = "local"): boolean {
  try {
    return rawSet(key, JSON.stringify(value), kind);
  } catch {
    return false;
  }
}

/** Hapus key (alias ergonomis untuk safeRemove). */
export function safeRemove(key: string, kind: StorageKind = "local"): void {
  rawRemove(key, kind);
}

// ============================================================
// Cache TTL (audit R-23) — pola { data, savedAt } + umur maksimum.
// Dipakai branding (1 jam) & dashboard config per role (30 dtk).
// ============================================================

/** Bentuk entri cache ber-TTL. */
export interface TtlCacheEntry<T> {
  data: T;
  savedAt: number;
}

/**
 * Baca cache ber-TTL; null bila tidak ada / kedaluwarsa / SSR.
 * Kedaluwarsa = (sekarang - savedAt) > ttlMs.
 */
export function ttlGet<T>(key: string, ttlMs: number, kind: StorageKind = "local"): T | null {
  const entry = safeGet<TtlCacheEntry<T>>(key, kind);
  if (!entry || typeof entry.savedAt !== "number") return null;
  if (Date.now() - entry.savedAt > ttlMs) {
    safeRemove(key, kind);
    return null;
  }
  return entry.data;
}

/** Tulis cache ber-TTL; false bila gagal (quota/private/SSR). */
export function ttlSet<T>(key: string, data: T, kind: StorageKind = "local"): boolean {
  return safeSet<TtlCacheEntry<T>>(key, { data, savedAt: Date.now() }, kind);
}

// ============================================================
// Preferensi mode hemat data (opensis_data_saver).
// true = selalu hemat; false = selalu normal; null = ikuti koneksi (default).
// ============================================================

export type DataSaverPreference = boolean | null;

/** Baca preferensi hemat data user; null bila belum diatur (auto). */
export function getDataSaverPreference(): DataSaverPreference {
  const raw = rawGet(STORAGE_KEYS.dataSaver);
  if (raw === null) return null;
  return raw === "1";
}

/** Simpan preferensi hemat data. */
export function setDataSaverPreference(value: DataSaverPreference): boolean {
  if (value === null) {
    rawRemove(STORAGE_KEYS.dataSaver);
    return true;
  }
  return rawSet(STORAGE_KEYS.dataSaver, value ? "1" : "0");
}

// ============================================================
// Timestamp baca notifikasi (opensis_last_read_notif) — badge konsisten
// lintas tab (event `storage` memicu refetch di tab lain).
// ============================================================

export function getLastReadNotif(): number | null {
  const raw = rawGet(STORAGE_KEYS.lastReadNotif);
  const num = raw ? Number(raw) : NaN;
  return Number.isFinite(num) ? num : null;
}

export function setLastReadNotif(timestamp = Date.now()): void {
  rawSet(STORAGE_KEYS.lastReadNotif, String(timestamp));
}
