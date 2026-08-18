"use client";

import type { JSX } from "react";

import { PageHeader } from "@/components/ui";
import { ClassRaporView } from "@/components/rapor/class-rapor-view";

export default function AdminRaporPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapor Sekolah"
        description="Rekap rapor seluruh kelas dan ekspor PDF rapor per siswa."
      />
      <ClassRaporView />
    </div>
  );
}
