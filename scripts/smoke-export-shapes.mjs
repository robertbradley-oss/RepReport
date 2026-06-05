import { buildCsv, buildKpiCsv, buildTsv } from "../src/lib/exportCsv.ts";
import { buildKpiWorkbook, buildReviewWorkbook } from "../src/lib/exportExcel.ts";
import { buildReviewExportPackage } from "../src/lib/exportPackage.ts";
import { parseKpiNotes } from "../src/lib/kpiReportParser.ts";
import { parseReviewNotes } from "../src/lib/reviewParser.ts";
import { buildReviewClipboardPayload } from "../src/lib/reviewClipboard.ts";
import { formatCustomerContactSummary, formatReplacementSummary, updateReviewRowCell } from "../src/lib/reviewRowDisplay.ts";
import { getReviewLinkChipLabel, getTicketLinkChipLabel } from "../src/lib/reviewUrlDisplay.ts";
import { buildVisibleReviewRows } from "../src/lib/reviewWorkspace.ts";
import { kpiNotesTemplate, reviewLogTemplate } from "../src/sampleData.ts";
import { KPI_COLUMNS, REVIEW_COLUMNS } from "../src/types.ts";
import { readFileSync } from "node:fs";

const reviewRows = parseReviewNotes(reviewLogTemplate);
const batchReviewRows = parseReviewNotes(readFileSync(new URL("./fixtures/batch-review-notes.txt", import.meta.url), "utf8"));
const { row: kpiRow } = parseKpiNotes(kpiNotesTemplate);
const batchReviewPackage = buildReviewExportPackage(batchReviewRows);
const flaggedDisplayRows = buildVisibleReviewRows(batchReviewRows, true);
const batchReviewClipboardPayload = buildReviewClipboardPayload(batchReviewRows);

const reviewHeader = buildCsv(reviewRows).split("\n")[0];
const batchReviewHeader = buildCsv(batchReviewRows).split("\n")[0];
const batchReviewTsvHeader = parseTsvRecords(buildTsv(batchReviewRows, true))[0].join("\t");
const kpiHeader = buildKpiCsv(kpiRow).split("\n")[0];

assertEqual(reviewHeader, REVIEW_COLUMNS.map((column) => column.label).join(","), "Review CSV header should match the 8 default columns.");
assertEqual(batchReviewHeader, REVIEW_COLUMNS.map((column) => column.label).join(","), "Batch Review CSV header should match the 8 default columns.");
assertEqual(batchReviewTsvHeader, REVIEW_COLUMNS.map((column) => column.label).join("\t"), "Batch Review TSV header should match the 8 default columns.");
assertEqual(kpiHeader, KPI_COLUMNS.map((column) => column.label).join(","), "KPI CSV header should match the 5 default columns.");

assertEqual(Object.keys(batchReviewPackage).join("|"), "pasteRows|summary|flags", "Review export package should keep Paste Rows first.");
assertEqual(batchReviewPackage.pasteRows.name, "Paste Rows", "Review export package primary section should be Paste Rows.");
assertEqual(
  batchReviewPackage.pasteRows.columns.join("|"),
  REVIEW_COLUMNS.map((column) => column.label).join("|"),
  "Review export package Paste Rows columns should match the 8 default columns.",
);
assertEqual(batchReviewPackage.pasteRows.rowCount, batchReviewRows.length, "Paste Rows package row count should match parsed reviews.");
assert(
  flaggedDisplayRows.length > 0 && flaggedDisplayRows.length < batchReviewRows.length,
  "Batch fixture should include enough missing-model rows to prove filtered display is not the export source.",
);
assertEqual(
  batchReviewPackage.pasteRows.rowCount,
  batchReviewRows.length,
  "Review export package should keep the full parsed dataset even when missing-model display rows exist.",
);
assert(
  batchReviewPackage.pasteRows.rowCount !== flaggedDisplayRows.length,
  "Review export package should not shrink to the missing-model display row count.",
);
assertEqual(batchReviewPackage.pasteRows.tsv, buildTsv(batchReviewRows), "Review TSV should come from the same export package dataset.");
assertEqual(batchReviewClipboardPayload.tsv, buildTsv(batchReviewRows), "Review clipboard plain TSV should remain unchanged.");
assertEqual(batchReviewPackage.pasteRows.csv, buildCsv(batchReviewRows), "Review CSV should come from the same export package dataset.");
assert(!batchReviewPackage.pasteRows.tsv.startsWith("Ticket Link"), "Primary Paste Rows TSV should be body-only for review-log paste.");
assert(batchReviewPackage.pasteRows.tsv.includes("\r\n"), "Paste Rows TSV should use CRLF row separators for spreadsheet clipboard paste.");
assert(
  !/[<>]/.test(batchReviewPackage.pasteRows.tsv),
  "Copy Rows TSV should stay text-only and should not include HTML formatting.",
);
assert(
  batchReviewClipboardPayload.html.startsWith('<table style="border-collapse:collapse;">'),
  "Review clipboard HTML should provide a table for formatted spreadsheet paste.",
);

const packageTsvRecords = parseTsvRecords(batchReviewPackage.pasteRows.tsv);
const packageTsvRecordsWithHeader = parseTsvRecords(batchReviewPackage.pasteRows.tsvWithHeader);
assertEqual(packageTsvRecords.length, batchReviewRows.length, "Paste Rows TSV row count should match parsed review count.");
assertEqual(packageTsvRecordsWithHeader.length, batchReviewRows.length + 1, "Paste Rows TSV with header should add exactly one header row.");
assertEqual(packageTsvRecords[0].length, 8, "Paste Rows TSV records should keep exactly 8 cells.");
assertEqual(getTicketLinkChipLabel(batchReviewRows[0]), "Ticket #100001", "Ticket Link display chip should use a compact ticket label.");
assertEqual(getReviewLinkChipLabel(batchReviewRows[0]), "Open Review", "Review Link display chip should use a compact review label.");
assertEqual(
  batchReviewPackage.pasteRows.rows[0][0],
  batchReviewRows[0].ticketLink,
  "Ticket Link export should keep the full original URL, not the display chip label.",
);
assertEqual(
  batchReviewPackage.pasteRows.rows[0][1],
  batchReviewRows[0].reviewLink,
  "Review Link export should keep the full original URL, not the display chip label.",
);
assert(batchReviewPackage.pasteRows.rows[0][0].startsWith("https://"), "Ticket Link export should still be a full URL.");
assert(batchReviewPackage.pasteRows.rows[0][1].startsWith("https://"), "Review Link export should still be a full URL.");
assertEqual(
  packageTsvRecords[0][6],
  batchReviewRows[0].customerContactTicketLink,
  "Paste Rows TSV should preserve multiline customer contact cells.",
);
assert(packageTsvRecords[0][6].includes("\n"), "Parsed Paste Rows TSV should keep newline characters inside multiline cells.");
assert(
  flaggedDisplayRows.every(({ row }) => row.flags.join("|") === "Model missing"),
  "Missing-model filter should include only model reminder rows.",
);
assertEqual(countMatches(batchReviewClipboardPayload.html, /<th>/g), 8, "Review clipboard HTML should keep exactly 8 header columns.");
assertEqual(countMatches(batchReviewClipboardPayload.html, /<tbody><tr>|<\/tr><tr>/g), batchReviewRows.length, "Review clipboard HTML should keep parsed row count.");
assert(
  batchReviewClipboardPayload.html.includes("Ticket #100001<br>Alice Verified<br>Amazon"),
  "Review clipboard HTML should preserve multiline cells with line breaks.",
);
assert(
  batchReviewClipboardPayload.html.includes(batchReviewRows[0].ticketLink) && batchReviewClipboardPayload.html.includes(batchReviewRows[0].reviewLink),
  "Review clipboard HTML should preserve full URL values.",
);

const expandedEditedRows = [
  updateReviewRowCell(
    updateReviewRowCell(batchReviewRows[0], "customerContactTicketLink", "Ticket #238336\nConnor Zitzmann\nGoogle\n6/5/26\nReview mentions name"),
    "replacementSent",
    "We purchased a 5 stage under the sink RO filter.\nThe replacement was sent after support verified the issue.",
  ),
  ...batchReviewRows.slice(1),
];
const expandedEditedPackage = buildReviewExportPackage(expandedEditedRows);
assertEqual(
  formatCustomerContactSummary(expandedEditedRows[0]),
  "Ticket #238336 - Connor Zitzmann - Google - 6/5/26",
  "Edited customer contact collapsed summary should stay compact.",
);
assertEqual(
  formatReplacementSummary(expandedEditedRows[0]),
  "We purchased a 5 stage under the sink RO filter. The replacement was sent after...",
  "Edited replacement collapsed summary should stay compact.",
);
assertEqual(
  expandedEditedPackage.pasteRows.rows[0][6],
  expandedEditedRows[0].customerContactTicketLink,
  "Expanded-row customer contact edits should export the full edited value, not the summary.",
);
assertEqual(
  expandedEditedPackage.pasteRows.rows[0][7],
  expandedEditedRows[0].replacementSent,
  "Expanded-row replacement edits should export the full edited value, not the preview.",
);
assert(expandedEditedPackage.pasteRows.rows[0][6].includes("\n"), "Edited customer contact export should keep multiline text.");
assert(expandedEditedPackage.pasteRows.rows[0][7].includes("\n"), "Edited replacement export should keep multiline text.");

const modelReminderBonusEligibleRow = batchReviewRows.find((row) => row.platform === "Trustpilot" && row.flags.includes("Model missing"));
assert(modelReminderBonusEligibleRow, "Batch fixture should include a missing-model Trustpilot row for summary coverage.");
assertEqual(batchReviewPackage.summary.summary.totalReviews, batchReviewRows.length, "Rows with model reminders should stay in total review counts.");
assertEqual(batchReviewPackage.summary.summary.estimatedBonusTotal, 145, "Rows with model reminders should keep existing bonus behavior.");
assertEqual(packageSummaryValue("Unknown"), 1, "Unknown platform rows should still be counted by platform.");

for (const [index, row] of batchReviewRows.entries()) {
  assertEqual(REVIEW_COLUMNS.map((column) => row[column.key]).length, 8, `Batch export row ${index + 1} should map to 8 review columns.`);
}

const reviewWorkbook = buildReviewWorkbook(reviewRows);
const batchReviewWorkbook = buildReviewWorkbook(batchReviewRows);
const kpiWorkbook = buildKpiWorkbook(kpiRow);

assertEqual(reviewWorkbook.worksheets.map((sheet) => sheet.name).join("|"), "Paste Rows|Summary|Flags|Read Me", "Review workbook sheet order changed.");
assertEqual(batchReviewWorkbook.worksheets.map((sheet) => sheet.name).join("|"), "Paste Rows|Summary|Flags|Read Me", "Batch review workbook sheet order changed.");
assertEqual(kpiWorkbook.worksheets.map((sheet) => sheet.name).join("|"), "KPI Report|Read Me", "KPI workbook sheet order changed.");

const batchPasteRowsSheet = batchReviewWorkbook.getWorksheet("Paste Rows");
assert(batchPasteRowsSheet, "Batch review workbook should include Paste Rows sheet.");
assertEqual(
  batchPasteRowsSheet.getRow(1).values.slice(1).join("|"),
  batchReviewPackage.pasteRows.columns.join("|"),
  "Batch review workbook Paste Rows header should match the 8 default columns.",
);
assertEqual(batchPasteRowsSheet.rowCount, batchReviewPackage.pasteRows.rowCount + 1, "Batch review workbook should include one row per sample review plus header.");

assertCellBaseStyle(batchPasteRowsSheet.getRow(1).getCell(1), "Paste Rows header A1");
assertCellBaseStyle(batchPasteRowsSheet.getRow(2).getCell(3), "Paste Rows body C2");
assertCellBaseStyle(batchPasteRowsSheet.getRow(2).getCell(8), "Paste Rows empty body H2");
assertLinkStyle(batchPasteRowsSheet.getRow(2).getCell(1), "Paste Rows ticket link A2");
assertLinkStyle(batchPasteRowsSheet.getRow(2).getCell(2), "Paste Rows review link B2");
assertYellowFill(batchPasteRowsSheet.getRow(4).getCell(6), "Amazon photo Y cell F4");
assertYellowFill(batchPasteRowsSheet.getRow(6).getCell(6), "Google photo Y cell F6");
assertMultilineCell(batchPasteRowsSheet.getRow(2).getCell(7), "Paste Rows multiline contact cell G2");

const highlightWorkbook = buildReviewWorkbook([
  {
    ...batchReviewRows[0],
    containsVideo: "Y",
    containsPictures: "Y",
  },
]);
const highlightClipboardPayload = buildReviewClipboardPayload([
  {
    ...batchReviewRows[0],
    containsVideo: "Y",
    containsPictures: "Y",
  },
  {
    ...batchReviewRows[1],
    containsVideo: "N",
    containsPictures: "N",
  },
]);
assertEqual(highlightClipboardPayload.tsv, buildTsv([
  {
    ...batchReviewRows[0],
    containsVideo: "Y",
    containsPictures: "Y",
  },
  {
    ...batchReviewRows[1],
    containsVideo: "N",
    containsPictures: "N",
  },
]), "Highlighted clipboard plain TSV should match the existing TSV builder.");
assertEqual(
  countMatches(highlightClipboardPayload.html, /<td style="background-color:#ffff00;">Y<\/td>/g),
  2,
  "Review clipboard HTML should highlight Y cells in video/photo columns.",
);
assertEqual(
  countMatches(highlightClipboardPayload.html, /<td style="background-color:#ffff00;">N<\/td>/g),
  0,
  "Review clipboard HTML should not highlight N cells.",
);
const highlightPasteRowsSheet = highlightWorkbook.getWorksheet("Paste Rows");
assert(highlightPasteRowsSheet, "Highlight workbook should include Paste Rows sheet.");
assertYellowFill(highlightPasteRowsSheet.getRow(2).getCell(5), "Contains video Y cell E2");
assertYellowFill(highlightPasteRowsSheet.getRow(2).getCell(6), "Contains pictures Y cell F2");

const batchSummarySheet = batchReviewWorkbook.getWorksheet("Summary");
assert(batchSummarySheet, "Batch review workbook should include Summary sheet.");
assertCellBaseStyle(batchSummarySheet.getRow(1).getCell(1), "Summary title A1");
assertEqual(batchSummarySheet.getRow(2).getCell(1).value, "Total reviews", "Summary sheet should include total reviews.");
assertEqual(batchSummarySheet.getRow(2).getCell(2).value, 10, "Summary sheet should count all batch reviews.");
assertEqual(batchSummarySheet.getRow(3).getCell(1).value, "Estimated bonus total", "Summary sheet should include estimated bonus total.");
assertEqual(batchSummarySheet.getRow(3).getCell(2).value, 145, "Summary sheet should calculate the batch bonus total.");
assertEqual(summaryValue("Amazon"), 3, "Summary sheet should include Amazon platform count.");
assertEqual(summaryValue("Google"), 3, "Summary sheet should include Google platform count.");
assertEqual(summaryValue("Trustpilot"), 2, "Summary sheet should include Trustpilot platform count.");
assertEqual(summaryValue("Costco"), 1, "Summary sheet should include Costco platform count.");
assertEqual(summaryValue("Unknown"), 1, "Summary sheet should include unknown platform count.");
assertEqual(summaryValue("Verified Amazon count"), 2, "Summary sheet should include verified Amazon count.");
assertEqual(summaryValue("Unverified Amazon count"), 1, "Summary sheet should include unverified Amazon count.");
assertEqual(summaryValue("Photo review count"), 2, "Summary sheet should include photo review count.");

const batchFlagsSheet = batchReviewWorkbook.getWorksheet("Flags");
assert(batchFlagsSheet, "Batch review workbook should include Flags sheet.");
assertCellBaseStyle(batchFlagsSheet.getRow(1).getCell(1), "Flags header A1");

const batchReadMeSheet = batchReviewWorkbook.getWorksheet("Read Me");
assert(batchReadMeSheet, "Batch review workbook should include Read Me sheet.");
assertCellBaseStyle(batchReadMeSheet.getRow(1).getCell(1), "Read Me title A1");

const reviewBuffer = await reviewWorkbook.xlsx.writeBuffer();
const batchReviewBuffer = await batchReviewWorkbook.xlsx.writeBuffer();
const kpiBuffer = await kpiWorkbook.xlsx.writeBuffer();

assert(reviewBuffer.byteLength > 0, "Review Excel workbook should generate non-empty data.");
assert(batchReviewBuffer.byteLength > 0, "Batch review Excel workbook should generate non-empty data.");
assert(kpiBuffer.byteLength > 0, "KPI Excel workbook should generate non-empty data.");

console.log("smoke:exports passed");

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

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

function summaryValue(label) {
  for (let rowNumber = 1; rowNumber <= batchSummarySheet.rowCount; rowNumber += 1) {
    const row = batchSummarySheet.getRow(rowNumber);
    if (row.getCell(1).value === label) {
      return row.getCell(2).value;
    }
  }

  return undefined;
}

function packageSummaryValue(label) {
  const row = batchReviewPackage.summary.rows.find((candidate) => candidate[0] === label);
  return row?.[1];
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

function assertCellBaseStyle(cell, label) {
  assertEqual(cell.font?.name, "Arial", `${label} should use Arial.`);
  assertEqual(cell.font?.size, 10, `${label} should use font size 10.`);
  assertEqual(cell.font?.color?.argb, "FF000000", `${label} should use black text.`);
  assertEqual(cell.fill?.type, "pattern", `${label} should use a pattern fill.`);
  assertEqual(cell.fill?.fgColor?.argb, "FFFFFFFF", `${label} should use white fill.`);
  assertNeutralGrayBorder(cell, label);
  assertEqual(cell.alignment?.wrapText, true, `${label} should preserve wrapped/multiline text.`);
}

function assertLinkStyle(cell, label) {
  assertEqual(cell.font?.name, "Arial", `${label} should keep Arial link font.`);
  assertEqual(cell.font?.size, 10, `${label} should keep font size 10.`);
  assertEqual(cell.font?.color?.argb, "FF1155CC", `${label} should be blue.`);
  assertEqual(cell.fill?.fgColor?.argb, "FFFFFFFF", `${label} should keep white fill.`);
  assertNeutralGrayBorder(cell, label);
}

function assertNeutralGrayBorder(cell, label) {
  for (const side of ["top", "left", "bottom", "right"]) {
    assertEqual(cell.border?.[side]?.style, "thin", `${label} should have a thin ${side} border.`);
    assertEqual(cell.border?.[side]?.color?.argb, "FFD9D9D9", `${label} should have neutral gray ${side} border.`);
  }
}

function assertYellowFill(cell, label) {
  assertEqual(cell.value, "Y", `${label} should be a Y cell.`);
  assertEqual(cell.fill?.type, "pattern", `${label} should use a pattern fill.`);
  assertEqual(cell.fill?.fgColor?.argb, "FFFFFF00", `${label} should be highlighted yellow.`);
  assertNeutralGrayBorder(cell, label);
}

function assertMultilineCell(cell, label) {
  assert(String(cell.value).includes("\n"), `${label} should preserve newline characters.`);
  assertEqual(cell.alignment?.wrapText, true, `${label} should enable wrapped text.`);
}
