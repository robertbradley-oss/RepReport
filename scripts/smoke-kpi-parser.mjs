import { buildKpiTsv, parseKpiNotes } from "../src/lib/kpiReportParser.ts";
import { kpiNotesTemplate } from "../src/sampleData.ts";
import { KPI_COLUMNS } from "../src/types.ts";

const expectedKpiLabels = ["Top 3 Achievements", "3 Best Tickets", "#1 of 3 Worst Tickets", "#2 of 3 Worst Tickets", "#3 of 3 Worst Tickets"];

const { row, issues } = parseKpiNotes(kpiNotesTemplate);
const worstTicketFixture = `Top 3 Achievements
1. Cleared stuck warranty follow-ups.
2. Improved response quality on technical tickets.
3. Protected replacement decisions with better verification.

3 Best Tickets
Ticket #232595 - saved RO troubleshooting case
Ticket #228169 - clear install walkthrough
Ticket #237085 - fast warranty closeout

Worst Tickets:
Ticket #240859
Difficult softener escalation with salt mush, no softening, frustration, and a full WCS45KG replacement needed to recover the customer.
Second line stayed with the first worst ticket.

Ticket #239266
Messy RO troubleshooting with unclear symptoms, pressure/tank confusion, phone pressure, and repeated push for full system replacement before the issue was fully isolated.

Ticket #190512
ED2000 satisfaction-policy issue needed correction after the first response denied refund/replacement too strongly.`;
const markdownKpiFixture = `**Top 3 Achievements**
---
1. **Successfully managed a high-risk UV leak and property-damage escalation.**
2. **Generated strong review activity through warranty registrations.**
3. **Resolved several difficult support cases.**

**3 Best Tickets**
- **Ticket #247812**
- **Ticket #251869**
- **Ticket #252364**

**3 Worst Tickets**
**Ticket #251729**
This UVF55FS leak involved claimed property damage, plumbing costs, a full refund, repeated escalation, and later approval for additional parts.

**Ticket #236788**
The RCC7AK noise case required extensive troubleshooting across the tank, pressure, ASO valve, check valve, faucet, tubing, and replacement components.

**Ticket #161122**
Two WF150K systems reportedly released black media and debris into the plumbing.`;

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

const { row: worstTicketRow, issues: worstTicketIssues } = parseKpiNotes(worstTicketFixture);
assertEqual(worstTicketIssues.length, 0, "Worst-ticket fixture should parse without issues.");
assertEqual(
  worstTicketRow.threeBestTickets,
  "Ticket #232595\nTicket #228169\nTicket #237085",
  "Best tickets should remain ticket-number-only.",
);
assertEqual(
  worstTicketRow.worstTicket1,
  "Ticket #240859\nDifficult softener escalation with salt mush, no softening, frustration, and a full WCS45KG replacement needed to recover the customer.\nSecond line stayed with the first worst ticket.",
  "Worst ticket 1 should keep a multiline explanation.",
);
assertEqual(
  worstTicketRow.worstTicket2,
  "Ticket #239266\nMessy RO troubleshooting with unclear symptoms, pressure/tank confusion, phone pressure, and repeated push for full system replacement before the issue was fully isolated.",
  "Worst ticket 2 should keep its explanation.",
);
assertEqual(
  worstTicketRow.worstTicket3,
  "Ticket #190512\nED2000 satisfaction-policy issue needed correction after the first response denied refund/replacement too strongly.",
  "Worst ticket 3 should keep model-number-like explanation text.",
);
const worstTicketTsvRecords = parseTsvRecords(buildKpiTsv(worstTicketRow));
assertEqual(worstTicketTsvRecords.length, 1, "Worst-ticket KPI TSV should contain exactly 1 data row.");
assertEqual(worstTicketTsvRecords[0].length, 5, "Worst-ticket KPI TSV should contain exactly 5 cells.");
assertEqual(worstTicketTsvRecords[0][4], worstTicketRow.worstTicket3, "KPI TSV should preserve third worst-ticket multiline content inside one cell.");
assert(worstTicketTsvRecords[0][4].includes("\nED2000"), "KPI TSV should preserve the third worst-ticket explanation line break.");

const { row: markdownKpiRow, issues: markdownKpiIssues } = parseKpiNotes(markdownKpiFixture);
assertEqual(markdownKpiIssues.length, 0, "Markdown-formatted KPI notes should parse without issues.");
assertEqual(
  markdownKpiRow.top3Achievements,
  "1. Successfully managed a high-risk UV leak and property-damage escalation.\n2. Generated strong review activity through warranty registrations.\n3. Resolved several difficult support cases.",
  "Markdown emphasis and dividers should not become achievement content.",
);
assertEqual(
  markdownKpiRow.threeBestTickets,
  "Ticket #247812\nTicket #251869\nTicket #252364",
  "Markdown-formatted best tickets should remain ticket-number-only.",
);
assertEqual(
  markdownKpiRow.worstTicket1,
  "Ticket #251729\nThis UVF55FS leak involved claimed property damage, plumbing costs, a full refund, repeated escalation, and later approval for additional parts.",
  "The first Markdown-formatted worst ticket should stay in its own column.",
);
assertEqual(
  markdownKpiRow.worstTicket2,
  "Ticket #236788\nThe RCC7AK noise case required extensive troubleshooting across the tank, pressure, ASO valve, check valve, faucet, tubing, and replacement components.",
  "The second Markdown-formatted worst ticket should stay in its own column.",
);
assertEqual(
  markdownKpiRow.worstTicket3,
  "Ticket #161122\nTwo WF150K systems reportedly released black media and debris into the plumbing.",
  "The third Markdown-formatted worst ticket should stay in its own column.",
);
assert(
  Object.values(markdownKpiRow).every((value) => !value.includes("**") && !value.includes("---")),
  "Structural Markdown should not leak into the KPI row.",
);

const quotedKpiTsvRecords = parseTsvRecords(
  buildKpiTsv({
    ...row,
    top3Achievements: '1. Quoted "win"\n2. Follow-up\twith tab',
  }),
);
assertEqual(quotedKpiTsvRecords.length, 1, "Quoted KPI TSV should still parse as 1 data row.");
assertEqual(quotedKpiTsvRecords[0].length, 5, "Quoted KPI TSV should still parse as 5 cells.");
assertEqual(quotedKpiTsvRecords[0][0], '1. Quoted "win"\n2. Follow-up with tab', "KPI TSV should escape quotes and keep tabs inside a cell from becoming column separators.");

const formulaKpiTsvRecord = parseTsvRecords(
  buildKpiTsv({
    top3Achievements: "=1+1",
    threeBestTickets: "+SUM(1,1)",
    worstTicket1: "-1+2",
    worstTicket2: "@SUM(1,1)",
    worstTicket3: " \t=HYPERLINK(\"https://attacker.example\",\"Open\")",
  }),
)[0];
assertEqual(
  formulaKpiTsvRecord.join("|"),
  "'=1+1|'+SUM(1,1)|'-1+2|'@SUM(1,1)|'  =HYPERLINK(\"https://attacker.example\",\"Open\")",
  "KPI TSV should preserve formula-prefixed cells as literal spreadsheet text.",
);

const misleadingNumbers = parseKpiNotes(`3 Best Tickets
RO0000 troubleshooting — Ticket #247812
ED2000 follow-up — Ticket number: 251869
2026 warranty case — #252364
#1 of 3 Worst Tickets
RO0000 replacement cost 1000 in 2026.
Ticket #251729
Resolved the leak.
#2 of 3 Worst Tickets
236788 - Resolved the pressure issue.
#3 of 3 Worst Tickets
ED2000 troubleshooting — Ticket #161122: Corrected the response.`).row;
assertEqual(misleadingNumbers.threeBestTickets, "Ticket #247812\nTicket #251869\nTicket #252364", "Models and dates must not replace best-ticket numbers.");
assertEqual(misleadingNumbers.worstTicket1, "Ticket #251729\nRO0000 replacement cost 1000 in 2026.\nResolved the leak.", "The labeled ticket must win over earlier model, cost, and year numbers.");
assertEqual(misleadingNumbers.worstTicket2, "Ticket #236788\nResolved the pressure issue.", "Bare ticket IDs must survive list cleanup.");
assertEqual(misleadingNumbers.worstTicket3, "Ticket #161122\nED2000 troubleshooting — Corrected the response.", "Removing the ticket marker must preserve model numbers on the same line.");
const noTicket = parseKpiNotes("#1 of 3 Worst Tickets\nED2000 replacement cost 1000 in 2026.").row;
assertEqual(noTicket.worstTicket1, "ED2000 replacement cost 1000 in 2026.", "Unrelated numbers must not fabricate a ticket ID.");
assertEqual(parseKpiNotes("Best Tickets:\n2026 - Weekly summary\nTicket #270041\n1000\nTicket #270014\nTicket #258573").row.threeBestTickets,
  "Ticket #270041\nTicket #270014\nTicket #258573", "Labeled best tickets must take priority over standalone dates and quantities across the section.");
assertEqual(parseKpiNotes("Best Tickets:\n1. 270041\n2. 270014\n3. 258573").row.threeBestTickets,
  "Ticket #270041\nTicket #270014\nTicket #258573", "Numbered lists of bare best-ticket IDs should still parse.");

const reportedSummary = parseKpiNotes(`KPI Summary:

Top 3 Achievements:

1. Maintained strong weekly replacement output while continuing to handle complex troubleshooting and customer follow-ups.
2. Consistently isolated component-level RO and filtration issues before escalating to full-system replacement.
3. Provided strong product guidance across residential, whole-house, UV, softener, and commercial RO applications.

Best Tickets:

**Ticket #270041**
Provided a detailed commercial RO consultation for a hydrostatic-testing application, comparing the RCB3P, RCS5T, and CRO1000 and helping narrow the solution to the customer’s actual production and storage needs.

**Ticket #270014**
Handled a new UVF20 failure with a logical staged approach, replacing the power adapter first before unnecessarily replacing the entire system.

**Ticket #258573**
Used tank isolation and sound-location testing to narrow an RCC7AK chatter issue to the ASO/check-valve area rather than replacing unrelated components.

Worst Tickets:

**Ticket #265610**
A highly frustrating damaged-product claim with inconsistent information and scam-like documentation that required unusually careful handling and verification.

**Ticket #269576**
A difficult RO500 case involving a nonstandard refrigerator/tank setup and repeated frustration, making diagnosis and expectations harder to manage.

**Ticket #250825**
A lengthy CRO2000 case involving repeated pressure, clamp, gauge, and system-head issues that required multiple rounds of troubleshooting before reaching a replacement resolution.`).row;
assertEqual(reportedSummary.threeBestTickets, "Ticket #270041\nTicket #270014\nTicket #258573", "The reported summary must retain all three actual best tickets and exclude CRO1000.");
assertEqual([reportedSummary.worstTicket1, reportedSummary.worstTicket2, reportedSummary.worstTicket3].map((value) => value.split("\n")[0]).join("|"), "Ticket #265610|Ticket #269576|Ticket #250825", "The reported summary must retain the correct worst tickets.");
assert(reportedSummary.worstTicket3.includes("CRO2000"), "Model names must remain in the explanation.");

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
