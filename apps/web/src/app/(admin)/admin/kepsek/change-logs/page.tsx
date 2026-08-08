"use client";

import * as React from "react";
import { ChangeLogTable } from "@/components/audit/change-log-table";

/** Halaman Change Log KEPSEK — R-11 (baca audit log tingkat sekolah). */
export default function KepsekChangeLogsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Change Log</h1>
      <ChangeLogTable />
    </div>
  );
}
