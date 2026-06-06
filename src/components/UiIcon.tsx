import {
  BookOpen,
  ChevronDown,
  ClipboardCopy,
  Download,
  FileDown,
  FileSpreadsheet,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  TableProperties,
  Trash2,
  type LucideIcon,
} from "lucide-react";

const icons = {
  add: Plus,
  clear: Trash2,
  collapseInput: ChevronDown,
  copy: ClipboardCopy,
  download: Download,
  excel: FileDown,
  filter: Filter,
  kpiReport: FileSpreadsheet,
  loadSample: RotateCcw,
  parse: Sparkles,
  reviewLog: TableProperties,
  search: Search,
  template: BookOpen,
} satisfies Record<string, LucideIcon>;

export type UiIconName = keyof typeof icons;

type UiIconProps = {
  name: UiIconName;
  size?: number;
};

export function UiIcon({ name, size = 16 }: UiIconProps) {
  const Icon = icons[name];

  return <Icon size={size} strokeWidth={1} aria-hidden="true" focusable="false" />;
}
