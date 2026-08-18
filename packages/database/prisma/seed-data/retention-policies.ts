/**
 * Kebijakan retensi data default — modul PDP (UU PDP, G12).
 * Entity mengikuti nama model Prisma (key pemetaan di
 * apps/api/src/modules/pdp/pdp-retention.service.ts).
 */

export interface RetentionPolicySeed {
  entity: string;
  retentionMonths: number;
  action: "DELETE" | "ANONYMIZE" | "ARCHIVE";
}

export const RETENTION_POLICIES_SEED: RetentionPolicySeed[] = [
  { entity: "Notification", retentionMonths: 60, action: "DELETE" },
  { entity: "ExamAnswerLog", retentionMonths: 60, action: "DELETE" },
  { entity: "Attendance", retentionMonths: 60, action: "DELETE" },
  { entity: "AttendanceRecord", retentionMonths: 60, action: "DELETE" },
  { entity: "CounselingNote", retentionMonths: 60, action: "ANONYMIZE" }
];
