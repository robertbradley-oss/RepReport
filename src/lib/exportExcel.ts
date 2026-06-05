import ExcelJS from "exceljs";
import { KPI_COLUMNS, type KpiReportRow, type ReviewRow } from "../types";
import { buildReviewExportPackage, type ReviewExportPackage } from "./exportPackage";

const fontName = "Arial";
const fontSize = 10;
const whiteFill = "FFFFFFFF";
const headerFill = "FFD9D9D9";
const yellowFill = "FFFFFF00";
const grayBorder = "FFD9D9D9";
const linkBlue = "FF1155CC";

const border: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: grayBorder } },
  left: { style: "thin", color: { argb: grayBorder } },
  bottom: { style: "thin", color: { argb: grayBorder } },
  right: { style: "thin", color: { argb: grayBorder } },
};

export async function exportExcel(rows: ReviewRow[]): Promise<void> {
  const workbook = buildReviewWorkbook(rows);
  await downloadWorkbook(workbook, "repreport-review-log.xlsx");
}

export function buildReviewWorkbook(rows: ReviewRow[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RepReport";
  workbook.created = new Date();
  const exportPackage = buildReviewExportPackage(rows);

  addPasteRowsSheet(workbook, exportPackage.pasteRows);
  addSummarySheet(workbook, exportPackage.summary);
  addFlagsSheet(workbook, exportPackage.flags);
  addReadMeSheet(workbook);

  return workbook;
}

export async function exportKpiExcel(row: KpiReportRow): Promise<void> {
  const workbook = buildKpiWorkbook(row);
  await downloadWorkbook(workbook, "repreport-kpi-report.xlsx");
}

export function buildKpiWorkbook(row: KpiReportRow): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RepReport";
  workbook.created = new Date();

  addKpiReportSheet(workbook, row);
  addKpiReadMeSheet(workbook);

  return workbook;
}

function addPasteRowsSheet(workbook: ExcelJS.Workbook, pasteRows: ReviewExportPackage["pasteRows"]): void {
  const sheet = workbook.addWorksheet("Paste Rows");
  sheet.columns = pasteRows.columns.map((header) => ({ header }));
  setColumnWidths(sheet, [42, 48, 18, 14, 14, 14, 36, 56]);

  pasteRows.rows.forEach((row) => sheet.addRow(row));

  styleWorksheet(sheet);
  styleHeaderRow(sheet.getRow(1));
  sheet.getRow(1).height = 34;

  pasteRows.rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 2);
    excelRow.height = 78;
    const ticketCell = excelRow.getCell(1);
    const reviewCell = excelRow.getCell(2);

    if (row[0]) {
      ticketCell.font = linkFont();
    }

    if (row[1]) {
      reviewCell.font = linkFont();
    }

    [4, 5, 6].forEach((columnIndex) => {
      excelRow.getCell(columnIndex).alignment = { horizontal: "center", wrapText: true };
    });

    [5, 6].forEach((columnIndex) => {
      const cell = excelRow.getCell(columnIndex);
      if (cell.value === "Y") {
        cell.fill = solidFill(yellowFill);
      }
    });
  });
}

function addKpiReportSheet(workbook: ExcelJS.Workbook, row: KpiReportRow): void {
  const sheet = workbook.addWorksheet("KPI Report");
  const widths = [58, 18, 28, 28, 28];

  sheet.columns = widths.map((width) => ({ width }));
  sheet.addRow(KPI_COLUMNS.map((column) => column.label));
  sheet.addRow(KPI_COLUMNS.map((column) => row[column.key]));
  setColumnWidths(sheet, widths);
  styleWorksheet(sheet);
  styleHeaderRow(sheet.getRow(1), true);
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 116;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function addKpiReadMeSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet("Read Me");
  sheet.addRows([
    ["RepReport KPI Export Notes"],
    ["The KPI Report sheet contains one spreadsheet-ready row with five KPI columns."],
    ["Top3Achievements, 3BestTickets, and each worst-ticket cell preserve line breaks where Excel supports wrapped text."],
    ["Formatting is intentionally plain: Arial 10, black text, white rows, gray grid borders, and wrapped cells."],
  ]);
  sheet.columns = [{ width: 110 }];
  setColumnWidths(sheet, [110]);
  styleWorksheet(sheet);
  sheet.getRow(1).font = boldFont();
}

function addSummarySheet(workbook: ExcelJS.Workbook, summary: ReviewExportPackage["summary"]): void {
  const sheet = workbook.addWorksheet("Summary");

  sheet.addRows(summary.rows);

  sheet.columns = [{ width: 34 }, { width: 14 }, { width: 14 }];
  setColumnWidths(sheet, [34, 14, 14]);
  styleWorksheet(sheet);
  sheet.getRow(1).font = boldFont();
  sheet.getRow(4).font = boldFont();
}

function addFlagsSheet(workbook: ExcelJS.Workbook, flags: ReviewExportPackage["flags"]): void {
  const sheet = workbook.addWorksheet("Flags");
  sheet.addRow(flags.columns);
  sheet.addRows(flags.rows);
  sheet.columns = [{ width: 12 }, { width: 24 }, { width: 18 }, { width: 14 }, { width: 55 }];
  setColumnWidths(sheet, [12, 24, 18, 14, 55]);
  styleWorksheet(sheet);
  sheet.getRow(1).font = boldFont();
}

function addReadMeSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet("Read Me");
  sheet.addRows([
    ["RepReport Export Notes"],
    ["This workbook was regenerated from pasted Notepad source and includes parsed reviews."],
    ["Default paste columns start at Ticket Link and omit Date, Rep, and Review Upgrade."],
    ["The column labeled Replacement sent is treated as Non-Amazon Review Text. Amazon review rows leave it blank."],
    ["All non-Amazon reviews are marked verified = Y. Amazon reviews are verified = Y only when the pasted text says Verified or Verified Purchase."],
    ["Contains video and Contains pictures default to N unless explicitly noted; ***PHOTO*** marks Contains pictures = Y."],
    ["Customer contact/Ticket link only includes Ticket # when an actual ticket number is present."],
    ["Customer contact/Ticket link says Review mentions name only when Robert is clearly present in the pasted review text; otherwise it says Review does not mention name."],
    ["Links are formatted blue to match the review log style; body font is Arial 10."],
    ["Cells with Y in Contains video? or Contains pictures? are highlighted yellow."],
  ]);
  sheet.columns = [{ width: 115 }];
  setColumnWidths(sheet, [115]);
  styleWorksheet(sheet);
  sheet.getRow(1).font = boldFont();
}

function styleWorksheet(sheet: ExcelJS.Worksheet): void {
  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = baseFont();
      cell.alignment = { wrapText: true };
      cell.border = border;
      cell.fill = solidFill(whiteFill);
    });
  });
}

function setColumnWidths(sheet: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

function styleHeaderRow(row: ExcelJS.Row, useHeaderFill = false): void {
  row.font = boldFont();
  row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  if (useHeaderFill) {
    row.eachCell((cell) => {
      cell.fill = solidFill(headerFill);
    });
  }
}

function baseFont(): Partial<ExcelJS.Font> {
  return { name: fontName, size: fontSize, color: { argb: "FF000000" } };
}

function boldFont(): Partial<ExcelJS.Font> {
  return { ...baseFont(), bold: true };
}

function linkFont(): Partial<ExcelJS.Font> {
  return { name: fontName, size: fontSize, color: { argb: linkBlue } };
}

function solidFill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
