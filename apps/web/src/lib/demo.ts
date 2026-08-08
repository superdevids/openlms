/**
 * Data contoh (DEMO MODE ONLY) — dipakai saat NEXT_PUBLIC_DEMO=1 dan backend belum
 * terhubung, agar setiap layar bisa dipreview. Tidak pernah dipakai di produksi.
 * Seluruh fetch runtime tetap melalui api-client; fallback hanya untuk preview.
 */

import type { Role } from "@opensis/types";

export interface DemoUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  roles: Role[];
}

export const DEMO_USER: DemoUser = {
  id: "usr_demo",
  username: "admin",
  fullName: "Demo Super Admin",
  email: "admin@sekolah.sch.id",
  roles: ["SUPERADMIN"]
};

export const DEMO_ROLES: Role[] = [
  "SISWA",
  "GURU",
  "BK",
  "KAPRODI",
  "OPERATOR",
  "KEUANGAN",
  "WAKEPSEK",
  "KEPSEK",
  "AUDITOR",
  "SUPERADMIN",
  "WALI_MURID",
  "CALON_SISWA",
  "PEMBIMBING_INDUSTRI",
  "PENGUJI_EKSTERNAL"
];

export interface DemoClass {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  gradeLevel: string;
  progress: number;
}

export const DEMO_CLASSES: DemoClass[] = [
  {
    id: "cls_1",
    name: "XI IPA 1",
    subject: "Matematika",
    teacher: "Budi Santoso",
    gradeLevel: "11",
    progress: 62
  },
  {
    id: "cls_2",
    name: "XI IPA 1",
    subject: "Fisika",
    teacher: "Sari Wulandari",
    gradeLevel: "11",
    progress: 48
  },
  {
    id: "cls_3",
    name: "XI IPS 2",
    subject: "Matematika",
    teacher: "Budi Santoso",
    gradeLevel: "11",
    progress: 35
  }
];

export interface DemoTask {
  id: string;
  title: string;
  className: string;
  subject: string;
  dueAt: string;
  status: "BUKA" | "TERSUBMIT" | "TERLAMBAT" | "DINILAI";
}

export const DEMO_TASKS: DemoTask[] = [
  {
    id: "asg_1",
    title: "Tugas 1: Persamaan Kuadrat",
    className: "XI IPA 1",
    subject: "Matematika",
    dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: "BUKA"
  },
  {
    id: "asg_2",
    title: "Laporan Praktikum Gerak Parabola",
    className: "XI IPA 1",
    subject: "Fisika",
    dueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: "BUKA"
  },
  {
    id: "asg_3",
    title: "Tugas 2: Turunan",
    className: "XI IPA 1",
    subject: "Matematika",
    dueAt: new Date(Date.now() - 86400000).toISOString(),
    status: "DINILAI"
  }
];

export interface DemoInvoice {
  id: string;
  type: string;
  period: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
}

export const DEMO_INVOICES: DemoInvoice[] = [
  {
    id: "inv_1",
    type: "SPP",
    period: "2026-08",
    amount: 250000,
    paid: 250000,
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: "PAID"
  },
  {
    id: "inv_2",
    type: "UANG_KEGIATAN",
    period: "2026-08",
    amount: 150000,
    paid: 50000,
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: "PARTIAL"
  },
  {
    id: "inv_3",
    type: "SPP",
    period: "2026-07",
    amount: 250000,
    paid: 0,
    dueDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    status: "OVERDUE"
  }
];

export interface DemoGrade {
  subject: string;
  tugas: number | null;
  kuis: number | null;
  ujian: number | null;
  rata: number | null;
}

export const DEMO_GRADES: DemoGrade[] = [
  { subject: "Matematika", tugas: 90, kuis: 85, ujian: 78, rata: 84.3 },
  { subject: "Fisika", tugas: 80, kuis: 88, ujian: null, rata: 84.0 },
  { subject: "Bahasa Indonesia", tugas: 88, kuis: 82, ujian: 85, rata: 85.0 },
  { subject: "Biologi", tugas: 75, kuis: 80, ujian: null, rata: 77.5 }
];

export interface DemoAttendance {
  date: string;
  subject: string;
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPA" | "TERLAMBAT";
}

export const DEMO_ATTENDANCE: DemoAttendance[] = [
  {
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    subject: "Matematika",
    status: "HADIR"
  },
  { date: new Date(Date.now() - 86400000 * 2).toISOString(), subject: "Fisika", status: "HADIR" },
  {
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    subject: "Biologi",
    status: "TERLAMBAT"
  },
  {
    date: new Date(Date.now() - 86400000 * 4).toISOString(),
    subject: "Matematika",
    status: "HADIR"
  },
  { date: new Date(Date.now() - 86400000 * 5).toISOString(), subject: "Kimia", status: "ALPA" }
];

export interface DemoSubmission {
  id: string;
  student: string;
  submittedAt: string;
  score: number | null;
  feedback?: string;
  answer: string;
  question: string;
  key: string;
}

export const DEMO_SUBMISSIONS: DemoSubmission[] = [
  {
    id: "sub_1",
    student: "Andi Setiawan",
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    score: null,
    answer:
      "Berdasarkan perhitungan vektor, panjang |AB| = akar dari (3^2 + (-4)^2) = akar(25) = 5 satuan. Jadi jawabannya adalah 5.",
    question: "Diketahui vektor AB = (3, -4). Hitung panjang |AB|!",
    key: "|AB| = √(3² + (-4)²) = √25 = 5 satuan."
  },
  {
    id: "sub_2",
    student: "Sari Wulandari",
    submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    score: 90,
    feedback: "Langkah benar, perhatikan satuan.",
    answer:
      "Panjang vektor dihitung dengan rumus akar dari jumlah kuadrat komponen. Hasilnya 5 satuan.",
    question: "Diketahui vektor AB = (3, -4). Hitung panjang |AB|!",
    key: "|AB| = √(3² + (-4)²) = √25 = 5 satuan."
  }
];

export interface DemoExam {
  id: string;
  title: string;
  subject: string;
  className: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  status: "SCHEDULED" | "ONGOING" | "ENDED";
}

export const DEMO_EXAMS: DemoExam[] = [
  {
    id: "exm_1",
    title: "PTS Matematika",
    subject: "Matematika",
    className: "XI IPA 1",
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    endsAt: new Date(Date.now() + 7200000).toISOString(),
    durationMinutes: 120,
    status: "ONGOING"
  },
  {
    id: "exm_2",
    title: "PAS Fisika",
    subject: "Fisika",
    className: "XI IPA 1",
    startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    endsAt: new Date(Date.now() + 86400000 * 3 + 5400000).toISOString(),
    durationMinutes: 90,
    status: "SCHEDULED"
  }
];

export interface DemoQuestion {
  id: string;
  type: "PILIHAN_GANDA" | "ESAI";
  text: string;
  options?: Array<{ id: string; text: string }>;
  answer?: string;
}

export const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: "q_1",
    type: "PILIHAN_GANDA",
    text: "Jika f(x) = 2x + 3, nilai f(5) = ...",
    options: [
      { id: "o1", text: "10" },
      { id: "o2", text: "11" },
      { id: "o3", text: "13" },
      { id: "o4", text: "15" }
    ],
    answer: "o3"
  },
  {
    id: "q_2",
    type: "PILIHAN_GANDA",
    text: "Hasil dari 25 - 4 × 3 adalah ...",
    options: [
      { id: "o1", text: "13" },
      { id: "o2", text: "63" },
      { id: "o3", text: "21" },
      { id: "o4", text: "9" }
    ],
    answer: "o1"
  },
  {
    id: "q_3",
    type: "ESAI",
    text: "Jelaskan langkah penyelesaian persamaan kuadrat x² - 5x + 6 = 0!"
  },
  {
    id: "q_4",
    type: "PILIHAN_GANDA",
    text: "Nilai dari sin 30° adalah ...",
    options: [
      { id: "o1", text: "0" },
      { id: "o2", text: "1/2" },
      { id: "o3", text: "√3/2" },
      { id: "o4", text: "1" }
    ],
    answer: "o2"
  }
];

export const DEMO_ATTENDANCE_SUMMARY = [
  { date: "2026-08-03", subject: "Matematika", present: 22, total: 24, late: 1 },
  { date: "2026-08-04", subject: "Fisika", present: 23, total: 24, late: 0 },
  { date: "2026-08-05", subject: "Matematika", present: 21, total: 24, late: 2 }
];

export const DEMO_FEATURE_FLAG_OVERRIDES_KEY = "opensis_demo_flags";
export const DEMO_ROLE_KEY = "opensis_demo_role";
