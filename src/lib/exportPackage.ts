import { REVIEW_COLUMNS, type ReviewRow } from "../types";
import { stripInternalNoteMarkers } from "./internalNoteMarkers";
import { calculateBonusSummary, detectReviewPlatform, type BonusSummary } from "./reviewParser";

export type ExportCell = string | number | null;

export type ReviewExportPackage = {
  pasteRows: {
    name: "Paste Rows";
    columns: string[];
    rows: string[][];
    rowCount: number;
    tsv: string;
    tsvWithHeader: string;
    csv: string;
  };
  summary: {
    name: "Summary";
    rows: ExportCell[][];
    summary: BonusSummary;
  };
  flags: {
    name: "Flags";
    columns: string[];
    rows: ExportCell[][];
    flagCount: number;
  };
};

export type ReviewOutputBlocker = {
  rowNumber: number;
  reason: "missing review link" | "unrecognized review link";
};

const flagColumns = ["Source Row", "Customer", "Model", "Platform", "Flag"];

export function getReviewOutputBlockers(rows: ReviewRow[]): ReviewOutputBlocker[] {
  const blockers: ReviewOutputBlocker[] = [];

  rows.forEach((row, index) => {
    if (!row.reviewLink.trim()) {
      blockers.push({ rowNumber: index + 1, reason: "missing review link" });
      return;
    }

    if (row.platform === "Unknown" || detectReviewPlatform(row.reviewLink) === "Unknown") {
      blockers.push({ rowNumber: index + 1, reason: "unrecognized review link" });
    }
  });

  return blockers;
}

export function buildReviewExportPackage(rows: ReviewRow[]): ReviewExportPackage {
  const pasteColumns = REVIEW_COLUMNS.map((column) => column.label);
  const pasteRows = rows.map((row) => REVIEW_COLUMNS.map((column) => stripInternalNoteMarkers(row[column.key])));
  const summary = calculateBonusSummary(rows);
  const flagRows = buildFlagRows(rows);

  return {
    pasteRows: {
      name: "Paste Rows",
      columns: pasteColumns,
      rows: pasteRows,
      rowCount: pasteRows.length,
      tsv: buildCopyReadyTsv(pasteColumns, pasteRows),
      tsvWithHeader: buildCopyReadyTsv(pasteColumns, pasteRows, true),
      csv: buildCsvDocument(pasteColumns, pasteRows),
    },
    summary: {
      name: "Summary",
      rows: buildSummaryRows(summary),
      summary,
    },
    flags: {
      name: "Flags",
      columns: flagColumns,
      rows: flagRows,
      flagCount: flagRows.length,
    },
  };
}

export function buildCopyReadyTsv(columns: readonly string[], rows: readonly (readonly ExportCell[])[], includeHeader = false): string {
  const records = includeHeader ? [columns, ...rows] : rows;
  return records.map((record) => record.map(escapeTsvCell).join("\t")).join("\r\n");
}

export function buildCsvDocument(columns: readonly string[], rows: readonly (readonly ExportCell[])[]): string {
  const records = [columns, ...rows];
  return records.map((record) => record.map(escapeCsvCell).join(",")).join("\n");
}

function buildSummaryRows(summary: BonusSummary): ExportCell[][] {
  return [
    ["RepReport Review Log Summary", null, null],
    ["Total reviews", summary.totalReviews, null],
    ["Estimated bonus total", summary.estimatedBonusTotal, null],
    ["Platform counts", null, null],
    ...summary.platformCounts.map(({ platform, count }) => [platform, count, null]),
    [null, null, null],
    ["Amazon/photo counts", null, null],
    ["Verified Amazon count", summary.verifiedAmazonCount, null],
    ["Unverified Amazon count", summary.unverifiedAmazonCount, null],
    ["Photo review count", summary.photoReviewCount, null],
  ];
}

function buildFlagRows(rows: ReviewRow[]): ExportCell[][] {
  return rows.flatMap((row, rowIndex) =>
    row.flags.map((flag) => [rowIndex + 1, row.customerName ?? "", row.modelNumber, row.platform, flag]),
  );
}

function normalizeDelimitedCell(value: ExportCell): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function escapeTsvCell(value: ExportCell): string {
  const text = normalizeDelimitedCell(value).replace(/\t/g, " ");
  if (/["\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function escapeCsvCell(value: ExportCell): string {
  const text = normalizeDelimitedCell(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
