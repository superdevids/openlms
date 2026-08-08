/**
 * Helper browser storage (localStorage/sessionStorage) — audit R-23.
 * - SSR guard: semua fungsi no-op aman saat dijalankan di server.
 * - Namespaced key `openlms_*` (satu sumber kebenaran — jangan hardcode
 *   string key di tempat lain; pakai STORAGE_KEYS).
 * - QuotaExceededError ditangani: safeSet/rawSet return false + console.warn.
 * - PII/disposable data (draft PPDB, attempt ujian) → pakai kind "session".
 */

export const STORAGE_KEYS = {
  theme: "openlms_theme",
  fontScale: "openlms_font_scale",
  onboardingDismissed: "openlms_onboarding_dismissed",
  demoFlags: "openlms_demo_flags",
  demoRole: "openlms_demo_role",
  brandingCache: "openlms_branding_cache",
  dashboardConfig: "openlms_dashboard_config",
  permissionSnapshot: "openlms_permissions",
  ppdbDraft: "openlms_ppdb_draft",
  examAttempt: "openlms_exam_attempt"
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
    const probe = "__openlms_probe__";
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
