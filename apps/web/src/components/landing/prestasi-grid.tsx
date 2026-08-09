"use client";

import { useMemo, useState, type JSX } from "react";

import { cn } from "@opensis/ui";
import { StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { safeUrl } from "@/lib/safe-url";
import type { AchievementPageItem } from "@/lib/landing-pages";

/**
 * Grid prestasi + filter level (klien) untuk halaman /prestasi mandiri.
 * Data diambil server via getAchievements(); filter berjalan di browser.
 * Kartu memakai pola CardPlay (D.3) + BadgeLevel (D.8) — strip gradient di
 * atas kartu mengikuti level, pill level memakai kontras AA (B.4).
 */

const LEVEL_ORDER = ["INTERNASIONAL", "NASIONAL", "PROVINSI", "KABUPATEN", "SEKOLAH"];

/** Warna pill level (BadgeLevel D.8) — teks gelap di aksen terang (WCAG AA). */
const LEVEL_STYLE: Record<string, string> = {
  INTERNASIONAL: "bg-gradient-to-br from-emerald-500 to-cyan-500 text-[#064e3b]",
  NASIONAL: "bg-gradient-to-br from-amber-500 to-orange-500 text-[#78350f]",
  PROVINSI: "bg-gradient-to-br from-indigo-500 to-violet-500 text-white",
  KABUPATEN: "bg-cyan-400 text-[#083344]",
  SEKOLAH: "bg-muted text-muted-foreground"
};

/** Strip gradient atas kartu mengikuti level. */
const LEVEL_STRIP: Record<string, string> = {
  INTERNASIONAL: "from-emerald-400 to-cyan-400",
  NASIONAL: "from-amber-400 to-orange-400",
  PROVINSI: "from-indigo-500 to-violet-500",
  KABUPATEN: "from-cyan-400 to-teal-400",
  SEKOLAH: "from-slate-400 to-slate-500"
};

const SHADOW_SOFT = "shadow-[var(--shadow-soft)]";

/** Pill level prestasi berwarna playful (dipakai highlight & kartu). */
export function AchievementBadge({ level }: { level: string }): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
        LEVEL_STYLE[level.toUpperCase()] ?? LEVEL_STYLE.SEKOLAH
      )}
    >
      <img
        src="/landing/playful/play-check.svg"
        alt=""
        aria-hidden="true"
        className="h-3.5 w-3.5"
      />
      {level || "Umum"}
    </span>
  );
}

function labelFor(key: string): string {
  if (key === "SEMUA") return "Semua";
  return key.charAt(0) + key.slice(1).toLowerCase();
}

function formatTanggal(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}

export function PrestasiGrid({ items }: { items: AchievementPageItem[] }): JSX.Element {
  const [level, setLevel] = useState("SEMUA");

  const levels = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.level) set.add(item.level.toUpperCase());
    }
    return Array.from(set).sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
  }, [items]);

  const filtered = useMemo(
    () => (level === "SEMUA" ? items : items.filter((item) => item.level.toUpperCase() === level)),
    [items, level]
  );

  return (
    <div>
      {levels.length > 0 ? (
        <div
          className="flex flex-wrap justify-center gap-2"
          role="group"
          aria-label="Filter level prestasi"
        >
          {["SEMUA", ...levels].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setLevel(key)}
              aria-pressed={level === key}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                level === key
                  ? cn("border-brand-primary bg-brand-primary text-white", SHADOW_SOFT)
                  : "border-border bg-card text-foreground hover:border-brand-primary hover:text-brand-primary"
              )}
            >
              {labelFor(key)}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div
          className={cn(
            "mt-8 rounded-[1.5rem] border border-dashed border-border bg-card px-6 py-12 text-center",
            SHADOW_SOFT
          )}
        >
          <img
            src="/landing/playful/play-star.svg"
            alt=""
            aria-hidden="true"
            className="mx-auto h-10 w-10 opacity-70"
          />
          <p className="mt-4 font-semibold text-foreground">Belum ada prestasi di level ini</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih level lain atau kembali lagi nanti.
          </p>
        </div>
      ) : (
        <StaggerContainer className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const tanggal = formatTanggal(item.date);
            const certificateUrl = safeUrl(item.certificateUrl);
            const levelKey = (item.level || "SEKOLAH").toUpperCase();
            return (
              <StaggerItem key={item.id || item.title} className="h-full">
                <article
                  className={cn(
                    "group relative h-full overflow-hidden rounded-[1.5rem] bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(67,56,202,0.16)]",
                    SHADOW_SOFT
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
                      LEVEL_STRIP[levelKey] ?? "from-brand-primary to-cyan-400"
                    )}
                  />
                  <div className="flex h-full flex-col p-6 pt-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <AchievementBadge level={item.level || "Umum"} />
                      {tanggal ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {tanggal}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="mt-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundImage: "var(--gradient-indigo)" }}
                    >
                      <img
                        src="/landing/playful/play-star.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6"
                      />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-foreground">{item.title}</h3>
                    {item.studentName ? (
                      <p className="mt-2 text-sm text-muted-foreground">{item.studentName}</p>
                    ) : null}
                    {item.extracurricularName ? (
                      <p className="mt-1 text-xs font-semibold text-brand-secondary">
                        {item.extracurricularName}
                      </p>
                    ) : null}
                    {certificateUrl ? (
                      <a
                        href={certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-bold text-brand-primary transition-all hover:gap-2"
                      >
                        Lihat sertifikat <span aria-hidden="true">→</span>
                      </a>
                    ) : null}
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
