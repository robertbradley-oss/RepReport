# RepReport

RepReport is a small private local-first utility for Robert. It is not ClaimGuard.

- Keep the app small, practical, spreadsheet-focused, and local-first.
- Use repo skills under `.agents/skills/` when relevant.
- Prioritize Review Log Mode before KPI Report Mode.
- Do not add backend, database, auth, API, or AI calls.
- Always preserve the Review Log 8-column default export:
  1. Ticket Link
  2. Link to review
  3. Model Number
  4. Verified 5 star?
  5. Contains video?
  6. Contains pictures?
  7. Customer contact/Ticket link
  8. Replacement sent
- Run `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` before handoff.
