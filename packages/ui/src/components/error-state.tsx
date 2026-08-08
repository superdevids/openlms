"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

/**
 * State error (07-ux §6.5): Alert danger + pesan + tombol coba lagi.
 * Paket UI bersifat stateless — pesan berasal dari props; requestId dibaca
 * dari error (ApiError milik app) lewat structural cast bila tersedia.
 */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

export function ErrorState({
  error,
  onRetry,
  title = "Terjadi kesalahan",
  description
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  /** Pesan penjelas opsional (ditampilkan di bawah pesan error otomatis). */
  description?: string;
}): React.JSX.Element {
  const message = error instanceof Error ? error.message : errorMessage(error);
  const requestId = (error as { requestId?: string } | undefined)?.requestId;
  return (
    <Alert variant="danger">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message}
        {description ? <span className="mt-1 block text-xs opacity-80">{description}</span> : null}
        {requestId ? (
          <span className="mt-1 block text-xs opacity-80">ID permintaan: {requestId}</span>
        ) : null}
        {onRetry ? (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Coba lagi
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

export function FeatureDisabledState({ feature }: { feature?: string }): React.JSX.Element {
  return (
    <Alert variant="warning">
      <AlertTitle>Fitur dinonaktifkan</AlertTitle>
      <AlertDescription>
        {feature
          ? `Modul "${feature}" sedang dimatikan oleh admin sekolah.`
          : "Modul ini sedang dimatikan oleh admin sekolah."}{" "}
        Anda tidak dapat mengakses halaman ini sampai admin mengaktifkannya.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Banner mode demo. Ditampilkan oleh pemanggil saat data fallback dipakai
 * (status "fallback" pada DataView — status itu hanya muncul saat demo aktif).
 */
export function DemoBanner({ label = "Mode demo" }: { label?: string }): React.JSX.Element | null {
  return (
    <Alert variant="info" className="mb-4">
      <AlertDescription>
        {label} — data contoh ditampilkan karena backend belum terhubung. Semua aksi tetap dipanggil
        ke API saat tersedia.
      </AlertDescription>
    </Alert>
  );
}
