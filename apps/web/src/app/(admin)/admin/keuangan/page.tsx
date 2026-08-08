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
  Badge,
  Alert,
  Dialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  toast
} from "@opensis/ui";

import { formatRupiah, formatDate, formatNumber } from "@/lib/format";
import { DEMO_INVOICES } from "@/lib/demo";

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

export default function AdminKeuanganPage(): JSX.Element {
  const [tab, setTab] = useState("tagihan");
  // GET /finance/invoices — respons memakai snake_case (amount/paidAmount Decimal).
  const invoices = useApi<Invoice[]>(
    async () => {
      const rows = await api.get<
        Array<{
          id: string;
          type: string;
          period: string | null;
          amount: number | string;
          paidAmount: number | string;
          due_date: string;
          status: string;
        }>
      >("/finance/invoices");
      return rows.map((r) => ({
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Keuangan</h1>
          <p className="text-sm text-muted-foreground">
            Tagihan, pembayaran, denda, refund, rekonsiliasi, arus kas
          </p>
        </div>
        <Button onClick={() => setBillOpen(true)}>Buat Tagihan</Button>
      </div>

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
          {invoices.data?.length === 0 ? (
            <EmptyState
              title="Belum ada tagihan"
              description="Buat tagihan per siswa atau massal per kelas/angkatan."
            />
          ) : (
            <Card>
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
                    {(invoices.data ?? []).map((i) => (
                      <TableRow key={i.id}>
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
                                  : i.status === "REFUNDED"
                                    ? "REFUND"
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
      </TabPanel>

      <TabPanel value="pembayaran" activeValue={tab}>
        <Card>
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
        <Card>
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
        <EmptyState
          title="Belum ada refund"
          description="Refund dicatat dengan audit dan idempotency key."
        />
      </TabPanel>

      <TabPanel value="rekon" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Rekonsiliasi</CardTitle>
            <CardDescription>
              Samakan pembayaran tercatat dengan laporan bank (upload CSV).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Cocok</TableHead>
                  <TableHead>Belum Cocok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_RECON.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.bank}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{formatNumber(r.matched)}</TableCell>
                    <TableCell>
                      <Badge variant={r.unmatched > 0 ? "warning" : "success"}>{r.unmatched}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        <Card>
          <CardHeader>
            <CardTitle>Arus Kas</CardTitle>
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
                        ? "font-semibold text-success-700"
                        : "font-semibold text-danger-700"
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
