import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@openlms/ui";
import { APP_NAME } from "@/lib/constants";

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

export default function SupportPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <p className="text-lg font-bold text-primary-700">{APP_NAME}</p>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">Bantuan & FAQ</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Butuh bantuan? Hubungi operator sekolah. Pertanyaan umum di bawah ini dijawab ringkas.
          </p>
        </header>

        <div className="space-y-3">
          {FAQ.map((f) => (
            <Card key={f.q}>
              <CardHeader>
                <CardTitle>{f.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-700">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 bg-primary-100">
          <CardHeader>
            <CardTitle>Kontak Operator Sekolah</CardTitle>
            <CardDescription>
              Kunjungi ruang TU pada jam kerja, atau kirim pesan lewat notifikasi aplikasi.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
