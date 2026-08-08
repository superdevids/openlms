import type { Role } from "@openlms/types";
import { api, DEMO_MODE, type ApiError } from "@/lib/api-client";
import { DEMO_ROLE_KEY, DEMO_USER } from "@/lib/demo";

/**
 * Session klien — dibaca dari /auth/me (cookie httpOnly di-set backend).
 * Role aktif dari UserRole (server-side). Hanya UX-level; otorisasi final di API.
 */

export interface SessionUser {
  id: string;
  username: string;
  email?: string | null;
  fullName: string;
  roles: Role[];
  primaryRole?: Role;
}

interface MeResponse {
  user?: SessionUser;
  roles?: Role[];
  [key: string]: unknown;
}

export function readDemoRoleOverride(): Role | null {
  if (!DEMO_MODE) return null;
  try {
    const raw = localStorage.getItem(DEMO_ROLE_KEY) as Role | null;
    return raw ?? null;
  } catch {
    return null;
  }
}

export function normalizeMe(raw: MeResponse): SessionUser {
  const base = (raw.user ?? raw) as SessionUser;
  const roles = (raw.roles ?? base.roles ?? []) as Role[];
  return {
    id: base.id ?? "",
    username: base.username ?? "",
    email: base.email ?? null,
    fullName: base.fullName ?? base.username ?? "Pengguna",
    roles,
    primaryRole: (base.primaryRole ?? roles[0]) as Role | undefined
  };
}

export async function fetchSession(signal?: AbortSignal): Promise<SessionUser> {
  const raw = await api.get<MeResponse>("/auth/me", { signal });
  return normalizeMe(raw);
}

export async function fetchDemoSession(): Promise<SessionUser> {
  const override = readDemoRoleOverride();
  return {
    ...DEMO_USER,
    roles: override ? [override] : DEMO_USER.roles
  };
}

export function toApiError(err: unknown): ApiError {
  return err as ApiError;
}

export function isUnauthorizedError(err: unknown): boolean {
  return (
    err instanceof Error && "code" in err && (err as { code?: string }).code === "UNAUTHORIZED"
  );
}
