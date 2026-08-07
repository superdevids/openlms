"use client";

import * as React from "react";
import { ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

export function ErrorState({
  error,
  onRetry,
  title = "Terjadi kesalahan"
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
}): React.JSX.Element {
  const message = error instanceof ApiError ? error.message : errorMessage(error);
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <Alert variant="danger">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message}
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

export function DemoBanner({ label = "Mode demo" }: { label?: string }): React.JSX.Element | null {
  if (!DEMO_MODE) return null;
  return (
    <Alert variant="info" className="mb-4">
      <AlertDescription>
        {label} — data contoh ditampilkan karena backend belum terhubung. Semua aksi tetap dipanggil
        ke API saat tersedia.
      </AlertDescription>
    </Alert>
  );
}
