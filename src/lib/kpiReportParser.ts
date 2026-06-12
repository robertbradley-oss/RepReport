import type { KpiReportRow } from "../types";

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
  const text = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, " ");

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
  const tickets = lines.flatMap((line) => extractTicketNumbers(line)).slice(0, 3);

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
  return /^ticket\s*#?\s*\d{4,}\b/i.test(cleanListItem(line));
}

function formatWorstTicket(lines: string[]): string {
  const cleanedLines = lines.map(cleanListItem).filter(Boolean);
  const ticketLineIndex = cleanedLines.findIndex((line) => extractTicketNumbers(line).length > 0);
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
  return [...value.matchAll(/(?:ticket\s*#?\s*)?(\d{4,})/gi)].map((match) => match[1]);
}

function removeTicketMarker(value: string): string {
  return value.replace(/(?:ticket\s*#?\s*)?\d{4,}\s*[:;-]?\s*/i, "").trim();
}

function cleanListItem(value: string): string {
  return value.replace(/^\s*(?:[-*]|(?:\d+|#[1-3])[\.)-]?)\s*/, "").trim();
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
