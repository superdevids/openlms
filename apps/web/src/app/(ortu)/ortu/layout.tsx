"use client";

import { type JSX, type ReactNode } from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function OrtuLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <AuthProvider>
      <AppShell roleGroup="ortu">{children}</AppShell>
    </AuthProvider>
  );
}
