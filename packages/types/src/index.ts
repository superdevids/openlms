/**
 * opensis — kontrak tipe bersama (single source of truth).
 * Sumber: docs/03-database-erd.md §5 (enum), docs/prd/prd04.md §4.2/§4.3 (RBAC).
 *
 * Catatan: skema Prisma adalah sumber kebenaran database. Paket ini menyediakan
 * enum/DTO runtime untuk lapisan aplikasi (api, web) agar tidak terjadi drift.
 */

export const ROLE_VALUES = [
  "SISWA",
  "GURU",
  "BK",
  "KAPRODI",
  "KEUANGAN",
  "OPERATOR",
  "WAKEPSEK",
  "KEPSEK",
  "AUDITOR",
  "SUPERADMIN",
  "CALON_SISWA",
  "WALI_MURID",
  "PEMBIMBING_INDUSTRI",
  "PENGUJI_EKSTERNAL"
] as const;

export type Role = (typeof ROLE_VALUES)[number];

export const MEMBERSHIP_STATUS_VALUES = ["INVITED", "ACTIVE", "DISABLED"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUS_VALUES)[number];

export const SCHOOL_TYPE_VALUES = ["SMA", "SMK"] as const;
export type SchoolType = (typeof SCHOOL_TYPE_VALUES)[number];

/* Tipografi — skala ukuran teks (normal/large/big) + daftar font global (SchoolProfile.settings.font) */
export const FONT_SCALE_VALUES = ["normal", "large", "big"] as const;
export type FontScale = (typeof FONT_SCALE_VALUES)[number];

export const FONT_FAMILY_VALUES = [
  "Plus Jakarta Sans",
  "Inter",
  "Open Sans",
  "Roboto",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans 3",
  "Work Sans"
] as const;
export type FontFamily = (typeof FONT_FAMILY_VALUES)[number];

export const ENROLLMENT_STATUS_VALUES = [
  "ACTIVE",
  "TRANSFERRED",
  "GRADUATED",
  "DROPPED",
  "PROMOTED",
  "REPEATED"
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS_VALUES)[number];

export const ASSESSMENT_STATUS_VALUES = [
  "DRAFT",
  "PUBLISHED",
  "ONGOING",
  "CLOSED",
  "ARCHIVED"
] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUS_VALUES)[number];

export const ATTENDANCE_STATUS_VALUES = ["HADIR", "IZIN", "SAKIT", "ALPA", "TERLAMBAT"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS_VALUES)[number];

export const ATTENDANCE_METHOD_VALUES = ["MANUAL", "QR_CODE", "GEOFENCING", "RFID"] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHOD_VALUES)[number];

export const PAYMENT_STATUS_VALUES = [
  "PENDING",
  "PAID",
  "PARTIAL",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
  "CARRIED_OVER"
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export const INVOICE_TYPE_VALUES = [
  "SPP",
  "UANG_KEGIATAN",
  "UANG_DAFTAR",
  "UANG_SERAGAM",
  "UANG_OSIS",
  "DENDA",
  "LAINNYA"
] as const;
export type InvoiceType = (typeof INVOICE_TYPE_VALUES)[number];

export const GRADE_TYPE_VALUES = ["TUGAS", "KUIS", "UJIAN", "PRAKTIK", "SIKAP", "SUMATIF"] as const;
export type GradeType = (typeof GRADE_TYPE_VALUES)[number];

export const QUESTION_TYPE_VALUES = [
  "PILIHAN_GANDA",
  "ESAI",
  "ISIAN_SINGKAT",
  "MENJODOHKAN"
] as const;
export type QuestionType = (typeof QUESTION_TYPE_VALUES)[number];

export const DIFFICULTY_VALUES = ["MUDAH", "SEDANG", "SULIT"] as const;
export type Difficulty = (typeof DIFFICULTY_VALUES)[number];

export const ATTEMPT_STATUS_VALUES = [
  "IN_PROGRESS",
  "SUBMITTED",
  "AUTO_SUBMITTED",
  "EXPIRED",
  "FLAGGED"
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUS_VALUES)[number];

export const SUBJECT_CATEGORY_VALUES = ["WAJIB", "PILIHAN", "KEJURUAN"] as const;
export type SubjectCategory = (typeof SUBJECT_CATEGORY_VALUES)[number];

export const ACADEMIC_YEAR_STATUS_VALUES = ["DRAFT", "OPEN", "CLOSING", "CLOSED"] as const;
export type AcademicYearStatus = (typeof ACADEMIC_YEAR_STATUS_VALUES)[number];

export const ROLLOVER_RUN_STATUS_VALUES = [
  "DRAFT",
  "PREVIEW",
  "RUNNING",
  "DONE",
  "ROLLED_BACK",
  "FAILED"
] as const;
export type RolloverRunStatus = (typeof ROLLOVER_RUN_STATUS_VALUES)[number];

export const ROLLOVER_ACTION_VALUES = [
  "PROMOTED",
  "REPEATED",
  "GRADUATED",
  "TRANSFERRED",
  "DROPPED"
] as const;
export type RolloverAction = (typeof ROLLOVER_ACTION_VALUES)[number];

export const ALUMNI_STATUS_VALUES = ["ACTIVE", "ARCHIVED"] as const;
export type AlumniStatus = (typeof ALUMNI_STATUS_VALUES)[number];

export const NOTIFICATION_TYPE_VALUES = [
  "TASK_NEW",
  "TASK_GRADED",
  "EXAM_START",
  "EXAM_AUTOSUBMIT",
  "ATTENDANCE_ALPA",
  "INVOICE_DUE",
  "PAYMENT_CONFIRMED",
  "PPDB_STATUS",
  "ANNOUNCEMENT",
  "LETTER_STATUS",
  "LIBRARY_DUE",
  "ASSET_APPROVED",
  "DISCIPLINE",
  "BK_REMINDER",
  "EXPORT_READY"
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE_VALUES)[number];

/* RBAC — prd04 §4.2/§4.3 */
export const PERMISSION_SCOPE_VALUES = ["SENDIRI", "KELAS", "SEKOLAH"] as const;
export type PermissionScope = (typeof PERMISSION_SCOPE_VALUES)[number];

export const PERMISSION_EFFECT_VALUES = ["ALLOW", "DENY"] as const;
export type PermissionEffect = (typeof PERMISSION_EFFECT_VALUES)[number];

/* DTO dasar — format error standar (docs/04-api-contract.md §1.6) */
export const ERROR_CODE_VALUES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "FEATURE_DISABLED",
  "ARCHIVED_YEAR",
  "SERVICE_DEGRADED",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL"
] as const;
export type ErrorCode = (typeof ERROR_CODE_VALUES)[number];

export interface ApiErrorDetail {
  field?: string;
  reason: string;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}

/* Scope RBAC — docs/02-technical-architecture.md §4.3 */
export type RbacScope = "SENDIRI" | "KELAS" | "SEKOLAH";

export interface RequestContext {
  userId: string;
  roles: Role[];
  classIds: string[];
  homeroomClassId: string | null;
  requestId: string;
}
