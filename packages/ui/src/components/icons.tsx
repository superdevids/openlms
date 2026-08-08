/**
 * Ikon openlms — standar shadcn/ui via lucide-react.
 * Semua ikon dekoratif → aria-hidden default lucide; gunakan selalu
 * bersanding teks label (07-ux §7: status bukan warna saja).
 * Nama ekspor Icon* dipertahankan agar pemakaian lintas halaman tidak berubah.
 */

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
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock,
  Database,
  Download,
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

export function IconHome(props: IconProps): React.JSX.Element {
  return <Home {...props} />;
}

export function IconBook(props: IconProps): React.JSX.Element {
  return <BookOpen {...props} />;
}

export function IconClipboard(props: IconProps): React.JSX.Element {
  return <ClipboardList {...props} />;
}

export function IconQuiz(props: IconProps): React.JSX.Element {
  return <CircleHelp {...props} />;
}

export function IconExam(props: IconProps): React.JSX.Element {
  return <FileCheck {...props} />;
}

export function IconChart(props: IconProps): React.JSX.Element {
  return <ChartColumn {...props} />;
}

export function IconQr(props: IconProps): React.JSX.Element {
  return <QrCode {...props} />;
}

export function IconCamera(props: IconProps): React.JSX.Element {
  return <Camera {...props} />;
}

export function IconCalendar(props: IconProps): React.JSX.Element {
  return <Calendar {...props} />;
}

export function IconBell(props: IconProps): React.JSX.Element {
  return <Bell {...props} />;
}

export function IconClock(props: IconProps): React.JSX.Element {
  return <Clock {...props} />;
}

export function IconAlert(props: IconProps): React.JSX.Element {
  return <TriangleAlert {...props} />;
}

export function IconCheck(props: IconProps): React.JSX.Element {
  return <Check {...props} />;
}

export function IconX(props: IconProps): React.JSX.Element {
  return <X {...props} />;
}

export function IconChevronLeft(props: IconProps): React.JSX.Element {
  return <ChevronLeft {...props} />;
}

export function IconChevronRight(props: IconProps): React.JSX.Element {
  return <ChevronRight {...props} />;
}

export function IconLogout(props: IconProps): React.JSX.Element {
  return <LogOut {...props} />;
}

export function IconSettings(props: IconProps): React.JSX.Element {
  return <Settings {...props} />;
}

export function IconDatabase(props: IconProps): React.JSX.Element {
  return <Database {...props} />;
}

export function IconWallet(props: IconProps): React.JSX.Element {
  return <Wallet {...props} />;
}

export function IconAcademic(props: IconProps): React.JSX.Element {
  return <GraduationCap {...props} />;
}

export function IconBriefcase(props: IconProps): React.JSX.Element {
  return <Briefcase {...props} />;
}

export function IconRocket(props: IconProps): React.JSX.Element {
  return <Rocket {...props} />;
}

export function IconRefresh(props: IconProps): React.JSX.Element {
  return <RefreshCw {...props} />;
}

export function IconFile(props: IconProps): React.JSX.Element {
  return <FileText {...props} />;
}

export function IconBank(props: IconProps): React.JSX.Element {
  return <Landmark {...props} />;
}

export function IconGrade(props: IconProps): React.JSX.Element {
  return <Award {...props} />;
}

export function IconPlus(props: IconProps): React.JSX.Element {
  return <Plus {...props} />;
}

export function IconSearch(props: IconProps): React.JSX.Element {
  return <Search {...props} />;
}

export function IconMenu(props: IconProps): React.JSX.Element {
  return <Menu {...props} />;
}

export function IconDownload(props: IconProps): React.JSX.Element {
  return <Download {...props} />;
}

export function IconUpload(props: IconProps): React.JSX.Element {
  return <Upload {...props} />;
}

export function IconFlag(props: IconProps): React.JSX.Element {
  return <Flag {...props} />;
}

export function IconUser(props: IconProps): React.JSX.Element {
  return <User {...props} />;
}

export function IconLock(props: IconProps): React.JSX.Element {
  return <Lock {...props} />;
}

export function IconInfo(props: IconProps): React.JSX.Element {
  return <Info {...props} />;
}

export function IconSun(props: IconProps): React.JSX.Element {
  return <Sun {...props} />;
}

export function IconMoon(props: IconProps): React.JSX.Element {
  return <Moon {...props} />;
}
