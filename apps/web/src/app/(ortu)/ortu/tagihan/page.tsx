"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@openlms/ui";

import { formatRupiah, formatDate } from "@/lib/format";
import { DEMO_INVOICES } from "@/lib/demo";

export default function OrtuTagihanPage(): React.JSX.Element {
  const list = useApi<
    {
      type: string;
      period: string;
      amount: number;
      paid: number;
      dueDate: string;
      status: string;
    }[]
  >(() => api.get("/invoices"), [], { fallbackData: DEMO_INVOICES });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Tagihan Anak (read-only)</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Tagihan anak"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada data tagihan"
            description="Tagihan tampil saat modul keuangan aktif."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Status Tagihan SPP</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Dibayar</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(list.data ?? []).map((i) => (
                    <TableRow key={`${i.period}-${i.type}`}>
                      <TableCell className="font-medium">{i.type}</TableCell>
                      <TableCell>{i.period}</TableCell>
                      <TableCell>{formatRupiah(i.amount)}</TableCell>
                      <TableCell>{formatRupiah(i.paid)}</TableCell>
                      <TableCell>{formatDate(i.dueDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            i.status === "PAID"
                              ? "success"
                              : i.status === "OVERDUE"
                                ? "danger"
                                : i.status === "PARTIAL"
                                  ? "warning"
                                  : "info"
                          }
                        >
                          {i.status === "PAID"
                            ? "LUNAS"
                            : i.status === "OVERDUE"
                              ? "MENUNGGAK"
                              : i.status === "PARTIAL"
                                ? "CICILAN"
                                : "PENDING"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </DataView>
    </div>
  );
}
