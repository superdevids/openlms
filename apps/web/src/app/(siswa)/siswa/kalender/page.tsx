"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from "@openlms/ui";

import { formatDateLong } from "@/lib/format";
import { cn } from "@openlms/ui";
import { SCHEDULE_DAY_NAMES, mapScheduleEntry, type ScheduleEntryView } from "@/lib/schedule";

const DAYS = SCHEDULE_DAY_NAMES;

export default function SiswaKalenderPage(): React.JSX.Element {
  // GET /schedules dikembalikan service sebagai ScheduleEntry Prisma
  // (day_of_week 1..7, start_period/end_period) — di-map ke tampilan ringan.
  const schedule = useApi<ScheduleEntryView[]>(async () => {
    const rows = await api.get<RawScheduleEntry[]>("/schedules");
    return rows.map(mapScheduleEntry);
  }, []);

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
              const dayNo = DAYS.indexOf(day) + 1;
              const entries = (schedule.data ?? []).filter((s) => s.dayOfWeek === dayNo);
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
                                Jam ke-{e.periods}
                                {e.className ? ` · ${e.className}` : ""}
                                {e.room ? ` · ${e.room}` : ""}
                              </span>
                            </span>
                            <Badge variant="primary">Jam {e.periods.split("–")[0]}</Badge>
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

interface RawScheduleEntry {
  id: string;
  day_of_week: number;
  start_period: number;
  end_period: number;
  room?: string | null;
  class?: { id: string; name: string } | null;
  subject?: { id: string; code: string; name: string } | null;
  teacher?: { id: string; full_name: string } | null;
}
