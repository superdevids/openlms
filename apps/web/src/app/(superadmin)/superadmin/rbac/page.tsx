"use client";

import { useCallback, useEffect, useState, type JSX } from "react";

import {
  errorMessage,
  fetchRbacPermissions,
  fetchRbacRolePermissions,
  updateRbacRolePermission,
  RBAC_ADMIN_ROLES,
  type RbacPermission,
  type RbacRolePermission
} from "@/lib/api-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  toast
} from "@opensis/ui";

import { useApi } from "@/lib/use-api";

function buildRoleMap(rolePerms: RbacRolePermission[]): Map<string, "ALLOW" | "DENY"> {
  const map = new Map<string, "ALLOW" | "DENY">();
  for (const rp of rolePerms) {
    map.set(rp.permissionId, rp.effect);
  }
  return map;
}

export default function SuperadminRbacPage(): JSX.Element {
  const {
    status: permStatus,
    data: perms,
    refetch: refetchPerms
  } = useApi<RbacPermission[]>(() => fetchRbacPermissions(), []);

  const [rolePerms, setRolePerms] = useState<Record<string, Map<string, "ALLOW" | "DENY">>>(
    {}
  );
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch permission per role (paralel). Gagal → state error nyata (R-40):
  // tidak ada fallback demo/stub; UI menampilkan pesan + tombol ulangi.
  const loadRoles = useCallback(() => {
    let cancelled = false;
    setLoadingRoles(true);
    setRoleError(null);
    void Promise.all(
      RBAC_ADMIN_ROLES.map(async (role) => {
        const rps = await fetchRbacRolePermissions(role);
        return { role, rps };
      })
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, Map<string, "ALLOW" | "DENY">> = {};
        for (const { role, rps } of results) {
          if (Array.isArray(rps)) {
            next[role] = buildRoleMap(rps);
          }
        }
        setRolePerms(next);
        setLoadingRoles(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setRoleError(errorMessage(err));
        setLoadingRoles(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadRoles(), [loadRoles]);

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

  const permissionList = perms ?? [];
  const hasError = permStatus === "error" || roleError !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Matriks Role × Permission</h1>
        <p className="text-sm text-muted-foreground">
          Kontrol izin per role (<code>/rbac/*</code>). Perubahan efektif instan (otoritas role dari
          tabel <code>UserRole</code>).
        </p>
      </div>

      {hasError ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-danger-700">
            <span>
              Gagal memuat data RBAC —{" "}
              {roleError ?? "endpoint /rbac/permissions tidak dapat dijangkau."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchPerms();
                loadRoles();
              }}
            >
              Ulangi
            </Button>
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
            <p className="p-4 text-sm text-muted-foreground">Memuat matriks...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  {RBAC_ADMIN_ROLES.map((role) => (
                    <TableHead key={role} className="px-3 text-center">
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionList.map((perm) => (
                  <TableRow key={perm.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{perm.code}</code>
                      <span className="ml-2 text-xs text-muted-foreground">{perm.description}</span>
                    </TableCell>
                    {RBAC_ADMIN_ROLES.map((role) => {
                      const effect = rolePerms[role]?.get(perm.id);
                      const saving = savingId === `${role}:${perm.id}`;
                      return (
                        <TableCell key={`${role}-${perm.id}`} className="px-3 text-center">
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
                              effect === "ALLOW" ? "bg-success-600" : "bg-input"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                effect === "ALLOW" ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catatan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
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
