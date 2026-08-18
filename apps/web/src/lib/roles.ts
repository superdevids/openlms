import type { Role } from "@opensis/types";
import { ROLE_GROUP_LABEL, type RoleGroup } from "./constants";

export { ROLE_GROUP_LABEL };
export type { RoleGroup };

/**
 * Navigasi per role (02-technical-architecture §5.1, 07-ux-design §3).
 * Setiap item bisa membawa featureFlagKey — menu disembunyikan saat flag OFF.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  featureFlagKey?: string;
  roles: Role[];
  /** Grup sidebar AppShell v2 (spec app-design-system-v3 §D.1.a). */
  group?: string;
}

/**
 * Prioritas role untuk memilih "role utama" — mirror lms-audit.ts:37-52 (R-13),
 * deterministik: role tertinggi sesuai urutan, fallback roles[0].
 */
export const ROLE_PRIORITY: Role[] = [
  "SUPERADMIN",
  "KEPSEK",
  "AUDITOR",
  "WAKEPSEK",
  "KAPRODI",
  "OPERATOR",
  "KEUANGAN",
  "BK",
  "GURU",
  "SISWA",
  "WALI_MURID",
  "CALON_SISWA",
  "PEMBIMBING_INDUSTRI",
  "PENGUJI_EKSTERNAL"
];

/** Role pertama sesuai ROLE_PRIORITY; fallback roles[0]. */
export function primaryRoleOf(roles: Role[]): Role | undefined {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return roles[0];
}

/** Role yang bisa diganti lewat switcher (item 18) — SUPERADMIN & SISWA dikecualikan. */
export function switchableRoles(roles: Role[]): Role[] {
  return roles.filter((r) => r !== "SUPERADMIN" && r !== "SISWA");
}

/** Validasi stored role aktif: harus termasuk switchable; fallback primaryRoleOf. */
export function resolveActiveRole(
  user: { roles: Role[] },
  stored: Role | null | undefined
): Role | undefined {
  const switchable = switchableRoles(user.roles);
  if (stored && switchable.includes(stored)) return stored;
  return primaryRoleOf(user.roles);
}

export function roleGroupFor(role: Role | undefined): RoleGroup | null {
  switch (role) {
    case "SISWA":
      return "siswa";
    case "GURU":
    case "BK":
    case "KAPRODI":
      return "guru";
    case "OPERATOR":
    case "KEUANGAN":
    case "WAKEPSEK":
    case "KEPSEK":
    case "AUDITOR":
      return "admin";
    case "SUPERADMIN":
      return "superadmin";
    case "WALI_MURID":
      return "ortu";
    case "CALON_SISWA":
      return "calonsiswa";
    case "PEMBIMBING_INDUSTRI":
      return "pembimbing";
    case "PENGUJI_EKSTERNAL":
      return "penguji";
    default:
      return null;
  }
}

export function roleHome(role: Role | undefined): string {
  const group = roleGroupFor(role);
  switch (group) {
    case "siswa":
      return "/siswa/dashboard";
    case "guru":
      return "/guru/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "superadmin":
      return "/superadmin/dashboard";
    case "ortu":
      return "/ortu/dashboard";
    case "calonsiswa":
      return "/calonsiswa/dashboard";
    case "pembimbing":
      return "/pembimbing/dashboard";
    case "penguji":
      return "/penguji/dashboard";
    default:
      return "/login";
  }
}

const ROLES: Record<RoleGroup, Role[]> = {
  siswa: ["SISWA"],
  guru: ["GURU", "BK", "KAPRODI"],
  admin: ["OPERATOR", "KEUANGAN", "WAKEPSEK", "KEPSEK", "AUDITOR"],
  superadmin: ["SUPERADMIN"],
  ortu: ["WALI_MURID"],
  calonsiswa: ["CALON_SISWA"],
  pembimbing: ["PEMBIMBING_INDUSTRI"],
  penguji: ["PENGUJI_EKSTERNAL"]
};

export const NAV_ITEMS: Record<RoleGroup, NavItem[]> = {
  siswa: [
    {
      label: "Beranda",
      href: "/siswa/dashboard",
      icon: "home",
      roles: ROLES.siswa,
      group: "Ringkasan"
    },
    {
      label: "Kelas",
      href: "/siswa/kelas",
      icon: "book",
      roles: ROLES.siswa,
      group: "Pembelajaran"
    },
    {
      label: "Tugas",
      href: "/siswa/tugas",
      icon: "clipboard",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_ASSIGNMENT",
      group: "Pembelajaran"
    },
    {
      label: "Kuis",
      href: "/siswa/kuis",
      icon: "quiz",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_QUIZ",
      group: "Pembelajaran"
    },
    {
      label: "Ujian",
      href: "/siswa/ujian",
      icon: "exam",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_EXAM",
      group: "Pembelajaran"
    },
    {
      label: "Nilai",
      href: "/siswa/nilai",
      icon: "chart",
      roles: ROLES.siswa,
      group: "Pembelajaran"
    },
    {
      label: "Rapor",
      href: "/siswa/rapor",
      icon: "file",
      roles: ROLES.siswa,
      group: "Pembelajaran"
    },
    {
      label: "Absensi",
      href: "/siswa/absensi",
      icon: "qrcode",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_ABSENSI_QR",
      group: "Kehadiran"
    },
    {
      label: "Kalender",
      href: "/siswa/kalender",
      icon: "calendar",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_KALENDER",
      group: "Kehadiran"
    }
  ],
  guru: [
    {
      label: "Beranda",
      href: "/guru/dashboard",
      icon: "home",
      roles: ROLES.guru,
      group: "Ringkasan"
    },
    { label: "Kelas", href: "/guru/kelas", icon: "book", roles: ROLES.guru, group: "Mengajar" },
    {
      label: "Materi",
      href: "/guru/materi",
      icon: "file",
      roles: ROLES.guru,
      featureFlagKey: "LMS_MATERIAL",
      group: "Mengajar"
    },
    {
      label: "Tugas",
      href: "/guru/tugas",
      icon: "clipboard",
      roles: ROLES.guru,
      featureFlagKey: "LMS_ASSIGNMENT",
      group: "Mengajar"
    },
    {
      label: "Bank Soal",
      href: "/guru/bank-soal",
      icon: "bank",
      roles: ROLES.guru,
      featureFlagKey: "LMS_BANK_SOAL",
      group: "Mengajar"
    },
    {
      label: "Penilaian",
      href: "/guru/penilaian",
      icon: "grade",
      roles: ROLES.guru,
      group: "Mengajar"
    },
    {
      label: "Rapor",
      href: "/guru/rapor",
      icon: "file",
      roles: ROLES.guru,
      group: "Mengajar"
    },
    {
      label: "Absensi QR",
      href: "/guru/absensi",
      icon: "qrcode",
      roles: ROLES.guru,
      featureFlagKey: "LMS_ABSENSI_QR",
      group: "Kehadiran & Ujian"
    },
    {
      label: "Ujian",
      href: "/guru/ujian",
      icon: "exam",
      roles: ROLES.guru,
      featureFlagKey: "LMS_EXAM",
      group: "Kehadiran & Ujian"
    }
  ],
  admin: [
    {
      label: "Beranda",
      href: "/admin/dashboard",
      icon: "home",
      roles: ROLES.admin,
      group: "Ringkasan"
    },
    {
      label: "Operator / Data",
      href: "/admin/operator",
      icon: "database",
      roles: ROLES.admin,
      group: "Data"
    },
    {
      label: "Landing Page",
      href: "/superadmin/landing",
      icon: "settings",
      roles: ["SUPERADMIN"],
      group: "Data"
    },
    {
      label: "Keuangan",
      href: "/admin/keuangan",
      icon: "wallet",
      roles: ROLES.admin,
      featureFlagKey: "FINANCE_INVOICE",
      group: "Operasional"
    },
    {
      label: "Wakepsek",
      href: "/admin/wakepsek",
      icon: "academic",
      roles: ROLES.admin,
      group: "Operasional"
    },
    {
      label: "Kepsek",
      href: "/admin/kepsek",
      icon: "briefcase",
      roles: ROLES.admin,
      group: "Operasional"
    },
    {
      label: "Rapor",
      href: "/admin/rapor",
      icon: "file",
      roles: ROLES.admin,
      group: "Operasional"
    },
    {
      label: "Dapodik",
      href: "/admin/dapodik",
      icon: "database",
      roles: ROLES.admin,
      group: "Operasional"
    },
    {
      label: "Change Log",
      href: "/admin/kepsek/change-logs",
      icon: "file",
      roles: ["KEPSEK"],
      group: "Operasional"
    }
  ],
  superadmin: [
    {
      label: "Beranda",
      href: "/superadmin/dashboard",
      icon: "home",
      roles: ROLES.superadmin,
      group: "Ringkasan"
    },
    {
      label: "Admin Sistem",
      href: "/superadmin/admin-sistem",
      icon: "settings",
      roles: ROLES.superadmin,
      group: "Konfigurasi"
    },
    {
      label: "Change Log",
      href: "/superadmin/change-logs",
      icon: "file",
      roles: ROLES.superadmin,
      group: "Pemeliharaan"
    },
    {
      label: "Branding",
      href: "/superadmin/branding",
      icon: "settings",
      roles: ROLES.superadmin,
      group: "Konfigurasi"
    },
    {
      label: "Landing Page",
      href: "/superadmin/landing",
      icon: "settings",
      roles: ROLES.superadmin,
      group: "Konfigurasi"
    },
    {
      label: "RBAC",
      href: "/superadmin/rbac",
      icon: "database",
      roles: ROLES.superadmin,
      group: "Konfigurasi"
    },
    {
      label: "Onboarding",
      href: "/superadmin/onboarding",
      icon: "rocket",
      roles: ROLES.superadmin,
      group: "Pemeliharaan"
    },
    {
      label: "Rollover",
      href: "/superadmin/rollover",
      icon: "refresh",
      roles: ROLES.superadmin,
      featureFlagKey: "ACADEMIC_ROLLOVER",
      group: "Pemeliharaan"
    },
    {
      label: "Maintenance",
      href: "/superadmin/maintenance",
      icon: "settings",
      roles: ROLES.superadmin,
      group: "Pemeliharaan"
    },
    {
      label: "Dashboard Config",
      href: "/superadmin/dashboard-config",
      icon: "chart",
      roles: ROLES.superadmin,
      group: "Konfigurasi"
    }
  ],
  ortu: [
    {
      label: "Beranda",
      href: "/ortu/dashboard",
      icon: "home",
      roles: ROLES.ortu,
      group: "Ringkasan"
    },
    {
      label: "Nilai Anak",
      href: "/ortu/nilai",
      icon: "chart",
      roles: ROLES.ortu,
      group: "Pantauan Anak"
    },
    {
      label: "Absensi Anak",
      href: "/ortu/absensi",
      icon: "calendar",
      roles: ROLES.ortu,
      group: "Pantauan Anak"
    },
    {
      label: "Tagihan Anak",
      href: "/ortu/tagihan",
      icon: "wallet",
      roles: ROLES.ortu,
      featureFlagKey: "FINANCE_INVOICE",
      group: "Pantauan Anak"
    }
  ],
  calonsiswa: [
    {
      label: "Beranda",
      href: "/calonsiswa/dashboard",
      icon: "home",
      roles: ROLES.calonsiswa,
      group: "Ringkasan"
    },
    {
      label: "Pengumuman",
      href: "/calonsiswa/pengumuman",
      icon: "file",
      roles: ROLES.calonsiswa,
      group: "Ringkasan"
    }
  ],
  pembimbing: [
    {
      label: "Beranda",
      href: "/pembimbing/dashboard",
      icon: "home",
      roles: ROLES.pembimbing,
      group: "Ringkasan"
    },
    {
      label: "Siswa PKL",
      href: "/pembimbing/siswa",
      icon: "briefcase",
      roles: ROLES.pembimbing,
      group: "Ringkasan"
    }
  ],
  penguji: [
    {
      label: "Beranda",
      href: "/penguji/dashboard",
      icon: "home",
      roles: ROLES.penguji,
      group: "Ringkasan"
    },
    {
      label: "Jadwal UKK",
      href: "/penguji/jadwal",
      icon: "calendar",
      roles: ROLES.penguji,
      group: "Ringkasan"
    }
  ]
};

export function visibleNav(
  group: RoleGroup,
  flags: { key: string; enabled: boolean }[],
  userRoles: Role[] = []
): NavItem[] {
  return NAV_ITEMS[group].filter((item) => {
    // Item dengan batasan role hanya muncul bila role user beririsan (R-11:
    // Change Log hanya SUPERADMIN + KEPSEK; default = seluruh role grup).
    if (userRoles.length > 0 && !item.roles.some((r) => userRoles.includes(r))) return false;
    if (!item.featureFlagKey) return true;
    const flag = flags.find((f) => f.key === item.featureFlagKey);
    return flag ? flag.enabled : false;
  });
}

export function roleLabel(role: Role): string {
  const map: Record<Role, string> = {
    SISWA: "Siswa",
    GURU: "Guru",
    BK: "Guru BK",
    KAPRODI: "Kepala Program Keahlian",
    KEUANGAN: "Keuangan",
    OPERATOR: "Operator / TU",
    WAKEPSEK: "Wakil Kepala Sekolah",
    KEPSEK: "Kepala Sekolah",
    AUDITOR: "Auditor",
    SUPERADMIN: "Superadmin",
    CALON_SISWA: "Calon Siswa",
    WALI_MURID: "Orang Tua / Wali",
    PEMBIMBING_INDUSTRI: "Pembimbing Industri",
    PENGUJI_EKSTERNAL: "Penguji Eksternal"
  };
  return map[role] ?? role;
}
