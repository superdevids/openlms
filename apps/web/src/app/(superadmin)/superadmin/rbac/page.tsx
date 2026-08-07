"use client";

import * as React from "react";
import {
  errorMessage,
  fetchRbacPermissions,
  fetchRbacRolePermissions,
  updateRbacRolePermission,
  RBAC_ADMIN_ROLES,
  type RbacPermission,
  type RbacRolePermission
} from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, toast } from "@openlms/ui";

import { useApi } from "@/lib/use-api";

/** Demo fallback (NEXT_PUBLIC_DEMO=1) — RBAC endpoint belum tersedia (stub). */
const DEMO_PERMISSIONS: RbacPermission[] = [
  { id: "p1", code: "user:read:sekolah", category: "user", description: "Lihat data user" },
  { id: "p2", code: "user:write:sekolah", category: "user", description: "Kelola user" },
  { id: "p3", code: "finance:read", category: "finance", description: "Lihat keuangan" },
  { id: "p4", code: "app:write:school", category: "app", description: "Ubah pengaturan aplikasi" }
];

const DEMO_MATRIX: Record<string, Record<string, "ALLOW" | "DENY">> = {
  SUPERADMIN: {
    "user:read:sekolah": "ALLOW",
    "user:write:sekolah": "ALLOW",
    "finance:read": "ALLOW",
    "app:write:school": "ALLOW"
  },
  OPERATOR: { "user:read:sekolah": "ALLOW", "user:write:sekolah": "ALLOW" },
  KEUANGAN: { "finance:read": "ALLOW" },
  SISWA: {}
};

function buildRoleMap(rolePerms: RbacRolePermission[]): Map<string, "ALLOW" | "DENY"> {
  const map = new Map<string, "ALLOW" | "DENY">();
  for (const rp of rolePerms) {
    map.set(rp.permissionId, rp.effect);
  }
  return map;
}

export default function SuperadminRbacPage(): React.JSX.Element {
  const { status: permStatus, data: perms } = useApi<RbacPermission[]>(
    () => fetchRbacPermissions(),
    [],
    { fallbackData: DEMO_PERMISSIONS }
  );

  const [rolePerms, setRolePerms] = React.useState<Record<string, Map<string, "ALLOW" | "DENY">>>(
    {}
  );
  const [loadingRoles, setLoadingRoles] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  // Fetch permission per role (paralel).
  React.useEffect(() => {
    let cancelled = false;
    setLoadingRoles(true);
    void Promise.all(
      RBAC_ADMIN_ROLES.map(async (role) => {
        try {
          const rps = await fetchRbacRolePermissions(role);
          return { role, rps };
        } catch {
          // Endpoint RBAC belum tersedia (stub) — fallback demo bila mode demo.
          return {
            role,
            rps: (DEMO_MATRIX[role] ?? {}) as unknown as RbacRolePermission[]
          };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, Map<string, "ALLOW" | "DENY">> = {};
      for (const { role, rps } of results) {
        if (Array.isArray(rps)) {
          next[role] = buildRoleMap(rps);
        } else {
          const obj = rps as Record<string, "ALLOW" | "DENY">;
          next[role] = new Map(Object.entries(obj));
        }
      }
      setRolePerms(next);
      setLoadingRoles(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (
    role: string,
    permissionId: string,
    nextEffect: "ALLOW" | "DENY"
  ): Promise<void> => {
    const key = `${role}:${permissionId}`;
    setSavingId(key);
    // Optimistic update.
    setRolePerms((prev) => {
      const map = new Map(prev[role] ?? []);
      map.set(permissionId, nextEffect);
      return { ...prev, [role]: map };
    });
    try {
      await updateRbacRolePermission(role, permissionId, nextEffect);
      toast({ variant: "success", title: `${role} · ${permissionId} → ${nextEffect}` });
    } catch (err) {
      toast({ variant: "error", title: "Gagal memperbarui izin", description: errorMessage(err) });
    } finally {
      setSavingId(null);
    }
  };

  const permissionList = perms ?? DEMO_PERMISSIONS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Matriks Role × Permission</h1>
        <p className="text-sm text-neutral-500">
          Kontrol izin per role (<code>/rbac/*</code>). Perubahan efektif instan (otoritas role dari
          tabel <code>UserRole</code>).
        </p>
      </div>

      {permStatus === "error" ? (
        <Card>
          <CardContent className="p-4 text-sm text-danger-700">
            Endpoint <code>/rbac/permissions</code> belum tersedia (RbacAdminModule masih stub).
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            Centang = ALLOW, kosong = DENY (default scope per permission).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRoles ? (
            <p className="p-4 text-sm text-neutral-500">Memuat matriks...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium text-neutral-700">
                      Permission
                    </th>
                    {RBAC_ADMIN_ROLES.map((role) => (
                      <th
                        key={role}
                        scope="col"
                        className="px-3 py-3 text-center font-medium text-neutral-700"
                      >
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {permissionList.map((perm) => (
                    <tr key={perm.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                          {perm.code}
                        </code>
                        <span className="ml-2 text-xs text-neutral-500">{perm.description}</span>
                      </td>
                      {RBAC_ADMIN_ROLES.map((role) => {
                        const effect = rolePerms[role]?.get(perm.id);
                        const saving = savingId === `${role}:${perm.id}`;
                        return (
                          <td key={`${role}-${perm.id}`} className="px-3 py-3 text-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={effect === "ALLOW"}
                              aria-label={`${role} ${perm.code}`}
                              disabled={saving}
                              onClick={() =>
                                void toggle(role, perm.id, effect === "ALLOW" ? "DENY" : "ALLOW")
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-50 ${
                                effect === "ALLOW" ? "bg-success-600" : "bg-neutral-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  effect === "ALLOW" ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catatan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-600">
          <p>
            <Badge variant="neutral">ALLOW</Badge> izin aktif; <Badge variant="warning">DENY</Badge>{" "}
            menimpa default. Scope default (SENDIRI/KELAS/SEKOLAH) di-resolve per resource.
          </p>
          <p>
            Endpoint: <code>GET /rbac/permissions</code>,{" "}
            <code>GET /rbac/roles/:role/permissions</code>,{" "}
            <code>PUT /rbac/roles/:role/permissions/:permissionId</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
