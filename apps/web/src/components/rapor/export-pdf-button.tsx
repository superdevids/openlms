"use client";

import { useEffect, useRef, useState, type JSX } from "react";

import { api, API_BASE } from "@/lib/api-client";
import { Button, toast } from "@opensis/ui";

/**
 * Tombol "Unduh PDF" rapor siswa (e-Rapor v2).
 * Alur: POST /rapor/:studentId/export-pdf (membuat DataExportLog RAPOR +
 * enqueue job) → polling GET /exports/:id tiap 2 detik → COMPLETED: tombol
 * memicu download /exports/:id/download; FAILED: umpan balik error.
 */
export function ExportPdfButton({
  studentId,
  semester,
  academicYear,
  label = "Unduh PDF",
  size = "sm"
}: {
  studentId: string;
  semester: string;
  academicYear?: string;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
}): JSX.Element {
  const [state, setState] = useState<"idle" | "pending" | "ready" | "error">("idle");
  const [downloadUrl, setDownloadUrl] = useState("");
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, []);

  const start = async (): Promise<void> => {
    setState("pending");
    try {
      const res = await api.post<{ exportLogId: string; status: string }>(
        `/rapor/${studentId}/export-pdf`,
        undefined,
        { query: { semester, academicYear } }
      );
      pollRef.current = window.setInterval(() => {
        void (async () => {
          try {
            const log = await api.get<{
              id: string;
              status: string;
              file_url: string | null;
            }>(`/exports/${res.exportLogId}`);
            if (log.status === "COMPLETED") {
              if (pollRef.current !== null) window.clearInterval(pollRef.current);
              setDownloadUrl(`${API_BASE}/exports/${log.id}/download`);
              setState("ready");
              toast({ variant: "success", title: "PDF rapor siap diunduh" });
            } else if (log.status === "FAILED") {
              if (pollRef.current !== null) window.clearInterval(pollRef.current);
              setState("error");
              toast({ variant: "error", title: "Ekspor PDF gagal" });
            }
          } catch {
            // polling dilanjutkan; status endpoint akan melempar saat selesai
          }
        })();
      }, 2000);
    } catch {
      setState("error");
      toast({ variant: "error", title: "Gagal memulai ekspor PDF" });
    }
  };

  const triggerDownload = (): void => {
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Button
      size={size}
      variant={state === "error" ? "outline" : state === "ready" ? "success" : "default"}
      loading={state === "pending"}
      onClick={() => {
        if (state === "ready") triggerDownload();
        else void start();
      }}
    >
      {state === "pending"
        ? "Menyiapkan..."
        : state === "error"
          ? "Coba Lagi"
          : state === "ready"
            ? "Unduh PDF"
            : label}
    </Button>
  );
}
