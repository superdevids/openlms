"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Input,
  Label,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  IconChevronLeft,
  IconChevronRight,
  IconSearch
} from "@openlms/ui";

/**
 * ChangeLogTable — tampilan change-log sistem (R-11).
 * Dipakai di halaman SUPERADMIN (/superadmin/change-logs) dan KEPSEK
 * (/admin/kepsek/change-logs). Baca-only: GET /admin/change-logs dengan
 * filter entity/actorId/action/from/to + pagination (pageSize ≤ 100).
 * RBAC di API (Roles SUPERADMIN/KEPSEK + audit:read:school) — UI hanya menampilkan.
 */

interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogPage {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "LOGIN", "LOCKOUT"];

const DEMO_PAGE: AuditLogPage = {
  items: [
    {
      id: "au1",
      actorId: "u1",
      actorName: "Superadmin",
      actorRole: "SUPERADMIN",
      action: "CREATE",
      entity: "announcement",
      entityId: "ann_1",
      before: null,
      after: { title: "Libur Idul Fitri" },
      ipAddress: "127.0.0.1",
      createdAt: "2026-08-06T08:12:00.000Z"
    },
    {
      id: "au2",
      actorId: "u2",
      actorName: "Budi Santoso",
      actorRole: "KEPSEK",
      action: "UPDATE",
      entity: "official_letter",
      entityId: "letter_1",
      before: { status: "SUBMITTED" },
      after: { status: "APPROVED" },
      ipAddress: "127.0.0.1",
      createdAt: "2026-08-05T14:40:00.000Z"
    }
  ],
  total: 2,
  page: 1,
  pageSize: 20
};

function formatWaktu(value: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function actionVariant(action: string): "success" | "warning" | "danger" | "neutral" {
  if (action === "CREATE" || action === "LOGIN") return "success";
  if (action === "UPDATE") return "warning";
  if (action === "DELETE" || action === "LOCKOUT") return "danger";
  return "neutral";
}

function entityLabel(entity: string): string {
  return entity.replace(/_/g, " ");
}

export function ChangeLogTable(): React.JSX.Element {
  const [entity, setEntity] = React.useState("");
  const [actorId, setActorId] = React.useState("");
  const [action, setAction] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [applied, setApplied] = React.useState(0);
  const pageSize = 20;

  const entitiesApi = useApi<string[]>(
    (signal) => api.get<string[]>("/admin/change-logs/entities", { signal }),
    [],
    { enabled: !DEMO_MODE }
  );

  const logApi = useApi<AuditLogPage>(
    (signal) =>
      api.get<AuditLogPage>("/admin/change-logs", {
        signal,
        query: {
          entity: entity || undefined,
          actorId: actorId || undefined,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          pageSize
        }
      }),
    [entity, actorId, action, from, to, page, applied],
    { fallbackData: DEMO_PAGE }
  );

  const entities = entitiesApi.data ?? [];
  const logs = logApi.data?.items ?? [];
  const total = logApi.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyFilters = (): void => {
    setPage(1);
    setApplied((v) => v + 1);
  };

  const resetFilters = (): void => {
    setEntity("");
    setActorId("");
    setAction("");
    setFrom("");
    setTo("");
    setPage(1);
    setApplied((v) => v + 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Log</CardTitle>
        <CardDescription>
          Riwayat perubahan seluruh elemen sistem — hanya Superadmin &amp; Kepala Sekolah.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter form */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="filter-entity">Entitas</Label>
            <Select
              id="filter-entity"
              aria-label="Filter entitas"
              value={entity}
              options={[
                { value: "", label: "Semua" },
                ...entities.map((e) => ({ value: e, label: entityLabel(e) }))
              ]}
              onChange={(e) => setEntity(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-actor">Aktor (user id)</Label>
            <Input
              id="filter-actor"
              aria-label="Filter aktor"
              placeholder="user id"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-action">Aksi</Label>
            <Select
              id="filter-action"
              aria-label="Filter aksi"
              value={action}
              options={[
                { value: "", label: "Semua" },
                ...ACTIONS.map((a) => ({ value: a, label: a }))
              ]}
              onChange={(e) => setAction(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-from">Dari</Label>
            <Input
              id="filter-from"
              aria-label="Dari tanggal"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-to">Sampai</Label>
            <Input
              id="filter-to"
              aria-label="Sampai tanggal"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={applyFilters}>
            <IconSearch className="h-4 w-4" /> Terapkan
          </Button>
          <Button size="sm" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>

        {/* State table */}
        {logApi.status === "loading" ? (
          <Skeleton className="h-48 w-full" />
        ) : logApi.status === "error" ? (
          <ErrorState
            error={logApi.error}
            title={logApi.error?.message ?? "Gagal memuat change log"}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            title="Belum ada catatan perubahan"
            description="Coba ubah filter atau cek kembali nanti."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aktor</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <span className="font-medium">{l.actorName ?? "-"}</span>
                      {l.actorRole ? (
                        <span className="ml-1 text-xs text-neutral-500">({l.actorRole})</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(l.action)}>{l.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                        {entityLabel(l.entity)}
                      </code>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.entityId}</TableCell>
                    <TableCell>{formatWaktu(l.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{l.ipAddress ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between gap-2 text-sm text-neutral-600">
          <span>
            Total {total} catatan · halaman {page} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
