import { buildKpiTsv, parseKpiNotes } from "../src/lib/kpiReportParser.ts";
import { kpiNotesTemplate } from "../src/sampleData.ts";
import { KPI_COLUMNS } from "../src/types.ts";

const expectedKpiLabels = ["Top3Achievements", "3BestTickets", "#1 of 3WorstTickets", "#2 of 3WorstTickets", "#3 of 3WorstTickets"];

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

assertEqual(buildKpiTsv(row).split("\t").length, 5, "KPI TSV copy shape should contain 5 columns.");

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
