import type { Metadata } from "next";
import type { JSX } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Masuk — ${APP_NAME}`
};

export default function LoginPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-primary">{APP_NAME}</p>
          <p className="mt-1 text-sm text-muted-foreground">LMS & SIS Sekolah</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-foreground">Masuk ke {APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk dengan akun sekolah Anda</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
