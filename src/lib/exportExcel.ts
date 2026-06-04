import ExcelJS from "exceljs";
import { calculateBonus, collectFlags } from "./reviewParser";
import { REVIEW_COLUMNS, type ReviewRow } from "../types";

const border: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD0D5DD" } },
  left: { style: "thin", color: { argb: "FFD0D5DD" } },
  bottom: { style: "thin", color: { argb: "FFD0D5DD" } },
  right: { style: "thin", color: { argb: "FFD0D5DD" } },
};

export async function exportExcel(rows: ReviewRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RepReport";
  workbook.created = new Date();

  addPasteRowsSheet(workbook, rows);
  addSummarySheet(workbook, rows);
  addFlagsSheet(workbook, rows);
  addReadMeSheet(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "repreport-review-log.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}

function addPasteRowsSheet(workbook: ExcelJS.Workbook, rows: ReviewRow[]): void {
  const sheet = workbook.addWorksheet("Paste Rows");
  sheet.columns = REVIEW_COLUMNS.map((column) => ({
    header: column.label,
    key: column.key,
    width: column.key === "customerContactTicketLink" || column.key === "replacementSent" ? 34 : 20,
  }));

  rows.forEach((row) => {
    sheet.addRow(REVIEW_COLUMNS.map((column) => row[column.key]));
  });

  styleWorksheet(sheet);
  sheet.getRow(1).font = { name: "Arial", size: 10, bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 2);
    const ticketCell = excelRow.getCell(1);
    const reviewCell = excelRow.getCell(2);

    if (row.ticketLink) {
      ticketCell.value = { text: row.ticketLink, hyperlink: row.ticketLink };
      ticketCell.font = { name: "Arial", size: 10, color: { argb: "FF0563C1" }, underline: true };
    }

    if (row.reviewLink) {
      reviewCell.value = { text: row.reviewLink, hyperlink: row.reviewLink };
      reviewCell.font = { name: "Arial", size: 10, color: { argb: "FF0563C1" }, underline: true };
    }

    [5, 6].forEach((columnIndex) => {
      const cell = excelRow.getCell(columnIndex);
      if (cell.value === "Y") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      }
    });
  });
}

function addSummarySheet(workbook: ExcelJS.Workbook, rows: ReviewRow[]): void {
  const sheet = workbook.addWorksheet("Summary");
  const totalBonus = rows.reduce((sum, row) => sum + calculateBonus(row), 0);

  sheet.addRows([
    ["Metric", "Value"],
    ["Parsed rows", rows.length],
    ["Estimated bonus total", totalBonus],
    ["Rows with flags", rows.filter((row) => row.flags.length > 0).length],
  ]);

  sheet.columns = [{ width: 24 }, { width: 18 }];
  styleWorksheet(sheet);
  sheet.getRow(1).font = { name: "Arial", size: 10, bold: true };
}

function addFlagsSheet(workbook: ExcelJS.Workbook, rows: ReviewRow[]): void {
  const sheet = workbook.addWorksheet("Flags");
  sheet.addRow(["Row", "Platform", "Flag"]);
  collectFlags(rows).forEach((flag) => {
    sheet.addRow([flag.rowNumber, flag.platform, flag.message]);
  });
  sheet.columns = [{ width: 12 }, { width: 18 }, { width: 46 }];
  styleWorksheet(sheet);
  sheet.getRow(1).font = { name: "Arial", size: 10, bold: true };
}

function addReadMeSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet("Read Me");
  sheet.addRows([
    ["RepReport Review Log Export"],
    ["Paste Rows contains only the eight default review-log columns."],
    ["Replacement sent is used for non-Amazon written review text."],
    ["Flags identify rows that may need manual review; they do not block copy or export."],
    ["Parser is rule-based and should be checked before final spreadsheet submission."],
  ]);
  sheet.columns = [{ width: 90 }];
  styleWorksheet(sheet);
  sheet.getRow(1).font = { name: "Arial", size: 10, bold: true };
}

function styleWorksheet(sheet: ExcelJS.Worksheet): void {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.font = cell.font ?? { name: "Arial", size: 10 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = border;
      cell.fill = cell.fill ?? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    });
  });
}
