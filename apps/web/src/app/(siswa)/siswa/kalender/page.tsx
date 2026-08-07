"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateLong } from "@/lib/format";
import { cn } from "@openlms/ui";

interface ScheduleEntry {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  className?: string;
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function SiswaKalenderPage(): React.JSX.Element {
  const schedule = useApi<ScheduleEntry[]>(() => api.get("/schedules"), [], {
    fallbackData: [
      { id: "sch_1", day: "Senin", startTime: "07:30", endTime: "09:00", subject: "Matematika" },
      { id: "sch_2", day: "Senin", startTime: "09:10", endTime: "10:40", subject: "Fisika" },
      {
        id: "sch_3",
        day: "Selasa",
        startTime: "07:30",
        endTime: "09:00",
        subject: "Bahasa Indonesia"
      },
      { id: "sch_4", day: "Rabu", startTime: "10:50", endTime: "12:20", subject: "Biologi" },
      { id: "sch_5", day: "Jumat", startTime: "07:30", endTime: "09:00", subject: "Kimia" }
    ]
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Kalender & Jadwal</h1>
      <p className="text-sm text-neutral-600">{formatDateLong(new Date())}</p>
      <DataView
        status={schedule.status}
        error={schedule.error}
        onRetry={schedule.refetch}
        fallbackLabel="Jadwal pelajaran"
      >
        {schedule.data?.length === 0 ? (
          <EmptyState
            title="Belum ada jadwal"
            description="Jadwal akan tampil setelah sekolah menyusunnya."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {DAYS.map((day) => {
              const entries = (schedule.data ?? []).filter((s) => s.day === day);
              return (
                <Card key={day} className={cn(entries.length === 0 && "opacity-60")}>
                  <CardHeader>
                    <CardTitle>{day}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {entries.length === 0 ? (
                      <p className="text-sm text-neutral-500">Tidak ada jadwal</p>
                    ) : (
                      <ul className="space-y-2">
                        {entries.map((e) => (
                          <li key={e.id} className="flex items-center justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-neutral-900">
                                {e.subject}
                              </span>
                              <span className="block text-xs text-neutral-600">
                                {e.startTime} – {e.endTime}
                              </span>
                            </span>
                            <Badge variant="primary">{e.startTime}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DataView>
    </div>
  );
}
