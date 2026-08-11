"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabPanel,
  Button,
  Input,
  Label,
  Select,
  Alert,
  Dialog,
  toast,
  IconAlert,
  IconBank,
  IconCheck,
  IconWallet
} from "@opensis/ui";

import { formatRupiah, formatDate, formatNumber } from "@/lib/format";
import { DEMO_INVOICES } from "@/lib/demo";
import {
  PageHeader,
  StatCard,
  StatGrid,
  DataTable,
  StatusBadge,
  EmptyStateV3,
  type DataTableColumn
} from "@/components/ui";

interface Invoice {
  id: string;
  type: string;
  period: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE" | "REFUNDED";
}

const DEMO_CASHFLOW = [
  { id: "cf_1", label: "Penerimaan SPP", amount: 18250000 },
  { id: "cf_2", label: "Uang Kegiatan", amount: 4500000 },
  { id: "cf_3", label: "Refund", amount: -250000 }
];

const DEMO_RECON = [
  { id: "rc_1", bank: "BCA", period: "2026-08", matched: 182, unmatched: 3 },
  { id: "rc_2", bank: "BRI", period: "2026-08", matched: 96, unmatched: 1 }
];

const INVOICE_STATUS_LABEL: Record<Invoice["status"], string> = {
  PAID: "LUNAS",
  OVERDUE: "MENUNGGAK",
  PARTIAL: "CICILAN",
  REFUNDED: "REFUND",
  PENDING: "PENDING"
};

const INVOICE_COLUMNS: DataTableColumn<Invoice>[] = [
  { key: "type", label: "Jenis", render: (i) => <span className="font-medium">{i.type}</span> },
  { key: "period", label: "Periode" },
  {
    key: "amount",
    label: "Jumlah",
    className: "tabular-nums",
    render: (i) => formatRupiah(i.amount)
  },
  {
    key: "paid",
    label: "Dibayar",
    className: "tabular-nums hidden md:table-cell",
    hideBelow: "md",
    render: (i) => formatRupiah(i.paid)
  },
  { key: "dueDate", label: "Jatuh Tempo", hideBelow: "md", render: (i) => formatDate(i.dueDate) },
  {
    key: "status",
    label: "Status",
    render: (i) => <StatusBadge status={i.status} label={INVOICE_STATUS_LABEL[i.status]} />
  }
];

export default function AdminKeuanganPage(): JSX.Element {
  const [tab, setTab] = useState("tagihan");
  // GET /finance/invoices — respons paginated: { items, total, page, pageSize }.
  const invoices = useApi<Invoice[]>(
    async () => {
      const res = await api.get<{
        items: Array<{
          id: string;
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
        id: r.id,
        type: r.type,
        period: r.period ?? "",
        amount: Number(r.amount),
        paid: Number(r.paidAmount),
        dueDate: r.due_date,
        status: r.status as Invoice["status"]
      }));
    },
    [],
    { fallbackData: DEMO_INVOICES }
  );

  const rows = invoices.data ?? [];
  const totalCollected = rows.reduce((s, i) => s + i.paid, 0);
  const totalOutstanding = rows.reduce((s, i) => s + (i.amount - i.paid), 0);
  const overdue = rows.filter((i) => i.status === "OVERDUE").length;
  const pendingVerify = rows.filter((i) => i.status === "PARTIAL").length;

  const [billOpen, setBillOpen] = useState(false);
  const [billType, setBillType] = useState("SPP");
  const [billAmount, setBillAmount] = useState("250000");
  const [billPeriod, setBillPeriod] = useState("2026-09");
  const [saving, setSaving] = useState(false);

  const createBulk = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({
          variant: "success",
          title: "Tagihan massal dibuat (demo)",
          description: "72 tagihan"
        });
      } else {
        // DTO CreateBulkInvoiceDto: students[] wajib + amount string + dueDate + academicYear.
        const users = await api.get<{ items: Array<{ id: string; roles: string[] }> }>(
          "/admin/users"
        );
        const students = (users.items ?? [])
          .filter((u) => u.roles.includes("SISWA"))
          .map((u) => ({ studentId: u.id }));
        if (students.length === 0) {
          toast({
            variant: "warning",
            title: "Tidak ada siswa untuk tagihan massal",
            description: "Pastikan data siswa sudah ada (Data Induk)."
          });
          setBillOpen(false);
          return;
        }
        const res = await api.post<unknown[]>("/finance/invoices/bulk", {
          students,
          type: billType,
          period: billPeriod,
          amount: String(billAmount),
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          academicYear: "2026/2027"
        });
        toast({
          variant: "success",
          title: "Tagihan dibuat",
          description: `${res.length} tagihan`
        });
      }
      setBillOpen(false);
      invoices.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal membuat tagihan" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keuangan"
        description="Tagihan, pembayaran, denda, refund, rekonsiliasi, arus kas"
        actions={<Button onClick={() => setBillOpen(true)}>Buat Tagihan</Button>}
      />

      <StatGrid>
        <StatCard
          label="Terkumpul"
          value={formatRupiah(totalCollected)}
          tone="success"
          icon={<IconCheck className="h-5 w-5" />}
          hint="total pembayaran tercatat"
          sparkline={
            rows.length > 1
              ? rows.map((i, idx) => totalCollected / Math.max(1, idx + 1))
              : undefined
          }
        />
        <StatCard
          label="Belum dibayar"
          value={formatRupiah(totalOutstanding)}
          tone="warning"
          icon={<IconWallet className="h-5 w-5" />}
          hint="sisa tagihan berjalan"
        />
        <StatCard
          label="Tunggakan"
          value={String(overdue)}
          tone="danger"
          icon={<IconAlert className="h-5 w-5" />}
          hint="tagihan melewati jatuh tempo"
          href="/admin/keuangan"
        />
        <StatCard
          label="Menunggu verifikasi"
          value={String(pendingVerify)}
          tone="info"
          icon={<IconBank className="h-5 w-5" />}
          hint="pembayaran parsial/cicilan"
        />
      </StatGrid>

      <Tabs
        tabs={[
          { value: "tagihan", label: "Tagihan" },
          { value: "pembayaran", label: "Pembayaran" },
          { value: "denda", label: "Denda" },
          { value: "refund", label: "Refund" },
          { value: "rekon", label: "Rekonsiliasi" },
          { value: "kas", label: "Arus Kas" }
        ]}
        value={tab}
        onValueChange={setTab}
      />

      <TabPanel value="tagihan" activeValue={tab}>
        <DataView
          status={invoices.status}
          error={invoices.error}
          onRetry={invoices.refetch}
          fallbackLabel="Daftar tagihan"
        >
          <DataTable
            columns={INVOICE_COLUMNS}
            rows={rows}
            keyField="id"
            emptyTitle="Belum ada tagihan"
            emptyDesc="Buat tagihan per siswa atau massal per kelas/angkatan."
            emptyAction={
              <Button size="sm" onClick={() => setBillOpen(true)}>
                Buat Tagihan
              </Button>
            }
          />
        </DataView>
      </TabPanel>

      <TabPanel value="pembayaran" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Pembayaran</CardTitle>
            <CardDescription>
              Manual-first: catat pembayaran + bukti, lalu verifikasi (04-api-contract §2.7).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  toast({
                    variant: "info",
                    title: "Form catat pembayaran",
                    description: "Bukti upload & alokasi ke invoice (demo)"
                  })
                }
              >
                Catat Pembayaran
              </Button>
              <Button
                variant="outline"
                onClick={() => toast({ variant: "success", title: "Verifikasi pembayaran (demo)" })}
              >
                Verifikasi (1 pending)
              </Button>
            </div>
            <Alert variant="info" className="text-sm">
              Payment gateway (QRIS/VA) adalah fitur opsional (OFF default) — pembayaran manual +
              rekonsiliasi CSV adalah jalur default.
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="denda" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Denda Keterlambatan</CardTitle>
            <CardDescription>
              Denda dihitung otomatis setelah tenggat; grace window per aturan sekolah (prd04
              §5.F.3).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="denda-rate">Denda per hari (%)</Label>
                <Input id="denda-rate" type="number" defaultValue={0.5} step="0.1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="denda-grace">Grace window (hari)</Label>
                <Input id="denda-grace" type="number" defaultValue={7} />
              </div>
            </div>
            <Button
              onClick={() => toast({ variant: "success", title: "Aturan denda disimpan (demo)" })}
            >
              Simpan Aturan
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="refund" activeValue={tab}>
        <EmptyStateV3
          icon={<IconBank className="h-5 w-5" />}
          title="Belum ada refund"
          desc="Refund dicatat dengan audit dan idempotency key."
        />
      </TabPanel>

      <TabPanel value="rekon" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Rekonsiliasi</CardTitle>
            <CardDescription>
              Samakan pembayaran tercatat dengan laporan bank (upload CSV).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: "bank",
                  label: "Bank",
                  render: (r) => <span className="font-medium">{r.bank}</span>
                },
                { key: "period", label: "Periode" },
                {
                  key: "matched",
                  label: "Cocok",
                  className: "tabular-nums",
                  render: (r) => formatNumber(r.matched)
                },
                {
                  key: "unmatched",
                  label: "Belum Cocok",
                  render: (r) => (
                    <StatusBadge
                      status={r.unmatched > 0 ? "MENUNGGU" : "COCOK"}
                      label={r.unmatched > 0 ? `${r.unmatched} belum cocok` : "Semua cocok"}
                      mapping={{ MENUNGGU: "warning", COCOK: "success" }}
                    />
                  )
                }
              ]}
              rows={DEMO_RECON}
              keyField="id"
              maxHeight="none"
            />
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => toast({ variant: "info", title: "Upload CSV rekonsiliasi (demo)" })}
            >
              Upload CSV Bank
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="kas" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Arus Kas</CardTitle>
            <CardDescription>Penerimaan & pengeluaran periode berjalan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {DEMO_CASHFLOW.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm text-foreground">{c.label}</span>
                  <span
                    className={
                      c.amount >= 0
                        ? "font-semibold tabular-nums text-status-success-fg"
                        : "font-semibold tabular-nums text-status-danger-fg"
                    }
                  >
                    {c.amount >= 0 ? "+" : ""}
                    {formatRupiah(c.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </TabPanel>

      <Dialog
        open={billOpen}
        onOpenChange={setBillOpen}
        title="Buat Tagihan Massal"
        description="Per kelas/angkatan (SPP) atau per siswa. Pembayaran parsial/cicilan didukung."
      >
        <form onSubmit={(e) => void createBulk(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bill-type">Jenis Tagihan</Label>
            <Select
              id="bill-type"
              value={billType}
              onChange={(e) => setBillType(e.target.value)}
              options={[
                { value: "SPP", label: "SPP" },
                { value: "UANG_KEGIATAN", label: "Uang Kegiatan" },
                { value: "UANG_DAFTAR", label: "Uang Daftar" },
                { value: "UANG_SERAGAM", label: "Uang Seragam" },
                { value: "LAINNYA", label: "Lainnya" }
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bill-period">Periode</Label>
              <Input
                id="bill-period"
                value={billPeriod}
                onChange={(e) => setBillPeriod(e.target.value)}
                placeholder="2026-09"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount">Jumlah (Rp)</Label>
              <Input
                id="bill-amount"
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBillOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Buat Tagihan
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
