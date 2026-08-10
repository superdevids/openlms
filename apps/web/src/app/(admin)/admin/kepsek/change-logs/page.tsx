"use client";

import { type JSX } from "react";

import { ChangeLogTable } from "@/components/audit/change-log-table";
import { PageHeader } from "@/components/ui";

/** Halaman Change Log KEPSEK — R-11 (baca audit log tingkat sekolah). */
export default function KepsekChangeLogsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Log"
        description="Riwayat perubahan sistem di tingkat sekolah — hanya Superadmin & Kepala Sekolah."
      />
      <ChangeLogTable />
    </div>
  );
}
