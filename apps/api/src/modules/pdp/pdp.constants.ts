/**
 * Konstanta modul PDP (kepatuhan UU PDP).
 * Entity AuditLog yang dipakai jejak PDP + placeholder anonimisasi.
 */

/** AuditLog.entity untuk akses data pribadi (VIEW). */
export const PDP_AUDIT_ENTITY_DATA_ACCESS = "pdp_data_access";

/** AuditLog.entity untuk ekspor data pribadi (EXPORT). */
export const PDP_AUDIT_ENTITY_DATA_EXPORT = "pdp_data_export";

/** AuditLog.entity untuk permintaan PDP (CREATE/DELETE). */
export const PDP_AUDIT_ENTITY_REQUEST = "pdp_request";

/** AuditLog.entity untuk job retensi (CREATE). */
export const PDP_AUDIT_ENTITY_RETENTION_JOB = "retention_job";

/** ExportType pada DataExportLog untuk ekspor data pribadi. */
export const PDP_EXPORT_TYPE = "PERSONAL" as const;

/** Placeholder anonimisasi PII (UU PDP). */
export const PDP_ANONYMIZE_PLACEHOLDER = "[dihapus]";

/** Entity retensi yang didukung job (key = nama model Prisma). */
export const RETENTION_ENTITIES = [
  "Notification",
  "ExamAnswerLog",
  "Attendance",
  "AttendanceRecord",
  "CounselingNote"
] as const;

export type RetentionEntity = (typeof RETENTION_ENTITIES)[number];

/**
 * Retensi file ekspor PERSONAL (PII) — 3 bulan (hardcode, tanpa migrasi).
 * DataExportLog TIDAK masuk RETENTION_ENTITIES (log dipertahankan untuk audit);
 * kebijakan ini hanya menghapus file + null-kan file_url di PdpRetentionService.
 */
export const PERSONAL_EXPORT_RETENTION_MONTHS = 3;
