# RepReport

RepReport is Robert's private local-first spreadsheet utility. Preserve this product scope; do not add backend, database, auth, API, or AI calls without a requested scope change.

Use only the relevant repo skill under `.agents/skills/`: review parser, Review Log exports, or KPI reports. Both Review Log and KPI modes exist; current user priorities control the task.

The default Review Log export has exactly these columns, in order: Ticket Link; Link to review; Model Number; Verified 5 star?; Contains video?; Contains pictures?; Customer contact/Ticket link; Replacement sent. Keep this contract unless the user requests a change.

Select checks for the changed behavior: `npm.cmd run smoke:review` for parsing, `smoke:roundtrip` for verified/copy roundtrips, `smoke:kpi` for KPI, `smoke:exports` for export shapes, and `smoke:ui` for affected UI journeys. Inspect command requirements before execution. Use typecheck/build for relevant code changes and `git diff --check` for edits; documentation-only work does not require an app build.

Complete the requested work and verification. Fix failures caused by the change, rerun affected checks, and preserve unrelated work. Report pre-existing failures and untested surfaces separately. Do not repeatedly ask for approval for in-scope local work.
