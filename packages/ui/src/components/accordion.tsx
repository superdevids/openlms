"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { IconChevronDown } from "./icons";

/**
 * Accordion aksesibel — satu item bisa dibuka (bukan accordion eksklusif).
 * State lokal per item; pemakaian ganda tetap independen (07-ux §6.4).
 */

export function Accordion({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();

  return (
    <div className="rounded-lg border border-border bg-card">
      <h3>
        <button
          type="button"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-accent"
        >
          {title}
          <IconChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`} hidden={!open}>
        <div className="px-4 pb-4 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
