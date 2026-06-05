import { buildCsv, buildKpiCsv } from "../src/lib/exportCsv.ts";
import { buildKpiWorkbook, buildReviewWorkbook } from "../src/lib/exportExcel.ts";
import { parseKpiNotes } from "../src/lib/kpiReportParser.ts";
import { parseReviewNotes } from "../src/lib/reviewParser.ts";
import { kpiNotesTemplate, reviewLogTemplate } from "../src/sampleData.ts";
import { KPI_COLUMNS, REVIEW_COLUMNS } from "../src/types.ts";

const reviewRows = parseReviewNotes(reviewLogTemplate);
const { row: kpiRow } = parseKpiNotes(kpiNotesTemplate);

const reviewHeader = buildCsv(reviewRows).split("\n")[0];
const kpiHeader = buildKpiCsv(kpiRow).split("\n")[0];

assertEqual(reviewHeader, REVIEW_COLUMNS.map((column) => column.label).join(","), "Review CSV header should match the 8 default columns.");
assertEqual(kpiHeader, KPI_COLUMNS.map((column) => column.label).join(","), "KPI CSV header should match the 5 default columns.");

const reviewWorkbook = buildReviewWorkbook(reviewRows);
const kpiWorkbook = buildKpiWorkbook(kpiRow);

assertEqual(reviewWorkbook.worksheets.map((sheet) => sheet.name).join("|"), "Paste Rows|Summary|Flags|Read Me", "Review workbook sheet order changed.");
assertEqual(kpiWorkbook.worksheets.map((sheet) => sheet.name).join("|"), "KPI Report|Read Me", "KPI workbook sheet order changed.");

const reviewBuffer = await reviewWorkbook.xlsx.writeBuffer();
const kpiBuffer = await kpiWorkbook.xlsx.writeBuffer();

assert(reviewBuffer.byteLength > 0, "Review Excel workbook should generate non-empty data.");
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
