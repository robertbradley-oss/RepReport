import { REVIEW_COLUMNS, type ReviewColumnKey, type ReviewRow } from "../types";

type EditableReviewTableProps = {
  rows: ReviewRow[];
  onRowsChange: (rows: ReviewRow[]) => void;
};

export function EditableReviewTable({ rows, onRowsChange }: EditableReviewTableProps) {
  function updateCell(rowIndex: number, key: ReviewColumnKey, value: string) {
    onRowsChange(
      rows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [key]: key === "verifiedFiveStar" || key === "containsVideo" || key === "containsPictures" ? normalizeYesNo(value) : value,
            }
          : row,
      ),
    );
  }

  if (rows.length === 0) {
    return <div className="emptyState">No parsed rows yet.</div>;
  }

  return (
    <div className="tableWrap">
      <table className="reviewTable">
        <thead>
          <tr>
            {REVIEW_COLUMNS.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.reviewLink}-${rowIndex}`}>
              {REVIEW_COLUMNS.map((column) => (
                <td key={column.key}>
                  <textarea
                    aria-label={`${column.label} row ${rowIndex + 1}`}
                    value={row[column.key]}
                    onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                    rows={column.key === "customerContactTicketLink" || column.key === "replacementSent" ? 5 : 2}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function normalizeYesNo(value: string): "Y" | "N" {
  return value.trim().toUpperCase() === "Y" ? "Y" : "N";
}
