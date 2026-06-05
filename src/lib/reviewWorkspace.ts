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

export function buildVisibleReviewRows(rows: ReviewRow[], flaggedOnly: boolean): VisibleReviewRow[] {
  return rows
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => !flaggedOnly || row.flags.length > 0);
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
