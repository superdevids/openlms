/**
 * Attendance — tipe internal modul (bukan kontrak publik).
 */
import type { AttendanceMethod, AttendanceStatus } from "@opensis/types";

/** Payload pengajuan izin/sakit yang disimpan di kolom note (JSON string). */
export interface PermitNotePayload {
  kind: "permit";
  type: "IZIN" | "SAKIT";
  reason: string;
  attachmentPath?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  verifiedBy?: string;
  verifiedAt?: string;
  rejectReason?: string;
}

/** Ringkasan rekap kehadiran. */
export interface AttendanceRekapSummary {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
  /** Persentase kehadiran = (hadir + terlambat + izin + sakit) / total (non-alpa). */
  kehadiranPercent: number;
  alpaPercent: number;
}

/** Ringkasan kedisiplinan per siswa. */
export interface DisciplineStudentSummary {
  studentId: string;
  alpaCount: number;
  atRisk: boolean;
}

/** Respons scan absensi QR (termasuk replay idempotent). */
export interface ScanResponse {
  id: string;
  attendance_session_id: string;
  student_id: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  recorded_at: Date;
  idempotent: boolean;
}

/** Baris absensi manual yang siap ditulis ke tabel attendance. */
export interface ManualAttendanceEntry {
  student_id: string;
  class_subject_id: string | null;
  date: Date;
  status: AttendanceStatus;
  note: string | null;
  method: AttendanceMethod;
  recorded_by: string;
}
