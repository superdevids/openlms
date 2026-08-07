import type { Role } from "@openlms/types";

/**
 * Navigasi per role (02-technical-architecture §5.1, 07-ux-design §3).
 * Setiap item bisa membawa featureFlagKey — menu disembunyikan saat flag OFF.
 */

export type RoleGroup = "siswa" | "guru" | "admin" | "superadmin" | "ortu";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  featureFlagKey?: string;
  roles: Role[];
}

export const ROLE_GROUP_LABEL: Record<RoleGroup, string> = {
  siswa: "Siswa",
  guru: "Guru",
  admin: "Tata Usaha / Admin",
  superadmin: "Superadmin",
  ortu: "Orang Tua"
};

export function roleGroupFor(role: Role | undefined): RoleGroup | null {
  switch (role) {
    case "SISWA":
      return "siswa";
    case "GURU":
    case "GURU_BK":
      return "guru";
    case "OPERATOR":
    case "KEUANGAN":
    case "WAKEPSEK":
    case "KEPSEK":
      return "admin";
    case "SUPERADMIN":
      return "superadmin";
    case "WALI_MURID":
      return "ortu";
    case "CALON_SISWA":
    case "PEMBIMBING_INDUSTRI":
    case "PENGUJI_EKSTERNAL":
      return null;
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
    default:
      return "/login";
  }
}

const ROLES: Record<RoleGroup, Role[]> = {
  siswa: ["SISWA"],
  guru: ["GURU", "GURU_BK"],
  admin: ["OPERATOR", "KEUANGAN", "WAKEPSEK", "KEPSEK"],
  superadmin: ["SUPERADMIN"],
  ortu: ["WALI_MURID"]
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
    { label: "Kepsek", href: "/admin/kepsek", icon: "briefcase", roles: ROLES.admin }
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
  ]
};

export function visibleNav(
  group: RoleGroup,
  flags: { key: string; enabled: boolean }[]
): NavItem[] {
  return NAV_ITEMS[group].filter((item) => {
    if (!item.featureFlagKey) return true;
    const flag = flags.find((f) => f.key === item.featureFlagKey);
    return flag ? flag.enabled : false;
  });
}

export function roleLabel(role: Role): string {
  const map: Record<Role, string> = {
    SISWA: "Siswa",
    GURU: "Guru",
    GURU_BK: "Guru BK",
    KEUANGAN: "Keuangan",
    OPERATOR: "Operator / TU",
    WAKEPSEK: "Wakil Kepala Sekolah",
    KEPSEK: "Kepala Sekolah",
    SUPERADMIN: "Superadmin",
    CALON_SISWA: "Calon Siswa",
    WALI_MURID: "Orang Tua / Wali",
    PEMBIMBING_INDUSTRI: "Pembimbing Industri",
    PENGUJI_EKSTERNAL: "Penguji Eksternal"
  };
  return map[role] ?? role;
}
