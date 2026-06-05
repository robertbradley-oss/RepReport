# RepReport

RepReport is a small private local-first utility for turning messy Notepad review notes and KPI summaries into spreadsheet-ready rows.

## Current Modes

- Review Log Mode
- KPI Report Mode

## Review Log Output

Default Review Log exports use exactly these 8 columns:

1. Ticket Link
2. Link to review
3. Model Number
4. Verified 5 star?
5. Contains video?
6. Contains pictures?
7. Customer contact/Ticket link
8. Replacement sent

Date, Rep, and Review Upgrade are not included by default.

`Replacement sent` is used as the non-Amazon review text column.

## KPI Output

KPI exports use exactly these 5 columns:

1. Top3Achievements
2. 3BestTickets
3. #1 of 3WorstTickets
4. #2 of 3WorstTickets
5. #3 of 3WorstTickets

## Local Setup

```powershell
npm install
npm run dev
npm run build
```

## Fast Validation

```powershell
npm run smoke
npm run smoke:review
npm run smoke:kpi
npm run smoke:exports
npm run typecheck
npm run build
```

Use smoke/typecheck/build by default. Avoid Playwright or browser tests unless visual UI behavior specifically needs checking.

## Codex Skills

Repo-scoped skills live under `.agents/skills/`:

- `repreport-review-parser`
- `repreport-excel-export`
- `repreport-kpi-report`

## Scope Guard

No backend, no database, no auth, no API calls, and no AI calls inside the app for now.

## Handoff Style

Use the `REPREPORT HANDOFF` format from `AGENTS.md`:

```text
REPREPORT HANDOFF

Phase:
Task completed:
Files changed:
Review Log behavior changed:
KPI behavior changed:
Export behavior changed:
Parser behavior changed:
Docs changed:
Checks run:
Known limitations:
Next recommended step:
Git status:
Commit/push status:
```
