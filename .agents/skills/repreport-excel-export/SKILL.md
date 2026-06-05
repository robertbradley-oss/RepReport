---
name: repreport-excel-export
description: Use when changing RepReport TSV copy, CSV export, Excel export, workbook sheets, column order, hyperlink styling, multiline cells, summary, flags, or Excel formatting.
---

# RepReport Excel Export

Use this skill for spreadsheet output work in `src/lib/exportCsv.ts`, `src/lib/exportExcel.ts`, and related export wiring.

## Columns

Export must preserve only the 8 default Review Log columns:

1. Ticket Link
2. Link to review
3. Model Number
4. Verified 5 star?
5. Contains video?
6. Contains pictures?
7. Customer contact/Ticket link
8. Replacement sent

Do not include Date, Rep, or Review Upgrade in default output.

## Export Rules

- TSV copy must paste cleanly into Excel/Google Sheets.
- CSV export must use the same 8 columns.
- Excel workbook must include:
  - Paste Rows
  - Summary
  - Flags
  - Read Me
- Excel style rules:
  - Arial 10
  - White rows
  - Neutral gray borders/grid
  - Blue ticket/review links
  - Yellow highlight for `Y` cells in Contains video? and Contains pictures?
  - Preserve multiline cells where possible
- Do not change parser behavior during export-only tasks unless asked.
- Do not remove Excel export because the bundle-size warning exists. Excel export matters for MVP.

## Workflow

- Keep formatting practical and close to `RepReport Format Example.xlsx` when present.
- Verify generated workbooks directly when changing Excel output.
- Run `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` before handoff.
