import type { ReviewColumnKey, ReviewRow, YesNo } from "../types";
import { stripInternalNoteMarkers } from "./internalNoteMarkers";
import { flagMessages } from "./reviewParser";

const knownPlatforms = ["Amazon", "Google", "Trustpilot", "Yelp", "Costco", "Costco US", "Costco.ca", "Home Depot", "Zoro", "Walmart", "PureDrop", "Lowe's", "Unknown"];

export function updateReviewRowCell(row: ReviewRow, key: ReviewColumnKey, value: string): ReviewRow {
  const nextValue = key === "customerContactTicketLink" || key === "replacementSent" ? stripInternalNoteMarkers(value) : value;

  const nextRow: ReviewRow = {
    ...row,
    [key]: key === "verifiedFiveStar" || key === "containsVideo" || key === "containsPictures" ? normalizeYesNo(nextValue) : nextValue,
  };

  // Keep the "Model missing" reminder in sync when the model is edited inline,
  // so reminders/flags/summary counts update immediately. Only this flag is
  // touched; any other flags on the row are preserved.
  if (key === "modelNumber") {
    const hasModel = nextValue.trim().length > 0;
    const withoutModelFlag = row.flags.filter((flag) => flag !== flagMessages.modelMissing);
    nextRow.flags = hasModel ? withoutModelFlag : [...withoutModelFlag, flagMessages.modelMissing];
  }

  return nextRow;
}

export function formatCustomerContactSummary(row: ReviewRow): string {
  const customerContactTicketLink = stripInternalNoteMarkers(row.customerContactTicketLink);
  const lines = splitDisplayLines(customerContactTicketLink);
  const ticket = lines.find((line) => /^Ticket #\d+/i.test(line)) ?? (row.ticketNumber ? `Ticket #${row.ticketNumber}` : "");
  const customer = findCustomerLine(lines, ticket) ?? row.customerName ?? "";
  const platform = findKnownPlatform(lines) ?? (row.platform && row.platform !== "Unknown" ? row.platform : "");
  const dateOrStatus = findDateOrStatusLine(lines) ?? row.reviewDateOrStatus ?? "";
  const parts = [ticket, customer, platform, dateOrStatus].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : compactPreview(customerContactTicketLink, 80);
}

export function formatReplacementSummary(row: ReviewRow): string {
  const summary = compactPreview(stripInternalNoteMarkers(row.replacementSent), 82);
  return summary || "No replacement text";
}

export function compactPreview(value: string, maxLength: number): string {
  const compacted = value.replace(/\s+/g, " ").trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function normalizeYesNo(value: string): YesNo {
  return value.trim().toUpperCase() === "Y" ? "Y" : "N";
}

function splitDisplayLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findCustomerLine(lines: string[], ticket: string): string | undefined {
  return lines.find(
    (line) =>
      line !== ticket &&
      !knownPlatforms.includes(line) &&
      !isPlatformLine(line) &&
      !/^Review (mentions|does not mention) name$/i.test(line) &&
      !/^\d+(?:\.\d+)?\s*(?:out of\s*)?\d*\s*stars?$/i.test(line) &&
      !isDateOrStatusLine(line),
  );
}

function findKnownPlatform(lines: string[]): string | undefined {
  return lines.find((line) => isPlatformLine(line) && line !== "Unknown");
}

function isPlatformLine(line: string): boolean {
  return knownPlatforms.includes(line) || /^Amazon @ /.test(line);
}

function findDateOrStatusLine(lines: string[]): string | undefined {
  return lines.find(isDateOrStatusLine);
}

function isDateOrStatusLine(line: string): boolean {
  return (
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(line) ||
    /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}$/i.test(line) ||
    /pending|posted|updated|reviewed/i.test(line)
  );
}
