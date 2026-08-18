"use client";

import type { JSX } from "react";

import { PageHeader } from "@/components/ui";
import { ClassRaporView } from "@/components/rapor/class-rapor-view";

export default function GuruRaporPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapor Kelas"
        description="Rekap nilai akhir per kelas dan ekspor PDF rapor per siswa."
      />
      <ClassRaporView />
    </div>
  );
}
