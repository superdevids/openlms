"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, DEMO_MODE } from "@/lib/api-client";
import { roleHome } from "@/lib/roles";
import { Button, Input, Label, Alert, Spinner, toast } from "@openlms/ui";

/**
 * Login — SATU metode: "Email atau Username" + Password (prd04 §5.P).
 * Tanpa Google/SSO. Error inline role="alert"; loading spinner di tombol.
 * Throttle 5 gagal → lockout 15 mnt di backend; UI menampilkan pesan 429.
 */

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Isi email/username dan kata sandi.");
      return;
    }
    setLoading(true);
    try {
      if (DEMO_MODE) {
        // Preview tanpa backend: masuk langsung ke dashboard sesuai role demo
        router.replace(roleHome("SUPERADMIN"));
        return;
      }
      await api.post("/auth/login", { identifier: identifier.trim(), password });
      toast({ variant: "success", title: "Berhasil masuk" });
      router.replace(roleHome("SISWA")); // dashboard role akan redirect via /auth/me
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError && err.code === "RATE_LIMITED"
          ? "Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi."
          : err instanceof ApiError
            ? err.message
            : "Tidak dapat terhubung ke server.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="mt-6 space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="login-identifier">Email atau Username</Label>
        <Input
          id="login-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="nama@sekolah.sch.id atau username"
          aria-required="true"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Kata sandi</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          aria-required="true"
        />
      </div>

      {error ? (
        <div role="alert" aria-live="assertive">
          <Alert variant="danger" className="text-sm">
            {error}
          </Alert>
        </div>
      ) : null}

      <Button type="submit" className="w-full" size="lg" loading={loading} disabled={loading}>
        {loading ? <Spinner className="h-4 w-4" /> : null}
        Masuk
      </Button>

      <p className="text-sm text-neutral-600">
        Lupa kata sandi? Hubungi{" "}
        <span className="font-medium text-neutral-900">OPERATOR/SUPERADMIN</span> untuk reset kata
        sandi (in-app, tanpa email/SMS).
      </p>
    </form>
  );
}
