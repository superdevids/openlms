import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@opensis/ui";
import { APP_NAME } from "@/lib/constants";
import { PageContainer } from "@/components/ui";

export const metadata: Metadata = {
  title: `PPDB — ${APP_NAME}`
};

export default function PPDBLandingPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <p className="text-lg font-bold text-primary">{APP_NAME}</p>
          <Link href="/login" className="text-sm font-medium text-primary">
            Masuk
          </Link>
        </div>
      </header>

      <PageContainer className="max-w-4xl">
        <section className="py-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            PPDB {new Date().getFullYear()}/{new Date().getFullYear() + 1}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-base text-muted-foreground">
            Penerimaan Peserta Didik Baru {APP_NAME} — pendaftaran online, cek status secara
            transparan.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/ppdb/daftar">
              <Button size="lg">Daftar Sekarang</Button>
            </Link>
            <Link href="/ppdb/status">
              <Button size="lg" variant="outline">
                Cek Status
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-10 sm:grid-cols-3" aria-label="Informasi PPDB">
          <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
            <CardHeader>
              <CardTitle>Persyaratan</CardTitle>
              <CardDescription>KK, akta lahir, rapor semester 1 (opsional)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                File JPG/PNG/PDF maks 5MB per dokumen.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
            <CardHeader>
              <CardTitle>Jadwal</CardTitle>
              <CardDescription>Pendaftaran 1–20 Agustus 2026</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pengumuman 20 Agustus 2026. Verifikasi dokumen oleh TU.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
            <CardHeader>
              <CardTitle>Kontak</CardTitle>
              <CardDescription>Operator TU sekolah</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Kunjungi ruang TU pada jam kerja untuk bantuan pendaftaran.
              </p>
            </CardContent>
          </Card>
        </section>
      </PageContainer>
    </main>
  );
}
