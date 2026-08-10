import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";
import { IconAcademic, IconBook, IconCalendar, IconCheck, IconClipboard } from "@opensis/ui";

export const metadata: Metadata = {
  title: `Masuk — ${APP_NAME}`
};

const FEATURES = [
  {
    icon: <IconClipboard className="h-5 w-5" aria-hidden="true" />,
    title: "Tugas & penilaian terpadu",
    desc: "Buat tugas, periksa esai, dan pantau nilai dalam satu alur."
  },
  {
    icon: <IconCalendar className="h-5 w-5" aria-hidden="true" />,
    title: "Absensi & ujian real-time",
    desc: "QR absensi dan token sesi ujian untuk kelas yang lebih tertib."
  },
  {
    icon: <IconBook className="h-5 w-5" aria-hidden="true" />,
    title: "Materi & bank soal",
    desc: "Bagikan dokumen, video, dan kumpulan soal kapan pun dibutuhkan."
  }
];

export default function LoginPage(): JSX.Element {
  return (
    <main id="main" className="grid min-h-screen bg-app-bg lg:grid-cols-2">
      {/* Panel kiri — branding (desktop only, per E.7) */}
      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-accent p-10 text-white lg:flex"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <IconAcademic className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Satu platform untuk seluruh aktivitas sekolah
          </h2>
          <p className="mt-3 text-sm text-white/80">
            LMS &amp; SIS terpadu — pembelajaran, administrasi, dan pelayanan sekolah dalam satu
            tempat yang modern dan transparan.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                  {f.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{f.title}</span>
                  <span className="block text-xs text-white/75">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} {APP_NAME} — Portal Guru &amp; Staf Sekolah
        </p>
      </aside>

      {/* Panel kanan — form login */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <IconAcademic className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold text-foreground">{APP_NAME}</span>
          </div>

          <div className="rounded-lg border border-border bg-app-surface p-6 shadow-app-card sm:p-8">
            <div className="flex items-start gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Masuk ke {APP_NAME}
              </h1>
              <span
                className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg"
                aria-label="Aman"
              >
                <IconCheck className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Masuk dengan akun sekolah Anda untuk melanjutkan.
            </p>
            <LoginForm />
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/ppdb" className="font-medium text-primary hover:underline">
              Daftar PPDB
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
