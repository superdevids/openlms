/**
 * Ikon SVG minimal (stroke, lucide-style). Semua dekoratif → aria-hidden.
 * Gunakan selalu bersanding teks label (07-ux §7: status bukan warna saja).
 */

import type { ReactNode } from "react";

interface IconProps {
  className?: string;
}

function Base({ className, children }: IconProps & { children: ReactNode }): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </Base>
  );
}

export function IconBook(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </Base>
  );
}

export function IconClipboard(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
    </Base>
  );
}

export function IconQuiz(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9.5a3 3 0 1 1 4 2.83c-.6.25-1 .8-1 1.67" />
      <path d="M12 17h.01" />
    </Base>
  );
}

export function IconExam(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M14 3h5v5" />
      <path d="m9 13 2 2 5-5" />
    </Base>
  );
}

export function IconChart(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M3 3v18h18" />
      <path d="M8 16v-5M13 16V8M18 16v-8" />
    </Base>
  );
}

export function IconQr(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M18 18h3v3h-3z" />
    </Base>
  );
}

export function IconCamera(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </Base>
  );
}

export function IconCalendar(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18" />
    </Base>
  );
}

export function IconBell(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Base>
  );
}

export function IconClock(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Base>
  );
}

export function IconAlert(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </Base>
  );
}

export function IconCheck(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}

export function IconX(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Base>
  );
}

export function IconChevronLeft(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="m15 18-6-6 6-6" />
    </Base>
  );
}

export function IconChevronRight(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="m9 18 6-6-6-6" />
    </Base>
  );
}

export function IconLogout(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Base>
  );
}

export function IconSettings(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Base>
  );
}

export function IconDatabase(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </Base>
  );
}

export function IconWallet(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </Base>
  );
}

export function IconAcademic(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M22 9 12 5 2 9l10 4 10-4Z" />
      <path d="M6 11v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
      <path d="M22 9v5" />
    </Base>
  );
}

export function IconBriefcase(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </Base>
  );
}

export function IconRocket(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </Base>
  );
}

export function IconRefresh(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </Base>
  );
}

export function IconFile(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </Base>
  );
}

export function IconBank(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M3 9 12 4l9 5v2H3V9Z" />
      <path d="M5 11v8M9.5 11v8M14.5 11v8M19 11v8" />
      <path d="M3 21h18" />
    </Base>
  );
}

export function IconGrade(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M12 3 4 21h16L12 3Z" />
      <path d="m12 9-2 6h4l-2-6Z" />
    </Base>
  );
}

export function IconPlus(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function IconSearch(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </Base>
  );
}

export function IconMenu(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Base>
  );
}

export function IconDownload(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
    </Base>
  );
}

export function IconUpload(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5M12 3v12" />
    </Base>
  );
}

export function IconFlag(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <path d="M4 21V4" />
      <path d="M4 4h13l-2 4 2 4H4" />
    </Base>
  );
}

export function IconUser(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </Base>
  );
}

export function IconLock(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Base>
  );
}

export function IconInfo(props: IconProps): React.JSX.Element {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 12v4" />
    </Base>
  );
}
