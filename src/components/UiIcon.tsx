import {
  BookOpen,
  ChevronDown,
  ClipboardCopy,
  Download,
  FileDown,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  type LucideProps,
} from "lucide-react";
import type { ComponentType, ReactElement } from "react";

type IconComponent = ComponentType<LucideProps>;

function ReviewLogIcon({ size = 24 }: LucideProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="10" y="5" width="13" height="2" />
      <rect x="10" y="10" width="13" height="2" />
      <circle cx="4.5" cy="5.5" r="3.5" />
      <circle cx="4.5" cy="15.5" r="3.5" />
      <rect x="10" y="15" width="13" height="2" />
      <rect x="10" y="20" width="13" height="2" />
    </svg>
  );
}

function KpiReportIcon({ size = 18 }: LucideProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15.487,5.427l-3.914-3.914c-.331-.331-.77-.513-1.237-.513H4.75c-1.517,0-2.75,1.233-2.75,2.75V14.25c0,1.517,1.233,2.75,2.75,2.75H13.25c1.517,0,2.75-1.233,2.75-2.75V6.664c0-.467-.182-.907-.513-1.237Zm-9.737,.573h2c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75h-2c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75Zm6.5,7.5H5.75c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75h6.5c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75Zm0-3H5.75c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75h6.5c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75Zm2.182-4h-2.932c-.55,0-1-.45-1-1V2.579l.013-.005,3.922,3.921-.002,.005Z" />
    </svg>
  );
}

function ParseIcon({ size = 24 }: LucideProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="15.5" cy="8.5" r="1.5" />
      <path d="m23.098.902l-1.184.102c-5.124.44-9.323,2.191-12.292,4.996h-2.66c-.916,0-1.771.411-2.344,1.128L.034,12.867l5.809,1.39,3.899,3.899,1.389,5.81,5.74-4.584c.717-.572,1.128-1.427,1.128-2.345v-2.659c2.805-2.969,4.555-7.169,4.996-12.293l.102-1.184Zm-12.162,15.62l-3.457-3.457c1.109-3.472,4.291-8.746,13.395-9.937-1.191,9.104-6.466,12.285-9.938,13.394Z" />
      <path d="m4.529,15.771l-.571.283c-.425.21-.822.499-1.181.858-1.374,1.373-1.735,4.622-1.772,4.987l-.122,1.217,1.217-.122c.366-.037,3.614-.399,4.988-1.772.359-.36.648-.757.858-1.181l.282-.571-3.7-3.7Z" />
    </svg>
  );
}

const icons = {
  add: Plus,
  clear: Trash2,
  collapseInput: ChevronDown,
  copy: ClipboardCopy,
  download: Download,
  excel: FileDown,
  filter: Filter,
  kpiReport: KpiReportIcon,
  loadSample: RotateCcw,
  parse: ParseIcon,
  reviewLog: ReviewLogIcon,
  search: Search,
  template: BookOpen,
} satisfies Record<string, IconComponent>;

export type UiIconName = keyof typeof icons;

type UiIconProps = {
  name: UiIconName;
  size?: number;
};

export function UiIcon({ name, size = 16 }: UiIconProps) {
  const Icon = icons[name];

  return <Icon size={size} strokeWidth={1} aria-hidden="true" focusable="false" />;
}
