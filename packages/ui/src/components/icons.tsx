/**
 * Ikon opensis — standar shadcn/ui via lucide-react.
 * Semua ikon dekoratif → aria-hidden default lucide; gunakan selalu
 * bersanding teks label (07-ux §7: status bukan warna saja).
 * Nama ekspor Icon* dipertahankan agar pemakaian lintas halaman tidak berubah.
 */

import type { JSX } from "react";
import type { LucideProps } from "lucide-react";
import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  ClipboardList,
  Clock,
  Database,
  Download,
  EllipsisVertical,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  Flag,
  GraduationCap,
  Home,
  Info,
  Landmark,
  Lock,
  LogOut,
  Menu,
  Moon,
  Plus,
  QrCode,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Sun,
  TriangleAlert,
  Upload,
  User,
  Wallet,
  X
} from "lucide-react";

export type IconProps = LucideProps;

export function IconHome(props: IconProps): JSX.Element {
  return <Home {...props} />;
}

export function IconBook(props: IconProps): JSX.Element {
  return <BookOpen {...props} />;
}

export function IconClipboard(props: IconProps): JSX.Element {
  return <ClipboardList {...props} />;
}

export function IconQuiz(props: IconProps): JSX.Element {
  return <CircleHelp {...props} />;
}

export function IconExam(props: IconProps): JSX.Element {
  return <FileCheck {...props} />;
}

export function IconChart(props: IconProps): JSX.Element {
  return <ChartColumn {...props} />;
}

export function IconQr(props: IconProps): JSX.Element {
  return <QrCode {...props} />;
}

export function IconCamera(props: IconProps): JSX.Element {
  return <Camera {...props} />;
}

export function IconCalendar(props: IconProps): JSX.Element {
  return <Calendar {...props} />;
}

export function IconBell(props: IconProps): JSX.Element {
  return <Bell {...props} />;
}

export function IconClock(props: IconProps): JSX.Element {
  return <Clock {...props} />;
}

export function IconAlert(props: IconProps): JSX.Element {
  return <TriangleAlert {...props} />;
}

export function IconCheck(props: IconProps): JSX.Element {
  return <Check {...props} />;
}

export function IconX(props: IconProps): JSX.Element {
  return <X {...props} />;
}

export function IconChevronLeft(props: IconProps): JSX.Element {
  return <ChevronLeft {...props} />;
}

export function IconChevronRight(props: IconProps): JSX.Element {
  return <ChevronRight {...props} />;
}

export function IconChevronDown(props: IconProps): JSX.Element {
  return <ChevronDown {...props} />;
}

export function IconChevronUp(props: IconProps): JSX.Element {
  return <ChevronUp {...props} />;
}

export function IconEllipsis(props: IconProps): JSX.Element {
  return <EllipsisVertical {...props} />;
}

export function IconLogout(props: IconProps): JSX.Element {
  return <LogOut {...props} />;
}

export function IconSettings(props: IconProps): JSX.Element {
  return <Settings {...props} />;
}

export function IconDatabase(props: IconProps): JSX.Element {
  return <Database {...props} />;
}

export function IconWallet(props: IconProps): JSX.Element {
  return <Wallet {...props} />;
}

export function IconAcademic(props: IconProps): JSX.Element {
  return <GraduationCap {...props} />;
}

export function IconBriefcase(props: IconProps): JSX.Element {
  return <Briefcase {...props} />;
}

export function IconRocket(props: IconProps): JSX.Element {
  return <Rocket {...props} />;
}

export function IconRefresh(props: IconProps): JSX.Element {
  return <RefreshCw {...props} />;
}

export function IconFile(props: IconProps): JSX.Element {
  return <FileText {...props} />;
}

export function IconBank(props: IconProps): JSX.Element {
  return <Landmark {...props} />;
}

export function IconGrade(props: IconProps): JSX.Element {
  return <Award {...props} />;
}

export function IconPlus(props: IconProps): JSX.Element {
  return <Plus {...props} />;
}

export function IconSearch(props: IconProps): JSX.Element {
  return <Search {...props} />;
}

export function IconMenu(props: IconProps): JSX.Element {
  return <Menu {...props} />;
}

export function IconDownload(props: IconProps): JSX.Element {
  return <Download {...props} />;
}

export function IconUpload(props: IconProps): JSX.Element {
  return <Upload {...props} />;
}

export function IconFlag(props: IconProps): JSX.Element {
  return <Flag {...props} />;
}

export function IconUser(props: IconProps): JSX.Element {
  return <User {...props} />;
}

export function IconLock(props: IconProps): JSX.Element {
  return <Lock {...props} />;
}

export function IconInfo(props: IconProps): JSX.Element {
  return <Info {...props} />;
}

export function IconSun(props: IconProps): JSX.Element {
  return <Sun {...props} />;
}

export function IconMoon(props: IconProps): JSX.Element {
  return <Moon {...props} />;
}

export function IconEye(props: IconProps): JSX.Element {
  return <Eye {...props} />;
}

export function IconEyeOff(props: IconProps): JSX.Element {
  return <EyeOff {...props} />;
}
