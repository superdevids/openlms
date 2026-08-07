"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button, Dialog, IconInfo, Progress } from "@openlms/ui";
import { APP_NAME } from "@/lib/constants";

/**
 * OnboardingTour — tur fitur per role (semua role kecuali guest).
 *
 * MOUNT (oleh agent pemilik app-shell/layout):
 *   <OnboardingTour />
 * Dipasang di dalam app-shell (di dalam AuthProvider) agar muncul untuk
 * semua role terautentikasi. Mengandung tombol apung "Panduan" (kanan-bawah)
 * untuk membuka tur kapan saja.
 *
 * Perilaku:
 * - Saat pertama login: GET /onboarding/me → bila belum selesai DAN belum
 *   dismissed → tur terbuka otomatis.
 * - "Berikutnya"/"Sebelumnya" navigasi langkah; "Selesai" → PUT complete;
 *   "Lewati" → PUT dismiss.
 * - Offline/error fetch → tidak mengganggu (tidak ada tur otomatis).
 */

interface OnboardingStepData {
  key: string;
  title: string;
  description: string;
  targetSelector?: string;
}

interface OnboardingMe {
  isCompleted: boolean;
  dismissedAt: string | null;
  completedAt: string | null;
  completedSteps: string[];
  steps: OnboardingStepData[];
}

export function OnboardingTour(): React.JSX.Element {
  const { user, status } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [steps, setSteps] = React.useState<OnboardingStepData[]>([]);
  const [busy, setBusy] = React.useState(false);
  const autoChecked = React.useRef(false);

  const loadMe = React.useCallback(async (): Promise<OnboardingMe | null> => {
    try {
      return await api.get<OnboardingMe>("/onboarding/me");
    } catch {
      return null;
    }
  }, []);

  // Auto-show saat pertama login: belum selesai && belum dismissed.
  React.useEffect(() => {
    if (autoChecked.current || status !== "ready" || !user) return;
    autoChecked.current = true;
    void loadMe().then((me) => {
      if (!me || me.steps.length === 0) return;
      setSteps(me.steps);
      if (!me.isCompleted && !me.dismissedAt) {
        setStepIndex(0);
        setOpen(true);
      }
    });
  }, [status, user, loadMe]);

  // Highlight elemen target langkah (defensive; hilang saat pindah langkah).
  React.useEffect(() => {
    const target = steps[stepIndex]?.targetSelector;
    let el: HTMLElement | null = null;
    if (target) {
      try {
        const found = document.querySelector(target);
        if (found instanceof HTMLElement) {
          el = found;
        }
      } catch {
        el = null;
      }
    }
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.style.outline = "2px solid var(--brand-primary, #2563eb)";
      el.style.outlineOffset = "2px";
    }
    return () => {
      if (el) {
        el.style.outline = "";
        el.style.outlineOffset = "";
      }
    };
  }, [stepIndex, steps]);

  const openManually = (): void => {
    setStepIndex(0);
    void loadMe().then((me) => {
      if (me && me.steps.length > 0) {
        setSteps(me.steps);
      }
      setOpen(true);
    });
  };

  const complete = async (): Promise<void> => {
    setBusy(true);
    try {
      await api.put("/onboarding/me/complete");
    } catch {
      // tetap tutup — gagal complete tidak memblokir UX
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const dismiss = async (): Promise<void> => {
    setBusy(true);
    try {
      await api.put("/onboarding/me/dismiss");
    } catch {
      // tetap tutup
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const markStepDone = async (): Promise<void> => {
    const step = steps[stepIndex];
    if (!step) return;
    try {
      await api.put("/onboarding/me/progress", { stepKey: step.key, done: true });
    } catch {
      // progres opsional — jangan gagalkan navigasi
    }
  };

  const next = async (): Promise<void> => {
    await markStepDone();
    if (stepIndex >= steps.length - 1) {
      await complete();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const total = steps.length;
  const current = steps[stepIndex];
  const isLast = stepIndex >= total - 1;
  const progress = total > 0 ? ((stepIndex + 1) / total) * 100 : 0;

  return (
    <>
      {/* Tombol apung "Panduan" — kanan-bawah, membuka tur kapan saja. */}
      <button
        type="button"
        aria-label={`Buka panduan ${APP_NAME}`}
        onClick={openManually}
        className="fixed bottom-6 right-6 z-[120] flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-lg transition-colors hover:opacity-90"
        style={{ backgroundColor: "var(--brand-primary, #2563eb)" }}
      >
        <IconInfo className="h-5 w-5" />
        Panduan
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Panduan ${APP_NAME}`}
        description={`Langkah ${stepIndex + 1} dari ${total}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => void dismiss()} disabled={busy}>
              Lewati
            </Button>
            <Button
              variant="outline"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0 || busy}
            >
              Sebelumnya
            </Button>
            <Button onClick={() => void next()} disabled={busy}>
              {isLast ? "Selesai" : "Berikutnya"}
            </Button>
          </>
        }
      >
        {current ? (
          <div className="space-y-3">
            <Progress
              value={progress}
              aria-label={`Kemajuan langkah ${stepIndex + 1} dari ${total}`}
            />
            <h3 className="text-base font-semibold text-foreground">{current.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{current.description}</p>
            {isLast ? (
              <p className="rounded-md bg-accent p-3 text-xs text-accent-foreground">
                Tur selesai. Anda dapat membuka kembali panduan ini kapan saja melalui tombol
                &quot;Panduan&quot; di pojok kanan bawah.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Memuat panduan...</p>
        )}
      </Dialog>
    </>
  );
}
