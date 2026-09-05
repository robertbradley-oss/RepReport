---
name: repreport-kpi-report
description: "Modify RepReport KPI parsing, output columns, or spreadsheet formatting."
---

# RepReport KPI Report

Use this skill for the existing KPI Report Mode. Keep KPI work separate from Review Log Mode unless the user explicitly asks for shared changes.

## Output Columns

KPI output columns:

1. Top3Achievements
2. 3BestTickets
3. #1 of 3WorstTickets
4. #2 of 3WorstTickets
5. #3 of 3WorstTickets

## Content Rules

- Top3Achievements should be a numbered list with 3 achievements in one multiline cell.
- 3BestTickets should list the best ticket numbers stacked vertically in one multiline cell.
- Each worst-ticket column should contain one multiline summary:
  ```text
  Ticket #[ticket number]
  [Short explanation of why it was difficult / what happened / what was learned]
  ```
- Keep KPI output spreadsheet-ready.
- Do not alter Review Log parsing/export behavior while building KPI unless required and explicitly stated.

## Excel Style

- Arial 10
- Plain black text
- White rows
- Neutral gray borders
- Preserve line breaks
- Do not over-format

## Scope

- KPI Mode should remain simple: paste/create summary, preview/edit row, copy/export.
- Do not add backend, database, auth, API, or AI calls.
- Run the relevant checks documented in the repository `AGENTS.md`; verify the changed behavior and fix regressions caused by the change.
