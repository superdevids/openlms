"use client";

import { type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, IconCalendar } from "@opensis/ui";

import { formatDateLong } from "@/lib/format";
import { cn } from "@opensis/ui";
import { SCHEDULE_DAY_NAMES, mapScheduleEntry, type ScheduleEntryView } from "@/lib/schedule";
import { PageHeader, StatusBadge, EmptyStateV3 } from "@/components/ui";

const DAYS = SCHEDULE_DAY_NAMES;

export default function SiswaKalenderPage(): JSX.Element {
  // GET /schedules dikembalikan service sebagai ScheduleEntry Prisma
  // (day_of_week 1..7, start_period/end_period) — di-map ke tampilan ringan.
  const schedule = useApi<ScheduleEntryView[]>(async () => {
    const rows = await api.get<RawScheduleEntry[]>("/schedules");
    return rows.map(mapScheduleEntry);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Kalender & Jadwal" description={formatDateLong(new Date())} />
      <DataView
        status={schedule.status}
        error={schedule.error}
        onRetry={schedule.refetch}
        fallbackLabel="Jadwal pelajaran"
      >
        {schedule.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconCalendar className="h-5 w-5" />}
            title="Belum ada jadwal"
            desc="Jadwal akan tampil setelah sekolah menyusunnya."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {DAYS.map((day) => {
              const dayNo = DAYS.indexOf(day) + 1;
              const entries = (schedule.data ?? []).filter((s) => s.dayOfWeek === dayNo);
              return (
                <Card
                  key={day}
                  className={cn(
                    "rounded-lg border-border bg-app-surface shadow-app-card",
                    entries.length === 0 && "opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{day}</p>
                    {entries.length > 0 ? (
                      <StatusBadge status="JAM" label={`${entries.length} jadwal`} />
                    ) : null}
                  </div>
                  <div className="p-4">
                    {entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tidak ada jadwal</p>
                    ) : (
                      <ul className="space-y-2">
                        {entries.map((e) => (
                          <li
                            key={e.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-app-surface-2/40 px-3 py-2"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {e.subject}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Jam ke-{e.periods}
                                {e.className ? ` · ${e.className}` : ""}
                                {e.room ? ` · ${e.room}` : ""}
                              </span>
                            </span>
                            <StatusBadge
                              status="JAM"
                              label={`Jam ${e.periods.split("–")[0]}`}
                              className="shrink-0"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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
