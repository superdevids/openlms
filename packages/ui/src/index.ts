import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung className Tailwind (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================
// Design system openlms — semua komponen shadcn/ui di satu paket.
// Stateless: data lewat props; state server-side dipegang app.
// ============================================================

export { Button, Spinner, type ButtonProps } from "./components/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "./components/card";
export { Badge, type BadgeProps } from "./components/badge";
export { Input } from "./components/input";
export { Label } from "./components/label";
export { Textarea } from "./components/textarea";
export { Select, type SelectOption } from "./components/select";
export { Checkbox } from "./components/checkbox";
export { RadioGroup } from "./components/radio";
export { Switch, type SwitchProps } from "./components/switch";
export { Alert, AlertTitle, AlertDescription } from "./components/alert";
export { Dialog, ConfirmDialog } from "./components/dialog";
export { Tabs, TabPanel } from "./components/tabs";
export { Accordion, AccordionItem } from "./components/accordion";
export { Tooltip } from "./components/tooltip";
export { DropdownMenu, DropdownMenuItem } from "./components/dropdown-menu";
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./components/table";
export { Progress, type ProgressProps } from "./components/progress";
export { Skeleton, SkeletonCard, SkeletonList } from "./components/skeleton";
export { EmptyState } from "./components/empty-state";
export { ErrorState, FeatureDisabledState, DemoBanner } from "./components/error-state";
export { DataView, type LoadStatus } from "./components/data-view";
export { Steps, type StepDef } from "./components/steps";
export {
  toast,
  dismiss,
  useToasts,
  Toaster,
  type ToastItem,
  type ToastVariant
} from "./components/toast";
export * as Icons from "./components/icons";
export type { IconProps } from "./components/icons";
export {
  IconHome,
  IconBook,
  IconClipboard,
  IconQuiz,
  IconExam,
  IconChart,
  IconQr,
  IconCamera,
  IconCalendar,
  IconBell,
  IconClock,
  IconAlert,
  IconCheck,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconEllipsis,
  IconLogout,
  IconSettings,
  IconDatabase,
  IconWallet,
  IconAcademic,
  IconBriefcase,
  IconRocket,
  IconRefresh,
  IconFile,
  IconBank,
  IconGrade,
  IconPlus,
  IconSearch,
  IconMenu,
  IconDownload,
  IconUpload,
  IconFlag,
  IconUser,
  IconLock,
  IconInfo,
  IconSun,
  IconMoon
} from "./components/icons";
