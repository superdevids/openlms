"use client";

import { type JSX } from "react";

import { ChangeLogTable } from "@/components/audit/change-log-table";

/** Halaman Change Log SUPERADMIN — R-11 (baca seluruh audit log). */
export default function SuperadminChangeLogsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Change Log</h1>
      <ChangeLogTable />
    </div>
  );
}
