"use client";

import { useEffect, useRef, useState, type JSX } from "react";

import { api, API_BASE } from "@/lib/api-client";
import { Button, Card, CardContent, CardTitle, IconDatabase, toast } from "@opensis/ui";
import { PageHeader, StatusBadge } from "@/components/ui";

interface ExportLogView {
  id: string;
  status: string;
  file_url: string | null;
  record_count: number | null;
}

const DAPODIK_FILES = ["peserta_didik.csv", "pendidik.csv", "rombongan_belajar.csv"];

function downloadUrl(logId: string, filename: string): string {
  return `${API_BASE}/exports/${logId}/download?file=${encodeURIComponent(filename)}`;
}

export default function AdminDapodikPage(): JSX.Element {
  const [state, setState] = useState<"idle" | "pending" | "ready" | "error">("idle");
  const [log, setLog] = useState<ExportLogView | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, []);

  const start = async (): Promise<void> => {
    setState("pending");
    try {
      const res = await api.post<{ exportLogId: string; status: string }>("/dapodik/export");
      pollRef.current = window.setInterval(() => {
        void (async () => {
          try {
            const current = await api.get<ExportLogView>(`/exports/${res.exportLogId}`);
            setLog(current);
            if (current.status === "COMPLETED") {
              if (pollRef.current !== null) window.clearInterval(pollRef.current);
              setState("ready");
              toast({ variant: "success", title: "Ekspor Dapodik selesai" });
            } else if (current.status === "FAILED") {
              if (pollRef.current !== null) window.clearInterval(pollRef.current);
              setState("error");
              toast({ variant: "error", title: "Ekspor Dapodik gagal" });
            }
          } catch {
            // polling dilanjutkan
          }
        })();
      }, 2000);
    } catch {
      setState("error");
      toast({ variant: "error", title: "Gagal memulai ekspor Dapodik" });
    }
  };

  const statusLabel = state === "pending" ? "PENDING" : state === "error" ? "FAILED" : "IDLE";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ekspor Dapodik"
        description="Buat file CSV Dapodik (peserta didik, pendidik, rombongan belajar) untuk pelaporan data pokok pendidikan."
        actions={
          <Button
            loading={state === "pending"}
            onClick={() => void start()}
            disabled={state === "ready"}
          >
            {state === "ready" ? "Ekspor Selesai" : "Ekspor Dapodik"}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                <IconDatabase className="h-4 w-4" aria-hidden="true" />
              </span>
              <CardTitle className="text-base">Status Ekspor</CardTitle>
            </div>
            <StatusBadge status={log?.status ?? statusLabel} />
          </div>

          {state === "idle" && (
            <p className="text-sm text-muted-foreground">
              Belum ada ekspor dijalankan. Klik &quot;Ekspor Dapodik&quot; untuk membuat 3 file CSV.
            </p>
          )}

          {state === "pending" && (
            <p className="text-sm text-muted-foreground">
              Ekspor sedang diproses oleh sistem. Polling status otomatis...
            </p>
          )}

          {state === "error" && (
            <p className="text-sm text-muted-foreground">
              Ekspor gagal. Periksa data master (siswa/staf/kelas) lalu coba lagi.
            </p>
          )}

          {state === "ready" && log && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {log.record_count ?? 0} baris data berhasil diekspor. Unduh file:
              </p>
              <ul className="space-y-1.5">
                {DAPODIK_FILES.map((filename) => (
                  <li key={filename}>
                    <a
                      href={downloadUrl(log.id, filename)}
                      download
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
