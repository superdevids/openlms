"use client";

import { type JSX } from "react";

import { ChangeLogTable } from "@/components/audit/change-log-table";
import { PageHeader } from "@/components/ui";

/** Halaman Change Log SUPERADMIN — R-11 (baca seluruh audit log). */
export default function SuperadminChangeLogsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Log"
        description="Riwayat perubahan seluruh elemen sistem — hanya Superadmin & Kepala Sekolah."
      />
      <ChangeLogTable />
    </div>
  );
}
