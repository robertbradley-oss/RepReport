import type { ReviewRow } from "../types";

export type VisibleReviewRow = {
  row: ReviewRow;
  sourceIndex: number;
};

export function shouldCollapseSourceNotesAfterParse(parsedRowCount: number): boolean {
  return parsedRowCount > 0;
}

export function formatSourceNotesSummary(parsedRowCount: number): string {
  return `Source notes - ${parsedRowCount} parsed`;
}

export function buildVisibleReviewRows(rows: ReviewRow[], flaggedOnly: boolean, searchQuery = ""): VisibleReviewRow[] {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  return rows
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => !flaggedOnly || row.flags.length > 0)
    .filter(({ row }) => normalizedSearchQuery.length === 0 || matchesReviewRowSearch(row, normalizedSearchQuery));
}

export function mergeVisibleReviewRowEdits(
  allRows: ReviewRow[],
  visibleRows: VisibleReviewRow[],
  editedVisibleRows: ReviewRow[],
): ReviewRow[] {
  const editsBySourceIndex = new Map<number, ReviewRow>();

  visibleRows.forEach(({ sourceIndex }, visibleIndex) => {
    const editedRow = editedVisibleRows[visibleIndex];
    if (editedRow) {
      editsBySourceIndex.set(sourceIndex, editedRow);
    }
  });

  return allRows.map((row, sourceIndex) => editsBySourceIndex.get(sourceIndex) ?? row);
}

function matchesReviewRowSearch(row: ReviewRow, normalizedSearchQuery: string): boolean {
  return [
    row.ticketLink,
    row.ticketNumber,
    row.reviewLink,
    row.modelNumber,
    row.customerContactTicketLink,
    row.platform,
    row.replacementSent,
  ].some((value) => value?.toLowerCase().includes(normalizedSearchQuery));
}
