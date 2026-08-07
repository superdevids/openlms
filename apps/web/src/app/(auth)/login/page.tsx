import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk — openlms"
};

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-primary-700">openlms</p>
          <p className="mt-1 text-sm text-neutral-600">LMS & SIS Sekolah</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Masuk ke openlms</h1>
          <p className="mt-1 text-sm text-neutral-600">Masuk dengan akun sekolah Anda</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
