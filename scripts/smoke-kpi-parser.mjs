import { buildKpiTsv, parseKpiNotes } from "../src/lib/kpiReportParser.ts";
import { kpiNotesTemplate } from "../src/sampleData.ts";
import { KPI_COLUMNS } from "../src/types.ts";

const expectedKpiLabels = ["Top 3 Achievements", "3 Best Tickets", "#1 of 3 Worst Tickets", "#2 of 3 Worst Tickets", "#3 of 3 Worst Tickets"];

const { row, issues } = parseKpiNotes(kpiNotesTemplate);

assertEqual(issues.length, 0, "Representative KPI template should parse without issues.");
assertEqual(Object.keys(row).length, 5, "KPI row should contain exactly 5 fields.");
assertEqual(
  KPI_COLUMNS.map((column) => column.label).join("|"),
  expectedKpiLabels.join("|"),
  "KPI export column order changed.",
);

const achievementLines = row.top3Achievements.split("\n");
assertEqual(achievementLines.length, 3, "Top3Achievements should contain 3 lines.");
achievementLines.forEach((line, index) => {
  assert(line.startsWith(`${index + 1}. `), `Achievement ${index + 1} should stay numbered.`);
});

const bestTicketLines = row.threeBestTickets.split("\n");
assertEqual(bestTicketLines.length, 3, "3BestTickets should contain 3 stacked ticket lines.");
bestTicketLines.forEach((line) => {
  assert(/^Ticket #\d+/.test(line), `Best ticket line should start with Ticket #: ${line}`);
});

for (const [index, value] of [row.worstTicket1, row.worstTicket2, row.worstTicket3].entries()) {
  assert(value.startsWith("Ticket #"), `Worst ticket ${index + 1} should start with Ticket #.`);
}

const kpiTsv = buildKpiTsv(row);
const kpiTsvRecords = parseTsvRecords(kpiTsv);
assertEqual(kpiTsvRecords.length, 1, "KPI TSV copy shape should contain exactly 1 data row.");
assertEqual(kpiTsvRecords[0].length, 5, "KPI TSV copy shape should contain exactly 5 cells.");
assertEqual(kpiTsvRecords[0][0], row.top3Achievements, "KPI TSV should preserve multiline achievements inside one cell.");
assertEqual(kpiTsvRecords[0][1], row.threeBestTickets, "KPI TSV should preserve multiline best tickets inside one cell.");
assertEqual(kpiTsvRecords[0][2], row.worstTicket1, "KPI TSV should preserve multiline worst ticket 1 inside one cell.");
assert(kpiTsvRecords[0][0].includes("\n"), "KPI TSV parsed achievements cell should retain line breaks.");
assert(kpiTsvRecords[0][2].includes("\n"), "KPI TSV parsed worst-ticket cell should retain line breaks.");

const quotedKpiTsvRecords = parseTsvRecords(
  buildKpiTsv({
    ...row,
    top3Achievements: '1. Quoted "win"\n2. Follow-up\twith tab',
  }),
);
assertEqual(quotedKpiTsvRecords.length, 1, "Quoted KPI TSV should still parse as 1 data row.");
assertEqual(quotedKpiTsvRecords[0].length, 5, "Quoted KPI TSV should still parse as 5 cells.");
assertEqual(quotedKpiTsvRecords[0][0], '1. Quoted "win"\n2. Follow-up with tab', "KPI TSV should escape quotes and keep tabs inside a cell from becoming column separators.");

console.log("smoke:kpi passed");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${String(expected)}\nActual: ${String(actual)}`);
  }
}

function parseTsvRecords(text) {
  const records = [];
  let record = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell === "") {
      inQuotes = true;
    } else if (char === "\t") {
      record.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      record.push(cell);
      records.push(record);
      record = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  if (text.length > 0 || cell || record.length > 0) {
    record.push(cell);
    records.push(record);
  }

  return records;
}
