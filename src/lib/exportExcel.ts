import ExcelJS from "exceljs";
import { REVIEW_COLUMNS, type ReviewRow } from "../types";

const fontName = "Arial";
const fontSize = 10;
const whiteFill = "FFFFFFFF";
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
  sheet.columns = [
    { header: "Ticket Link", key: "ticketLink", width: 42 },
    { header: "Link to review", key: "reviewLink", width: 48 },
    { header: "Model Number", key: "modelNumber", width: 18 },
    { header: "Verified 5 star?", key: "verifiedFiveStar", width: 14 },
    { header: "Contains video?", key: "containsVideo", width: 14 },
    { header: "Contains pictures?", key: "containsPictures", width: 14 },
    { header: "Customer contact/Ticket link", key: "customerContactTicketLink", width: 36 },
    { header: "Replacement sent", key: "replacementSent", width: 56 },
  ];
  setColumnWidths(sheet, [42, 48, 18, 14, 14, 14, 36, 56]);

  rows.forEach((row) => {
    sheet.addRow(REVIEW_COLUMNS.map((column) => row[column.key]));
  });

  styleWorksheet(sheet);
  styleHeaderRow(sheet.getRow(1));
  sheet.getRow(1).height = 34;

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 2);
    excelRow.height = 78;
    const ticketCell = excelRow.getCell(1);
    const reviewCell = excelRow.getCell(2);

    if (row.ticketLink) {
      ticketCell.font = linkFont();
    }

    if (row.reviewLink) {
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

function addSummarySheet(workbook: ExcelJS.Workbook, rows: ReviewRow[]): void {
  const sheet = workbook.addWorksheet("Summary");
  const summaryRows = buildSummaryRows(rows);

  sheet.addRows(summaryRows);

  sheet.columns = [{ width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }];
  setColumnWidths(sheet, [34, 14, 14, 14]);
  styleWorksheet(sheet);
  sheet.getRow(1).font = boldFont();
  sheet.getRow(4).font = boldFont();
}

function addFlagsSheet(workbook: ExcelJS.Workbook, rows: ReviewRow[]): void {
  const sheet = workbook.addWorksheet("Flags");
  sheet.addRow(["Source Row", "Customer", "Model", "Platform", "Flag"]);
  rows.forEach((row, rowIndex) => {
    row.flags.forEach((flag) => {
      sheet.addRow([rowIndex + 1, row.customerName ?? "", row.modelNumber, row.platform, flag]);
    });
  });
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
    row.eachCell((cell) => {
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

function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = boldFont();
  row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function buildSummaryRows(rows: ReviewRow[]): Array<Array<string | number | null>> {
  const googleWithPhoto = rows.filter((row) => row.platform === "Google" && row.containsPictures === "Y").length;
  const google = rows.filter((row) => row.platform === "Google" && row.containsPictures !== "Y").length;
  const trustpilot = rows.filter((row) => row.platform === "Trustpilot").length;
  const verifiedAmazonWithPhoto = rows.filter(
    (row) => row.platform === "Amazon" && row.verifiedFiveStar === "Y" && row.containsPictures === "Y",
  ).length;
  const verifiedAmazon = rows.filter(
    (row) => row.platform === "Amazon" && row.verifiedFiveStar === "Y" && row.containsPictures !== "Y",
  ).length;
  const unverifiedAmazon = rows.filter((row) => row.platform === "Amazon" && row.verifiedFiveStar !== "Y").length;
  const costco = rows.filter((row) => row.platform === "Costco").length;

  const bonusRows = [
    ["Google reviews", google, 10],
    ["Google reviews with photo", googleWithPhoto, 20],
    ["Trustpilot reviews", trustpilot, 10],
    ["Verified Amazon reviews", verifiedAmazon, 25],
    ["Unverified Amazon reviews", unverifiedAmazon, 15],
    ["Verified Amazon reviews with photo", verifiedAmazonWithPhoto, 30],
    ["Costco reviews", costco, 15],
  ] as const;
  const totalBonus = bonusRows.reduce((sum, [, count, rate]) => sum + count * rate, 0);

  return [
    ["RepReport Review Log Summary", null, null, null],
    ["Total reviews parsed", rows.length, "Bonus total", totalBonus],
    [null, null, null, null],
    ["Review type", "Count", "Rate", "Total"],
    ...bonusRows.map(([label, count, rate]) => [label, count, rate, count * rate]),
  ];
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
