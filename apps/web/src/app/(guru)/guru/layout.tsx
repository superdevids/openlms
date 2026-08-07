"use client";

import * as React from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function GuruLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <AuthProvider>
      <AppShell roleGroup="guru">{children}</AppShell>
    </AuthProvider>
  );
}
