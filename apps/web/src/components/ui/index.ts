/**
 * Shared components APP Design System v3 (docs/app-design-system-v3.md §D).
 * Import mudah: `import { PageHeader, StatCard, StatusBadge } from "@/components/ui"`.
 */

export { PageContainer } from "./page-container";
export { PageHeader } from "./page-header";
export {
  StatCard,
  StatGrid,
  Sparkline,
  type StatCardProps,
  type StatTone,
  type StatDelta
} from "./stat-card";
export { StatusBadge, DEFAULT_STATUS_TONE, type StatusTone } from "./status-badge";
export {
  DataTable,
  type DataTableColumn,
  type DataTablePagination,
  type DataTableProps
} from "./data-table";
export { EmptyStateV3 } from "./empty-state-v3";
export { FormPage, FormSection, ValidationAlert } from "./form-page";
export { CommandPalette, type CommandItem } from "./command-palette";
