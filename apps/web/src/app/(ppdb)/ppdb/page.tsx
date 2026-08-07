import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@openlms/ui";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `PPDB — ${APP_NAME}`
};

export default function PPDBLandingPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <p className="text-lg font-bold text-primary-700">{APP_NAME}</p>
          <Link href="/login" className="text-sm font-medium text-primary-600">
            Masuk
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <section className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900">
            PPDB {new Date().getFullYear()}/{new Date().getFullYear() + 1}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-base text-neutral-600">
            Penerimaan Peserta Didik Baru SMA Negeri Contoh — pendaftaran online, cek status secara
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

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Persyaratan</CardTitle>
              <CardDescription>KK, akta lahir, rapor semester 1 (opsional)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">File JPG/PNG/PDF maks 5MB per dokumen.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Jadwal</CardTitle>
              <CardDescription>Pendaftaran 1–20 Agustus 2026</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">
                Pengumuman 20 Agustus 2026. Verifikasi dokumen oleh TU.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kontak</CardTitle>
              <CardDescription>Operator TU sekolah</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">
                Kunjungi ruang TU pada jam kerja untuk bantuan pendaftaran.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
