import type { KpiReportRow } from "../types";
import { neutralizeSpreadsheetFormula } from "./spreadsheetCell";

type KpiSection = "achievements" | "bestTickets" | "worstTickets" | "worstTicket1" | "worstTicket2" | "worstTicket3";

type SectionMap = Record<KpiSection, string[]>;

export type KpiParseResult = {
  row: KpiReportRow;
  issues: string[];
};

const blankKpiRow: KpiReportRow = {
  top3Achievements: "",
  threeBestTickets: "",
  worstTicket1: "",
  worstTicket2: "",
  worstTicket3: "",
};

export function createBlankKpiRow(): KpiReportRow {
  return { ...blankKpiRow };
}

export function parseKpiNotes(notes: string): KpiParseResult {
  const sections: SectionMap = {
    achievements: [],
    bestTickets: [],
    worstTickets: [],
    worstTicket1: [],
    worstTicket2: [],
    worstTicket3: [],
  };
  const unsectioned: string[] = [];
  let currentSection: KpiSection | null = null;

  for (const rawLine of notes.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const heading = detectHeading(line);
    if (heading) {
      currentSection = heading.section;
      if (heading.remainder) {
        sections[currentSection].push(heading.remainder);
      }
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    } else {
      unsectioned.push(line);
    }
  }

  const top3Achievements = formatAchievements(sections.achievements);
  const threeBestTickets = formatBestTickets(sections.bestTickets);
  const worstSummaries = formatWorstTickets(sections);
  const row: KpiReportRow = {
    top3Achievements,
    threeBestTickets,
    worstTicket1: worstSummaries[0] ?? "",
    worstTicket2: worstSummaries[1] ?? "",
    worstTicket3: worstSummaries[2] ?? "",
  };
  const issues = collectKpiIssues(row, unsectioned);

  return { row, issues };
}

export function buildKpiTsv(row: KpiReportRow): string {
  return [row.top3Achievements, row.threeBestTickets, row.worstTicket1, row.worstTicket2, row.worstTicket3].map(escapeKpiTsvCell).join("\t");
}

function escapeKpiTsvCell(value: string): string {
  const text = neutralizeSpreadsheetFormula(
    String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, " "),
  );

  if (/["\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function detectHeading(line: string): { section: KpiSection; remainder: string } | null {
  const [rawHeading, ...rest] = line.split(":");
  const heading = normalizeHeading(rawHeading);
  const remainder = rest.join(":").trim();

  if (heading === "top3achievements" || heading === "topachievements") {
    return { section: "achievements", remainder };
  }

  if (heading === "3besttickets" || heading === "besttickets") {
    return { section: "bestTickets", remainder };
  }

  if (heading === "worsttickets" || heading === "3worsttickets") {
    return { section: "worstTickets", remainder };
  }

  if (heading === "1of3worsttickets" || heading === "1worstticket" || heading === "worstticket1") {
    return { section: "worstTicket1", remainder };
  }

  if (heading === "2of3worsttickets" || heading === "2worstticket" || heading === "worstticket2") {
    return { section: "worstTicket2", remainder };
  }

  if (heading === "3of3worsttickets" || heading === "3worstticket" || heading === "worstticket3") {
    return { section: "worstTicket3", remainder };
  }

  return null;
}

function normalizeHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/#/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function formatAchievements(lines: string[]): string {
  const achievements = lines.map(cleanListItem).filter(Boolean).slice(0, 3);

  return achievements.map((achievement, index) => `${index + 1}. ${achievement}`).join("\n");
}

function formatBestTickets(lines: string[]): string {
  const cleanedLines = lines.map(cleanListItem).filter(Boolean);
  const explicitTickets = cleanedLines.flatMap((line) => findTicketMarkers(line, false).map((match) => match[1]));
  const tickets = (explicitTickets.length > 0
    ? explicitTickets
    : cleanedLines.flatMap((line) => extractTicketNumbers(line))).slice(0, 3);

  if (tickets.length > 0) {
    return tickets.map((ticket) => `Ticket #${ticket}`).join("\n");
  }

  return lines.map(cleanListItem).filter(Boolean).slice(0, 3).join("\n");
}

function formatWorstTickets(sections: SectionMap): string[] {
  const individualSections = [sections.worstTicket1, sections.worstTicket2, sections.worstTicket3].map(formatWorstTicket).filter(Boolean);

  if (individualSections.length > 0) {
    return individualSections;
  }

  return splitWorstTicketSection(sections.worstTickets).map(formatWorstTicket).filter(Boolean).slice(0, 3);
}

function splitWorstTicketSection(lines: string[]): string[][] {
  const groups: string[][] = [];
  let currentGroup: string[] = [];

  for (const line of lines) {
    if (isWorstTicketStart(line) && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(line);
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function isWorstTicketStart(line: string): boolean {
  return findTicketMarkers(cleanListItem(line)).some((match) => match.index === 0);
}

function formatWorstTicket(lines: string[]): string {
  const cleanedLines = lines.map(cleanListItem).filter(Boolean);
  // Prefer a labeled ticket anywhere in the summary over an unlabeled number.
  const explicitLineIndex = cleanedLines.findIndex((line) => findTicketMarkers(line, false).length > 0);
  const ticketLineIndex = explicitLineIndex >= 0
    ? explicitLineIndex
    : cleanedLines.findIndex((line) => extractTicketNumbers(line).length > 0);
  const ticketNumber = ticketLineIndex >= 0 ? extractTicketNumbers(cleanedLines[ticketLineIndex])[0] : "";
  const ticketLineDetail = ticketLineIndex >= 0 ? removeTicketMarker(cleanedLines[ticketLineIndex]) : "";
  const detailLines = ticketNumber
    ? [ticketLineDetail, ...cleanedLines.filter((_, index) => index !== ticketLineIndex)].filter(Boolean)
    : cleanedLines;
  const details = detailLines.join("\n").trim();

  if (!ticketNumber) {
    return details;
  }

  return [`Ticket #${ticketNumber}`, details].filter(Boolean).join("\n");
}

function extractTicketNumbers(value: string): string[] {
  return findTicketMarkers(value).map((match) => match[1]);
}

function findTicketMarkers(value: string, allowBare = true): RegExpMatchArray[] {
  const explicit = [...value.matchAll(/(?:\bticket\s*(?:(?:number|no\.?)\s*)?[:#]?\s*|(?<!\w)#\s*)(\d{4,})\b/gi)];
  if (explicit.length > 0 || !allowBare) {
    return explicit;
  }

  // Bare IDs are supported only at the start of a ticket entry, not in prose.
  return [...value.matchAll(/^(\d{4,})(?=\s*(?:$|[:;–—-]))/g)];
}

function removeTicketMarker(value: string): string {
  const marker = findTicketMarkers(value)[0];
  if (!marker || marker.index === undefined) {
    return value;
  }
  const after = value.slice(marker.index + marker[0].length).replace(/^\s*[:;–—-]?\s*/, "");
  return `${value.slice(0, marker.index)}${after}`.trim();
}

function cleanListItem(value: string): string {
  let cleaned = value.trim();

  if (/^(?:\*{3,}|_{3,}|-{3,})$/.test(cleaned)) {
    return "";
  }

  cleaned = cleaned
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/^(?:[-+*])\s+/, "")
    .replace(/^(?:\d{1,3}|#[1-3])(?:[\.)-]\s*|\s+)/, "")
    .trim();

  return unwrapMarkdownEmphasis(cleaned);
}

function unwrapMarkdownEmphasis(value: string): string {
  let cleaned = value.trim();

  for (const marker of ["***", "___", "**", "__", "*", "_"]) {
    if (cleaned.startsWith(marker) && cleaned.endsWith(marker) && cleaned.length > marker.length * 2) {
      cleaned = cleaned.slice(marker.length, -marker.length).trim();
      break;
    }
  }

  return cleaned;
}

function collectKpiIssues(row: KpiReportRow, unsectioned: string[]): string[] {
  const issues: string[] = [];

  if (!row.top3Achievements) {
    issues.push("Top 3 Achievements section was not found.");
  }

  if (!row.threeBestTickets) {
    issues.push("3 Best Tickets section was not found.");
  }

  if (!row.worstTicket1) {
    issues.push("#1 of 3 Worst Tickets is empty.");
  }

  if (!row.worstTicket2) {
    issues.push("#2 of 3 Worst Tickets is empty.");
  }

  if (!row.worstTicket3) {
    issues.push("#3 of 3 Worst Tickets is empty.");
  }

  if (unsectioned.length > 0) {
    issues.push("Some lines were outside recognized KPI headings.");
  }

  return issues;
}
