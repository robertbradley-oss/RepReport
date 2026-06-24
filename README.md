# RepReport

RepReport is a review parser and export helper for turning collected review notes into clean, report-ready output.

It works alongside RepStack: RepStack is the review collection layer, and RepReport is the final parser/export tool.

## Why It Exists

Review notes and KPI summaries can become repetitive to clean up by hand, especially when the same fields need to be shaped for reporting. RepReport helps turn collected notes into a more consistent structure so the final output is easier to review, copy, and export.

The goal is practical workflow cleanup: less manual formatting, fewer missed details, and a simpler path from collected review information to report-ready rows.

## Core Features

- Parse collected review notes into a structured format
- Prepare report-ready review output
- Support review and KPI workflow cleanup
- Reduce manual formatting work
- Work alongside RepStack's review collection workflow

## Tech Stack

- Vite
- TypeScript
- React
- ExcelJS
- Lucide React

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run smoke
npm run build
```

## Current Status

RepReport is an active personal/internal workflow tool. It is built to support review reporting and reduce repetitive manual formatting.

## Related Projects

- RepStack: review collection and pay-period tracking app
- RepOS: customer support workflow system prototype
- RepGuard: evidence and claim review workspace
