"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ApiError, DEMO_MODE } from "@/lib/api-client";
import { fetchSession, fetchDemoSession, type SessionUser } from "@/lib/session";
import { readDemoRoleOverride } from "@/lib/session";
import { toast } from "@openlms/ui";

/**
 * AuthProvider — muat session dari /auth/me (cookie httpOnly).
 * Demo mode: fallback ke DEMO_USER + override role via localStorage.
 */

interface AuthContextValue {
  user: SessionUser | null;
  status: "loading" | "ready" | "error";
  error?: ApiError;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [status, setStatus] = React.useState<AuthContextValue["status"]>("loading");
  const [error, setError] = React.useState<ApiError | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        let u: SessionUser;
        if (DEMO_MODE) {
          u = await fetchDemoSession();
        } else {
          u = await fetchSession();
        }
        if (cancelled) return;
        setUser(u);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        const apiErr =
          err instanceof ApiError ? err : new ApiError(0, "INTERNAL", "Gagal memuat sesi");
        setError(apiErr);
        setStatus("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = React.useCallback(async (): Promise<void> => {
    try {
      const { api } = await import("@/lib/api-client");
      await api.post("/auth/logout");
    } catch {
      // tetap logout lokal
    }
    setUser(null);
    toast({ variant: "success", title: "Berhasil keluar" });
    router.replace("/login");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, status, error, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}

export function useDemoRoleSwitch(): {
  role: string | null;
  setRole: (role: string) => void;
  enabled: boolean;
} {
  const [role, setRoleState] = React.useState<string | null>(() => readDemoRoleOverride());
  const setRole = React.useCallback((next: string) => {
    try {
      localStorage.setItem("openlms_demo_role", next);
    } catch {
      // abaikan
    }
    setRoleState(next);
    window.location.reload();
  }, []);
  return { role, setRole, enabled: DEMO_MODE };
}
