/**
 * Konstanta modul Ujian Online (prd04 §5.A.6; docs/05 M-EXAM-T1..T12).
 */

/** Event aktivitas yang dicatat ke ExamAttempt.device_info.activities. */
export const ALLOWED_ACTIVITY_EVENTS = [
  "INITIAL",
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "WINDOW_FOCUS",
  "VISIBILITY_HIDDEN",
  "VISIBILITY_VISIBLE",
  "COPY",
  "PASTE",
  "SCREENSHOT",
  "FULLSCREEN_EXIT",
  "SUBMIT",
  "EXPIRED"
] as const;
