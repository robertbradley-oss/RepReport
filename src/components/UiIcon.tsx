import {
  BookOpen,
  ChevronDown,
  Download,
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
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M22.5 8.09601C15.8466 4.99053 9.14693 5.3359 2.50384 9.13211L2 9.42003V42.7232L3.49616 41.8682C9.85443 38.2348 16.1482 38.053 22.5 41.323V8.09601Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M25.5 41.323C31.8518 38.053 38.1456 38.2348 44.5038 41.8682L46 42.7232V9.42003L45.4962 9.13211C38.8531 5.3359 32.1534 4.99053 25.5 8.09601V41.323ZM39.9255 17.662C37.3756 16.6048 34.0916 16.6764 31.6507 17.8515L30.2992 18.5022L28.9978 15.7992L30.3493 15.1485C33.5808 13.5927 37.7568 13.5152 41.0745 14.8907L42.4601 15.4652L41.3111 18.2365L39.9255 17.662ZM39.9255 24.7452C37.3756 23.688 34.0916 23.7596 31.6507 24.9348L30.2992 25.5854L28.9978 22.8824L30.3493 22.2317C33.5808 20.6759 37.7568 20.5985 41.0745 21.974L42.4601 22.5484L41.3111 25.3197L39.9255 24.7452ZM31.6507 32.018C34.0916 30.8428 37.3756 30.7712 39.9255 31.8284L41.3112 32.4029L42.4601 29.6317L41.0745 29.0572C37.7568 27.6817 33.5808 27.7592 30.3493 29.3149L28.9978 29.9656L30.2991 32.6687L31.6507 32.018Z"
      />
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

function ExcelIcon({ size = 24 }: LucideProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeMiterlimit={10}
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <path d="m3,16v3c0,1.105.895,2,2,2h14c1.105,0,2-.895,2-2v-3" />
      <polyline points="12 15 12 3 12 4" />
      <polyline points="17 8 12 3 7 8" />
    </svg>
  );
}

function FilterIcon({ size = 24 }: LucideProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeMiterlimit={10}
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="3 3 21 3 21 5 14 13 14 20 10 22 10 13 3 5 3 3" />
    </svg>
  );
}

function CopyIcon({ size = 20 }: LucideProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m13,7h2c1.105,0,2,.895,2,2v6c0,1.105-.895,2-2,2h-6c-1.105,0-2-.895-2-2v-2" />
      <rect x="3" y="3" width="10" height="10" rx="2" ry="2" />
    </svg>
  );
}

const icons = {
  add: Plus,
  clear: Trash2,
  collapseInput: ChevronDown,
  copy: CopyIcon,
  download: Download,
  excel: ExcelIcon,
  filter: FilterIcon,
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
