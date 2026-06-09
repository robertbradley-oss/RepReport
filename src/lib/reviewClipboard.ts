import { REVIEW_COLUMNS, type ReviewColumnKey, type ReviewRow } from "../types";
import { copyRichText } from "./clipboard";
import { buildReviewExportPackage } from "./exportPackage";
import { stripInternalNoteMarkers } from "./internalNoteMarkers";

const highlightColumnKeys = new Set<ReviewColumnKey>(["containsVideo", "containsPictures"]);

export type ReviewClipboardPayload = {
  tsv: string;
  html: string;
};

export async function copyReviewRows(rows: ReviewRow[]): Promise<boolean> {
  const payload = buildReviewClipboardPayload(rows);
  return copyRichText(payload.tsv, payload.html);
}

export function buildReviewClipboardPayload(rows: ReviewRow[]): ReviewClipboardPayload {
  const exportPackage = buildReviewExportPackage(rows);

  return {
    tsv: exportPackage.pasteRows.tsv,
    html: buildReviewClipboardHtml(rows),
  };
}

export function buildReviewClipboardHtml(rows: ReviewRow[]): string {
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${REVIEW_COLUMNS.map((column) => {
          const value = stripInternalNoteMarkers(row[column.key]);
          const shouldHighlight = highlightColumnKeys.has(column.key) && value === "Y";
          const style = shouldHighlight ? ' style="background-color:#ffff00;"' : "";
          return `<td${style}>${escapeHtml(value).replace(/\n/g, "<br>")}</td>`;
        }).join("")}</tr>`,
    )
    .join("");

  return [
    '<table style="border-collapse:collapse;">',
    `<tbody>${bodyRows}</tbody>`,
    "</table>",
  ].join("");
}

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
