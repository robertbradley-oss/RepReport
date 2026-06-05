import { KPI_COLUMNS, type KpiReportRow, type ReviewRow } from "../types";
import { buildReviewExportPackage } from "./exportPackage";

export function buildTsv(rows: ReviewRow[], includeHeader = false): string {
  const exportPackage = buildReviewExportPackage(rows);
  return includeHeader ? exportPackage.pasteRows.tsvWithHeader : exportPackage.pasteRows.tsv;
}

export function downloadCsv(rows: ReviewRow[]): void {
  downloadTextFile(buildCsv(rows), "repreport-review-rows.csv", "text/csv;charset=utf-8");
}

export function downloadKpiCsv(row: KpiReportRow): void {
  downloadTextFile(buildKpiCsv(row), "repreport-kpi-report.csv", "text/csv;charset=utf-8");
}

export function buildCsv(rows: ReviewRow[]): string {
  return buildReviewExportPackage(rows).pasteRows.csv;
}

export function buildKpiCsv(row: KpiReportRow): string {
  const header = KPI_COLUMNS.map((column) => escapeCsv(column.label)).join(",");
  const body = KPI_COLUMNS.map((column) => escapeCsv(row[column.key])).join(",");

  return [header, body].join("\n");
}

function escapeCsv(value: string): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function downloadTextFile(content: string, fileName: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
