---
name: repreport-excel-export
description: "Modify RepReport Review Log TSV, CSV, or Excel export behavior."
---

# RepReport Excel Export

Use this skill for spreadsheet output work in `src/lib/exportCsv.ts`, `src/lib/exportExcel.ts`, and related export wiring.

## Columns

Preserve the default Review Log column contract in the repository `AGENTS.md`. This skill's eight-column rules do not apply to KPI output.

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
- Run the relevant checks documented in the repository `AGENTS.md`; verify the changed behavior and fix regressions caused by the change.
