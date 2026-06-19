---
name: repreport-review-parser
description: Use when changing RepReport review-note parsing, review block splitting, platform detection, verified/photo/rating rules, customer/model extraction, manual flags, or sample Notepad review cases.
---

# RepReport Review Parser

Use this skill for parser-only work in `src/lib/reviewParser.ts` and representative sample notes in `src/sampleData.ts`.

## Rules

- Preserve the default 8-column Review Log output:
  1. Ticket Link
  2. Link to review
  3. Model Number
  4. Verified 5 star?
  5. Contains video?
  6. Contains pictures?
  7. Customer contact/Ticket link
  8. Replacement sent
- Do not add Date, Rep, or Review Upgrade to default output.
- Review entries may start with `Ticket #`, a support ticket link, or directly with a review link.
- No-ticket entries must parse as valid blocks.
- If no ticket number exists, do not add a blank `Ticket #` line.
- Replacement sent is the non-Amazon review text column.
- Amazon Replacement sent must stay blank.
- Non-Amazon written review text goes into Replacement sent when available.
- Reviews receive verified `Y` only if the pasted notes clearly support verified status.
- Do not infer verified `Y` from a 5-star rating or known platform.
- Amazon reviews receive `Y` only if `Verified` or `Verified Purchase` is clearly present.
- Amazon without verified wording receives `N`.
- Contains video? defaults to `N`.
- Contains pictures? defaults to `N`.
- `***PHOTO***` means Contains pictures? = `Y`.
- Do not set photo/video to `Y` because review text merely mentions photos/videos.
- Google reviews with no explicit rating default to `5 out of 5 stars`.
- Google lower, pending, or contradictory rating details should be flagged.
- Unknown platforms should be flagged.
- Keep ambiguous cases flagged instead of guessing.

## Workflow

- Make the smallest parser change that fixes the case.
- Update or add representative sample data if it helps protect the behavior.
- Do not change export/UI/KPI behavior during parser-only tasks unless explicitly asked.
- Run `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` before handoff.
