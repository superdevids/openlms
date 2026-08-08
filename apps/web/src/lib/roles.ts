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
    { label: "Beranda", href: "/siswa/dashboard", icon: "home", roles: ROLES.siswa },
    { label: "Kelas", href: "/siswa/kelas", icon: "book", roles: ROLES.siswa },
    {
      label: "Tugas",
      href: "/siswa/tugas",
      icon: "clipboard",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_ASSIGNMENT"
    },
    {
      label: "Kuis",
      href: "/siswa/kuis",
      icon: "quiz",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_QUIZ"
    },
    {
      label: "Ujian",
      href: "/siswa/ujian",
      icon: "exam",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_EXAM"
    },
    { label: "Nilai", href: "/siswa/nilai", icon: "chart", roles: ROLES.siswa },
    {
      label: "Absensi",
      href: "/siswa/absensi",
      icon: "qrcode",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_ABSENSI_QR"
    },
    {
      label: "Kalender",
      href: "/siswa/kalender",
      icon: "calendar",
      roles: ROLES.siswa,
      featureFlagKey: "LMS_KALENDER"
    }
  ],
  guru: [
    { label: "Beranda", href: "/guru/dashboard", icon: "home", roles: ROLES.guru },
    { label: "Kelas", href: "/guru/kelas", icon: "book", roles: ROLES.guru },
    {
      label: "Materi",
      href: "/guru/materi",
      icon: "file",
      roles: ROLES.guru,
      featureFlagKey: "LMS_MATERIAL"
    },
    {
      label: "Tugas",
      href: "/guru/tugas",
      icon: "clipboard",
      roles: ROLES.guru,
      featureFlagKey: "LMS_ASSIGNMENT"
    },
    {
      label: "Bank Soal",
      href: "/guru/bank-soal",
      icon: "bank",
      roles: ROLES.guru,
      featureFlagKey: "LMS_BANK_SOAL"
    },
    { label: "Penilaian", href: "/guru/penilaian", icon: "grade", roles: ROLES.guru },
    {
      label: "Absensi QR",
      href: "/guru/absensi",
      icon: "qrcode",
      roles: ROLES.guru,
      featureFlagKey: "LMS_ABSENSI_QR"
    },
    {
      label: "Ujian",
      href: "/guru/ujian",
      icon: "exam",
      roles: ROLES.guru,
      featureFlagKey: "LMS_EXAM"
    }
  ],
  admin: [
    { label: "Beranda", href: "/admin/dashboard", icon: "home", roles: ROLES.admin },
    { label: "Operator / Data", href: "/admin/operator", icon: "database", roles: ROLES.admin },
    {
      label: "Landing Page",
      href: "/superadmin/landing",
      icon: "settings",
      roles: ROLES.admin
    },
    {
      label: "Keuangan",
      href: "/admin/keuangan",
      icon: "wallet",
      roles: ROLES.admin,
      featureFlagKey: "FINANCE_INVOICE"
    },
    { label: "Wakepsek", href: "/admin/wakepsek", icon: "academic", roles: ROLES.admin },
    { label: "Kepsek", href: "/admin/kepsek", icon: "briefcase", roles: ROLES.admin },
    {
      label: "Change Log",
      href: "/admin/kepsek/change-logs",
      icon: "file",
      roles: ["KEPSEK"]
    }
  ],
  superadmin: [
    { label: "Beranda", href: "/superadmin/dashboard", icon: "home", roles: ROLES.superadmin },
    {
      label: "Admin Sistem",
      href: "/superadmin/admin-sistem",
      icon: "settings",
      roles: ROLES.superadmin
    },
    {
      label: "Change Log",
      href: "/superadmin/change-logs",
      icon: "file",
      roles: ROLES.superadmin
    },
    {
      label: "Branding",
      href: "/superadmin/branding",
      icon: "settings",
      roles: ROLES.superadmin
    },
    {
      label: "Landing Page",
      href: "/superadmin/landing",
      icon: "settings",
      roles: ROLES.superadmin
    },
    {
      label: "RBAC",
      href: "/superadmin/rbac",
      icon: "database",
      roles: ROLES.superadmin
    },
    {
      label: "Onboarding",
      href: "/superadmin/onboarding",
      icon: "rocket",
      roles: ROLES.superadmin
    },
    {
      label: "Rollover",
      href: "/superadmin/rollover",
      icon: "refresh",
      roles: ROLES.superadmin,
      featureFlagKey: "ACADEMIC_ROLLOVER"
    },
    {
      label: "Maintenance",
      href: "/superadmin/maintenance",
      icon: "settings",
      roles: ROLES.superadmin
    },
    {
      label: "Dashboard Config",
      href: "/superadmin/dashboard-config",
      icon: "chart",
      roles: ROLES.superadmin
    }
  ],
  ortu: [
    { label: "Beranda", href: "/ortu/dashboard", icon: "home", roles: ROLES.ortu },
    { label: "Nilai Anak", href: "/ortu/nilai", icon: "chart", roles: ROLES.ortu },
    { label: "Absensi Anak", href: "/ortu/absensi", icon: "calendar", roles: ROLES.ortu },
    {
      label: "Tagihan Anak",
      href: "/ortu/tagihan",
      icon: "wallet",
      roles: ROLES.ortu,
      featureFlagKey: "FINANCE_INVOICE"
    }
  ],
  calonsiswa: [
    { label: "Beranda", href: "/calonsiswa/dashboard", icon: "home", roles: ROLES.calonsiswa },
    {
      label: "Pengumuman",
      href: "/calonsiswa/pengumuman",
      icon: "file",
      roles: ROLES.calonsiswa
    }
  ],
  pembimbing: [
    { label: "Beranda", href: "/pembimbing/dashboard", icon: "home", roles: ROLES.pembimbing },
    {
      label: "Siswa PKL",
      href: "/pembimbing/siswa",
      icon: "briefcase",
      roles: ROLES.pembimbing
    }
  ],
  penguji: [
    { label: "Beranda", href: "/penguji/dashboard", icon: "home", roles: ROLES.penguji },
    {
      label: "Jadwal UKK",
      href: "/penguji/jadwal",
      icon: "calendar",
      roles: ROLES.penguji
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
