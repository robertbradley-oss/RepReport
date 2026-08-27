const spreadsheetFormulaPrefix = /^[\p{White_Space}\p{Cc}\p{Cf}]*[=+\-@]/u;

/**
 * Keep untrusted text literal when CSV or TSV data is opened or pasted into a
 * spreadsheet. Delimiter quoting alone does not stop formula evaluation.
 */
export function neutralizeSpreadsheetFormula(value: string): string {
  return spreadsheetFormulaPrefix.test(value) ? `'${value}` : value;
}
