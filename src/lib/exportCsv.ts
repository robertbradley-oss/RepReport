import { REVIEW_COLUMNS, type ReviewRow } from "../types";

export function buildTsv(rows: ReviewRow[], includeHeader = false): string {
  const lines = rows.map((row) => REVIEW_COLUMNS.map((column) => escapeTsv(row[column.key])).join("\t"));

  if (includeHeader) {
    lines.unshift(REVIEW_COLUMNS.map((column) => column.label).join("\t"));
  }

  return lines.join("\n");
}

export function downloadCsv(rows: ReviewRow[]): void {
  const header = REVIEW_COLUMNS.map((column) => escapeCsv(column.label)).join(",");
  const body = rows
    .map((row) => REVIEW_COLUMNS.map((column) => escapeCsv(row[column.key])).join(","))
    .join("\n");

  downloadTextFile([header, body].filter(Boolean).join("\n"), "repreport-review-rows.csv", "text/csv;charset=utf-8");
}

function sanitizeForTsv(value: string): string {
  return String(value ?? "").replace(/\t/g, " ");
}

function escapeTsv(value: string): string {
  const text = sanitizeForTsv(value);
  if (/["\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
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
