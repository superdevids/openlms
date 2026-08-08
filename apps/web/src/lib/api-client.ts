import type { ApiErrorBody, ErrorCode } from "@opensis/types";
import { API_BASE_FALLBACK, API_TIMEOUT_MS } from "./constants";
import { getDataSaverPreference } from "./storage";

/**
 * API client opensis — base /api/v1, credentials include (httpOnly cookie JWT).
 * Format error standar: docs/04-api-contract.md §1.6.
 * FEATURE_DISABLED (403) dilempar sebagai ApiError dengan code terkait.
 */

export const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";
export const SESSION_COOKIE = "opensis_session";
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === "1";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Array<{ field?: string; reason: string }>;
  readonly requestId?: string;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: Array<{ field?: string; reason: string }>,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

function isSaveDataActive(): boolean {
  // Preferensi eksplisit user menang (opensis_data_saver); fallback sinyal
  // koneksi browser (Save-Data / effectiveType 2g).
  const pref = getDataSaverPreference();
  if (pref === true) return true;
  if (pref === false) return false;
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const conn = nav.connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return true;
  return false;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  const hasBody = opts.body !== undefined;
  const isFormData = hasBody && opts.body instanceof FormData;
  if (hasBody && !isFormData) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  if (opts.idempotencyKey) headers.set("Idempotency-Key", opts.idempotencyKey);
  // Mode hemat data (G16): beri sinyal ke server untuk kompresi/format ringan.
  if (isSaveDataActive()) headers.set("Save-Data", "on");

  const url = `${API_BASE}${path}${buildQuery(opts.query)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      credentials: "include",
      body: hasBody
        ? isFormData
          ? (opts.body as FormData)
          : JSON.stringify(opts.body)
        : undefined,
      signal: opts.signal
    });
  } catch {
    // Jaringan/offline — jangan bentuk ApiError palsu, biarkan caller tahu.
    throw new ApiError(
      0,
      "INTERNAL",
      "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      undefined,
      undefined
    );
  }

  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    const code: ErrorCode = body?.error?.code ?? mapStatusToCode(res.status);
    const message =
      body?.error?.message ??
      (res.status === 0 ? "Koneksi terputus" : `Permintaan gagal (${res.status})`);
    throw new ApiError(res.status, code, message, body?.error?.details, body?.error?.requestId);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function mapStatusToCode(status: number): ErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  return "INTERNAL";
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">): Promise<T> =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> => apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> => apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> => apiRequest<T>(path, { ...opts, method: "PUT", body }),
  del: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">): Promise<T> =>
    apiRequest<T>(path, { ...opts, method: "DELETE" })
};

export function isFeatureDisabledError(err: unknown): boolean {
  return err instanceof ApiError && err.code === "FEATURE_DISABLED";
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

// ============================================================
// Branding — identitas visual aplikasi (/app/branding)
// ============================================================

export interface BrandingView {
  appName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: { primary: string; secondary: string; accent: string };
  radius: number | null;
  configVersion: number;
}

/** URL absolut /api/v1/app/branding untuk fetch server-side (layout). */
export function brandingApiUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? API_BASE_FALLBACK).replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) return `${base}/app/branding`;
  return `${base}/api/v1/app/branding`;
}

/** Fetch branding dari server (layout.tsx) — timeout agar tidak menggantung. */
export async function fetchBrandingServer(): Promise<BrandingView> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(brandingApiUrl(), {
      cache: "no-store",
      signal: controller.signal
    });
    if (!res.ok) {
      throw new ApiError(res.status, mapStatusToCode(res.status), "Branding tidak tersedia");
    }
    return (await res.json()) as BrandingView;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch branding dari browser (BrandingProvider / halaman superadmin). */
export async function fetchBrandingClient(signal?: AbortSignal): Promise<BrandingView> {
  return api.get<BrandingView>("/app/branding", { signal });
}

/** PATCH /app/branding — semua field opsional. */
export async function updateBranding(
  patch: Partial<{
    appName: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    radius: number;
  }>
): Promise<BrandingView> {
  return api.patch<BrandingView>("/app/branding", patch);
}

// ============================================================
// Pengaturan aplikasi — tipografi global (/app/settings)
// ============================================================

export interface AppSettingsFont {
  font_family?: string | null;
  base_font_scale?: string | null;
}

export interface AppSettingsView {
  profile?: unknown;
  settings?: {
    font?: AppSettingsFont;
    [key: string]: unknown;
  };
  updatedAt?: string;
}

/** GET /app/settings — butuh permission app:read:school (halaman superadmin). */
export async function fetchAppSettingsClient(signal?: AbortSignal): Promise<AppSettingsView> {
  return api.get<AppSettingsView>("/app/settings", { signal });
}

/** GET /app/settings/font — publik; dipakai FontSizeProvider untuk seed default. */
export async function fetchAppFontSettings(signal?: AbortSignal): Promise<AppSettingsFont> {
  return api.get<AppSettingsFont>("/app/settings/font", { signal });
}

/** PATCH /app/settings dengan settings.font — butuh app:write:school (superadmin). */
export async function updateAppFontSettings(font: AppSettingsFont): Promise<AppSettingsView> {
  return api.patch<AppSettingsView>("/app/settings", { settings: { font } });
}

/** POST /app/branding/logo | /favicon — multipart field "file". */
export async function uploadBrandingAsset(
  field: "logo" | "favicon",
  file: File
): Promise<BrandingView> {
  const form = new FormData();
  form.append("file", file);
  return api.post<BrandingView>(`/app/branding/${field}`, form);
}

// ============================================================
// RBAC admin — matriks role × permission (/rbac/*)
// ============================================================

export interface RbacPermission {
  id: string;
  code: string;
  category: string;
  description: string;
}

export interface RbacRolePermission {
  permissionId: string;
  effect: "ALLOW" | "DENY";
  scopeDefault?: string;
}

/** Role yang tampil di matriks superadmin (docs/04 §4 RBAC Matrix). */
export const RBAC_ADMIN_ROLES = [
  "SUPERADMIN",
  "OPERATOR",
  "KEUANGAN",
  "WAKEPSEK",
  "KEPSEK",
  "AUDITOR",
  "GURU",
  "BK",
  "KAPRODI",
  "SISWA",
  "WALI_MURID"
] as const;

export async function fetchRbacPermissions(): Promise<RbacPermission[]> {
  // API mengembalikan PermissionGroup[] (berkelompok per kategori) — flatten
  // ke RbacPermission[] agar matriks klien tetap datar (R-40).
  const groups = await api.get<
    Array<{
      category: string;
      permissions: Array<{ id: string; code: string; description: string }>;
    }>
  >("/rbac/permissions");
  return groups.flatMap((group) =>
    (group.permissions ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      category: group.category,
      description: p.description
    }))
  );
}

export async function fetchRbacRolePermissions(role: string): Promise<RbacRolePermission[]> {
  return api.get<RbacRolePermission[]>(`/rbac/roles/${encodeURIComponent(role)}/permissions`);
}

export async function updateRbacRolePermission(
  role: string,
  permissionId: string,
  effect: "ALLOW" | "DENY"
): Promise<RbacRolePermission> {
  return api.put<RbacRolePermission>(
    `/rbac/roles/${encodeURIComponent(role)}/permissions/${permissionId}`,
    { effect }
  );
}
