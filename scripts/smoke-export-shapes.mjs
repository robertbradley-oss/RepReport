import { buildCsv, buildKpiCsv, buildTsv } from "../src/lib/exportCsv.ts";
import { buildKpiWorkbook, buildReviewWorkbook } from "../src/lib/exportExcel.ts";
import { parseKpiNotes } from "../src/lib/kpiReportParser.ts";
import { parseReviewNotes } from "../src/lib/reviewParser.ts";
import { kpiNotesTemplate, reviewLogTemplate } from "../src/sampleData.ts";
import { KPI_COLUMNS, REVIEW_COLUMNS } from "../src/types.ts";
import { readFileSync } from "node:fs";

const reviewRows = parseReviewNotes(reviewLogTemplate);
const batchReviewRows = parseReviewNotes(readFileSync(new URL("./fixtures/batch-review-notes.txt", import.meta.url), "utf8"));
const { row: kpiRow } = parseKpiNotes(kpiNotesTemplate);

const reviewHeader = buildCsv(reviewRows).split("\n")[0];
const batchReviewHeader = buildCsv(batchReviewRows).split("\n")[0];
const batchReviewTsvHeader = buildTsv(batchReviewRows, true).split("\n")[0];
const kpiHeader = buildKpiCsv(kpiRow).split("\n")[0];

assertEqual(reviewHeader, REVIEW_COLUMNS.map((column) => column.label).join(","), "Review CSV header should match the 8 default columns.");
assertEqual(batchReviewHeader, REVIEW_COLUMNS.map((column) => column.label).join(","), "Batch Review CSV header should match the 8 default columns.");
assertEqual(batchReviewTsvHeader, REVIEW_COLUMNS.map((column) => column.label).join("\t"), "Batch Review TSV header should match the 8 default columns.");
assertEqual(kpiHeader, KPI_COLUMNS.map((column) => column.label).join(","), "KPI CSV header should match the 5 default columns.");

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
  REVIEW_COLUMNS.map((column) => column.label).join("|"),
  "Batch review workbook Paste Rows header should match the 8 default columns.",
);
assertEqual(batchPasteRowsSheet.rowCount, batchReviewRows.length + 1, "Batch review workbook should include one row per sample review plus header.");

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

function summaryValue(label) {
  for (let rowNumber = 1; rowNumber <= batchSummarySheet.rowCount; rowNumber += 1) {
    const row = batchSummarySheet.getRow(rowNumber);
    if (row.getCell(1).value === label) {
      return row.getCell(2).value;
    }
  }

  return undefined;
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
