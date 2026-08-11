"use client";

import { type JSX } from "react";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Button, IconWallet } from "@opensis/ui";

import { formatRupiah, formatDate } from "@/lib/format";
import { DEMO_INVOICES } from "@/lib/demo";
import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  StatusBadge,
  type StatusTone,
  EmptyStateV3
} from "@/components/ui";

interface InvoiceRow {
  type: string;
  period: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: string;
}

const INVOICE_TONE: Record<string, StatusTone> = {
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "warning",
  OVERDUE: "danger"
};

const INVOICE_LABEL: Record<string, string> = {
  PAID: "LUNAS",
  PARTIAL: "CICILAN",
  PENDING: "PENDING",
  OVERDUE: "MENUNGGAK"
};

export default function OrtuTagihanPage(): JSX.Element {
  const list = useApi<InvoiceRow[]>(
    async () => {
      const res = await api.get<{
        items: Array<{
          type: string;
          period: string | null;
          amount: number | string;
          paidAmount: number | string;
          due_date: string;
          status: string;
        }>;
        total: number;
        page: number;
        pageSize: number;
      }>("/finance/invoices", { query: { pageSize: 100 } });
      return res.items.map((r) => ({
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

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      key: "type",
      label: "Jenis",
      render: (i) => <span className="font-medium text-foreground">{i.type}</span>
    },
    {
      key: "period",
      label: "Periode",
      hideBelow: "sm",
      render: (i) => <span className="text-muted-foreground">{i.period}</span>
    },
    {
      key: "amount",
      label: "Jumlah",
      render: (i) => <span className="tabular-nums">{formatRupiah(i.amount)}</span>
    },
    {
      key: "paid",
      label: "Dibayar",
      hideBelow: "sm",
      render: (i) => (
        <span className="tabular-nums text-muted-foreground">{formatRupiah(i.paid)}</span>
      )
    },
    {
      key: "dueDate",
      label: "Jatuh Tempo",
      hideBelow: "md",
      render: (i) => <span className="text-muted-foreground">{formatDate(i.dueDate)}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (i) => (
        <StatusBadge
          status={i.status}
          mapping={INVOICE_TONE}
          label={INVOICE_LABEL[i.status] ?? i.status}
        />
      )
    },
    {
      key: "action",
      label: "Aksi",
      className: "text-right",
      render: (i) =>
        i.status === "OVERDUE" ? (
          <Link href="/support">
            <Button variant="outline" size="sm">
              Hubungi Operator
            </Button>
          </Link>
        ) : null
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tagihan Anak"
        description="Status tagihan SPP dan tunggakan anak Anda (read-only)."
        meta={<StatusBadge status="INFO" label="READ-ONLY" />}
        actions={
          <Link href="/support">
            <Button variant="outline" size="sm">
              Hubungi Operator
            </Button>
          </Link>
        }
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Tagihan anak"
      >
        {list.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconWallet className="h-5 w-5" />}
            title="Belum ada data tagihan"
            desc="Tagihan tampil saat modul keuangan aktif."
          />
        ) : (
          <DataTable<InvoiceRow>
            columns={columns}
            rows={list.data ?? []}
            keyField={(row) => `${row.period}-${row.type}`}
            emptyTitle="Belum ada data tagihan"
            emptyDesc="Tagihan tampil saat modul keuangan aktif."
          />
        )}
      </DataView>
    </div>
  );
}
