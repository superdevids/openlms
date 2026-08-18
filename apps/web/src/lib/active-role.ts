"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@opensis/types";
import { roleHome, switchableRoles, resolveActiveRole } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

/**
 * Multi-role switcher (item 18) — user dengan beberapa role aktif bisa memilih
 * "peran aktif" yang menentukan dashboard & menu yang dilihat. Pilihan disimpan
 * di localStorage (opensis_active_role); backend tetap memakai seluruh roles
 * milik user untuk otorisasi (guard roles[] di API).
 */

export const ACTIVE_ROLE_KEY = "opensis_active_role";

function readStoredRole(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    return (window.localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null) ?? null;
  } catch {
    return null;
  }
}

export function useActiveRole(user: SessionUser | null): {
  activeRole: Role | undefined;
  switchable: Role[];
  setActiveRole: (role: Role) => void;
} {
  const router = useRouter();

  const switchable = useMemo(() => (user ? switchableRoles(user.roles) : []), [user]);

  // Baca role tersimpan dari localStorage setelah mount (bukan di useMemo agar
  // tidak melanggar exhaustive-deps) dan sinkron lintas tab via storage event.
  const [storedRole, setStoredRole] = useState<Role | null | undefined>(undefined);

  useEffect(() => {
    setStoredRole(readStoredRole());
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_ROLE_KEY) setStoredRole(readStoredRole());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const activeRole = useMemo(
    () => (user ? resolveActiveRole(user, storedRole) : undefined),
    [user, storedRole]
  );

  const setActiveRole = useCallback(
    (role: Role) => {
      try {
        window.localStorage.setItem(ACTIVE_ROLE_KEY, role);
      } catch {
        // abaikan (mode privat/kuota habis)
      }
      setStoredRole(role);
      router.replace(roleHome(role));
      router.refresh();
    },
    [router]
  );

  return { activeRole, switchable, setActiveRole };
}
