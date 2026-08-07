"use client";

import * as React from "react";
import { cn } from "../lib/utils";

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/** Tabs aksesibel: role=tablist, arrow keys (07-ux §6.4 Tabs). */
export function Tabs({ tabs, value, onValueChange, className }: TabsProps): React.JSX.Element {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number): void => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (next !== index) {
      e.preventDefault();
      const nextTab = tabs[next];
      if (nextTab) {
        onValueChange(nextTab.value);
        refs.current[next]?.focus();
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Tab navigasi"
      className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}
    >
      {tabs.map((tab, i) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "min-h-11 whitespace-nowrap rounded-t-md px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  value,
  activeValue,
  children,
  className
}: {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      id={`panel-${value}`}
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
      hidden={value !== activeValue}
      className={cn("py-4", className)}
    >
      {children}
    </div>
  );
}
