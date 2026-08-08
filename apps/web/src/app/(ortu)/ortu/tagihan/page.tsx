"use client";

import { type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState
} from "@opensis/ui";

import { formatRupiah, formatDate } from "@/lib/format";
import { DEMO_INVOICES } from "@/lib/demo";

// Definisi kolom tabel — header dirender lewat KOLOM.map() agar konsisten.
const INVOICE_KOLOM: { key: string; label: string }[] = [
  { key: "jenis", label: "Jenis" },
  { key: "periode", label: "Periode" },
  { key: "jumlah", label: "Jumlah" },
  { key: "dibayar", label: "Dibayar" },
  { key: "jatuhTempo", label: "Jatuh Tempo" },
  { key: "status", label: "Status" }
];

export default function OrtuTagihanPage(): JSX.Element {
  const list = useApi<
    {
      type: string;
      period: string;
      amount: number;
      paid: number;
      dueDate: string;
      status: string;
    }[]
  >(
    async () => {
      const rows = await api.get<
        Array<{
          type: string;
          period: string | null;
          amount: number | string;
          paidAmount: number | string;
          due_date: string;
          status: string;
        }>
      >("/finance/invoices");
      return rows.map((r) => ({
        type: r.type,
        period: r.period ?? "",
        amount: Number(r.amount),
        paid: Number(r.paidAmount),
        dueDate: r.due_date,
        status: r.status
      }));
    },
    [],
    { fallbackData: DEMO_INVOICES }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Tagihan Anak (read-only)</h1>
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
                    {INVOICE_KOLOM.map((k) => (
                      <TableHead key={k.key}>{k.label}</TableHead>
                    ))}
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
