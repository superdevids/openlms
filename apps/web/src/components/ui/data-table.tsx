import type { CSSProperties, JSX, ReactNode } from "react";

import {
  Card,
  Skeleton,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
  IconChevronLeft,
  IconChevronRight
} from "@opensis/ui";
import { EmptyStateV3 } from "./empty-state-v3";

export interface DataTableColumn<T> {
  key: string;
  label: ReactNode;
  className?: string;
  render?: (row: T) => ReactNode;
  /** Sembunyikan kolom di layar kecil (mobile-first). */
  hideBelow?: "sm" | "md" | "lg";
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyField: keyof T | ((row: T) => string);
  loading?: boolean;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyAction?: ReactNode;
  pagination?: DataTablePagination;
  onRowClick?: (row: T) => void;
  /** Tinggi maksimum wrapper (default 560px) — memicu sticky header. */
  maxHeight?: string;
  className?: string;
}

function rowKeyOf<T>(row: T, keyField: keyof T | ((row: T) => string)): string {
  if (typeof keyField === "function") return keyField(row);
  return String(row[keyField] ?? "");
}

const hideBelowClass: Record<NonNullable<DataTableColumn<never>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell"
};

/**
 * DataTable — tabel data aplikasi v3 (spec D.4).
 * Sticky header (wrapper max-h + overflow-auto), baris hover, dense
 * (px-3 py-2.5), pagination sederhana, empty row via EmptyStateV3,
 * skeleton saat loading.
 */
export function DataTable<T>({
  columns,
  rows,
  keyField,
  loading = false,
  emptyTitle = "Belum ada data",
  emptyDesc,
  emptyAction,
  pagination,
  onRowClick,
  maxHeight = "560px",
  className
}: DataTableProps<T>): JSX.Element {
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;
  const from =
    pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const to = pagination
    ? Math.min(pagination.total, pagination.page * pagination.pageSize)
    : rows.length;
  const scrollStyle: CSSProperties | undefined = maxHeight ? { maxHeight } : undefined;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-lg border-border bg-app-surface shadow-app-card",
        className
      )}
    >
      <div className="overflow-auto rounded-lg" style={scrollStyle}>
        <table className="w-full min-w-full text-left text-sm">
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    col.hideBelow ? hideBelowClass[col.hideBelow] : null,
                    col.className
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5",
                        col.hideBelow ? hideBelowClass[col.hideBelow] : null
                      )}
                    >
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="px-3 py-2.5">
                  <EmptyStateV3 title={emptyTitle} desc={emptyDesc} action={emptyAction} />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKeyOf(row, keyField)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  className={cn(
                    onRowClick &&
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5 text-sm",
                        col.hideBelow ? hideBelowClass[col.hideBelow] : null,
                        col.className
                      )}
                    >
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>

      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {pagination.total === 0
              ? "Tidak ada data"
              : `Menampilkan ${from}–${to} dari ${pagination.total}`}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="flex h-9 items-center gap-1 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              aria-label="Halaman sebelumnya"
            >
              <IconChevronLeft className="h-4 w-4" aria-hidden="true" />
              Prev
            </button>
            <span className="px-1 text-xs text-muted-foreground">
              {pagination.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="flex h-9 items-center gap-1 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              aria-label="Halaman berikutnya"
            >
              Next
              <IconChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
