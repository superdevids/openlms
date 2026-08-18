import type { Metadata } from "next";
import type { JSX } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@opensis/ui";
import { APP_NAME } from "@/lib/constants";
import { PageContainer, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: `Bantuan & FAQ — ${APP_NAME}`
};

const FAQ = [
  {
    q: "Lupa kata sandi, bagaimana?",
    a: "Reset password dilakukan oleh OPERATOR/SUPERADMIN secara in-app (tanpa email/SMS). Hubungi staf TU sekolah Anda."
  },
  {
    q: "Mengapa menu/modul tidak muncul?",
    a: "Setiap modul punya saklar fitur (feature flag) yang dikendalikan SUPERADMIN. Jika menu hilang, modul sedang dimatikan admin sekolah. API juga menolak akses dengan kode FEATURE_DISABLED."
  },
  {
    q: "Koneksi internet lambat saat ujian, bagaimana?",
    a: "Jawaban ujian disimpan otomatis setiap 15 detik dan di-queue lokal saat offline; ujian dikumpulkan otomatis saat waktu habis. Aktifkan mode hemat data di pengaturan profil untuk memuat gambar lebih ringan."
  },
  {
    q: "Scan QR absensi gagal / token sudah dipakai?",
    a: "Token QR sekali pakai dan kedaluwarsa 5–10 menit. Minta QR baru ke guru. Jika tetap gagal, guru dapat input manual sebagai fallback."
  },
  {
    q: "Bagaimana cara cek status PPDB?",
    a: "Buka halaman PPDB → Cek Status, lalu masukkan nomor pendaftaran Anda."
  },
  {
    q: "Apa saja role yang didukung?",
    a: "Siswa, Guru, Guru BK, Operator/TU, Keuangan, Wakepsek, Kepsek, Superadmin, Wali Murid, Calon Siswa, Pembimbing Industri, Penguji Eksternal. Navigasi menu mengikuti role aktif."
  }
];

export default function SupportPage(): JSX.Element {
  return (
    <main className="landing-light min-h-screen bg-background">
      <PageContainer className="max-w-3xl">
        <header className="mb-8">
          <p className="text-lg font-bold text-primary">{APP_NAME}</p>
          <PageHeader
            title="Bantuan & FAQ"
            description="Butuh bantuan? Hubungi operator sekolah. Pertanyaan umum di bawah ini dijawab ringkas."
          />
        </header>

        <div className="space-y-3">
          {FAQ.map((f) => (
            <Card key={f.q} className="rounded-lg border-border bg-app-surface shadow-app-card">
              <CardHeader>
                <CardTitle>{f.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 rounded-lg border-status-info-border bg-status-info-bg/60 shadow-app-card">
          <CardHeader>
            <CardTitle>Kontak Operator Sekolah</CardTitle>
            <CardDescription>
              Kunjungi ruang TU pada jam kerja, atau kirim pesan lewat notifikasi aplikasi.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    </main>
  );
}
