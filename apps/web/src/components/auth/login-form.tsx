"use client";

import { useState, type FormEvent, type JSX } from "react";

import { useRouter } from "next/navigation";
import { api, ApiError, DEMO_MODE } from "@/lib/api-client";
import { roleHome } from "@/lib/roles";
import { Button, Input, Label, Alert, toast, IconEye, IconEyeOff } from "@opensis/ui";

/**
 * Login — SATU metode: "Username" (NIS/NIP) + Password (prd04 §5.P).
 * Tanpa Google/SSO. Error inline role="alert"; loading spinner di tombol.
 * Throttle 5 gagal → lockout 15 mnt di backend; UI menampilkan pesan 429.
 * Logika dipertahankan: demo mode → role demo; selain itu POST /auth/login.
 */

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Isi username dan kata sandi.");
      return;
    }
    setLoading(true);
    try {
      if (DEMO_MODE) {
        // Preview tanpa backend: masuk langsung ke dashboard sesuai role demo
        router.replace(roleHome("SUPERADMIN"));
        return;
      }
      await api.post("/auth/login", { username: username.trim(), password });
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
      toast({ variant: "error", title: "Gagal masuk", description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="mt-6 space-y-5">
      {DEMO_MODE ? (
        <div className="rounded-md border border-status-info-border bg-status-info-bg px-3 py-2 text-xs text-status-info-fg">
          Mode demo aktif — tombol Masuk membuka dashboard role demo tanpa backend.
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="login-username">
          Username <span className="text-red-500">*</span>
        </Label>
        <Input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="NIS (siswa) / NIP (guru)"
          aria-required="true"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">
          Kata Sandi <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-required="true"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <IconEyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <IconEye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" aria-live="assertive">
          <Alert variant="danger" className="text-sm">
            {error}
          </Alert>
        </div>
      ) : null}

      <Button type="submit" className="w-full" size="lg" loading={loading} disabled={loading}>
        Masuk
      </Button>

      <p className="text-sm text-muted-foreground">
        Lupa kata sandi? Hubungi{" "}
        <span className="font-medium text-foreground">Operator Sekolah</span>.
      </p>
    </form>
  );
}
