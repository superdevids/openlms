"use client";

import { type JSX } from "react";

import { cn } from "../lib/utils";
import { IconCheck } from "./icons";

/**
 * Stepper wizard — 07-ux §6.4 Steps.
 * status: done / active / upcoming. aria-current="step" untuk langkah aktif.
 */
export interface StepDef {
  title: string;
  description?: string;
}

export function Steps({
  steps,
  current,
  className
}: {
  steps: StepDef[];
  current: number; // 0-based
  className?: string;
}): JSX.Element {
  return (
    <ol
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0", className)}
      aria-label="Progres wizard"
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={step.title}
            className="flex flex-1 items-center gap-2 sm:flex-col sm:items-start"
          >
            <span className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  done && "bg-success-600 text-white",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <IconCheck className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </span>
            {i < steps.length - 1 ? (
              <span className="hidden h-px flex-1 bg-border sm:block sm:mx-2" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
