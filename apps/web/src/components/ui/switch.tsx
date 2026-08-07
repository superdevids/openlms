"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.ComponentProps<"button">, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
}

/** Toggle aksesibel dengan teks state ON/OFF (07-ux §6.4 Switch). */
export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
  id,
  ...props
}: SwitchProps): React.JSX.Element {
  const switchId = id ?? React.useId();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked ? "bg-primary" : "bg-input"
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
      {label ? (
        <span className="text-sm font-medium text-foreground" id={`${switchId}-label`}>
          {label}
        </span>
      ) : null}
      <span className="sr-only">{checked ? "ON" : "OFF"}</span>
    </div>
  );
}
