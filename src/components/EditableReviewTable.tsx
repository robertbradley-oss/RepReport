import { REVIEW_COLUMNS, type ReviewColumnKey, type ReviewRow } from "../types";
import { REVIEW_TABLE_COLUMN_WIDTHS, getReviewTableColumnClassName, type ReviewTableDensity } from "../lib/reviewTableLayout";
import { getReviewLinkChipLabel, getTicketLinkChipLabel, isHttpUrl } from "../lib/reviewUrlDisplay";

type EditableReviewTableProps = {
  density: ReviewTableDensity;
  rows: ReviewRow[];
  onRowsChange: (rows: ReviewRow[]) => void;
  emptyMessage?: string;
};

export function EditableReviewTable({ density, rows, onRowsChange, emptyMessage }: EditableReviewTableProps) {
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
    return <div className="emptyState">{emptyMessage ?? "No rows yet. Paste notes and parse, or add a blank row."}</div>;
  }

  return (
    <div className="tableWrap">
      <table className={`reviewTable ${density}Table`}>
        <colgroup>
          {REVIEW_COLUMNS.map((column) => (
            <col
              key={column.key}
              className={getReviewTableColumnClassName(column.key)}
              style={{ width: `${REVIEW_TABLE_COLUMN_WIDTHS[column.key]}%` }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {REVIEW_COLUMNS.map((column) => (
              <th key={column.key} className={getReviewTableColumnClassName(column.key)} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.reviewLink || row.ticketLink}-${rowIndex}`} className={row.flags.length > 0 ? "flaggedRow" : ""}>
              {REVIEW_COLUMNS.map((column) => (
                <td key={column.key} className={getReviewTableColumnClassName(column.key)}>
                  {column.key === "ticketLink" || column.key === "reviewLink" ? (
                    <UrlCell row={row} rowIndex={rowIndex} keyName={column.key} onChange={(value) => updateCell(rowIndex, column.key, value)} />
                  ) : (
                    <textarea
                      aria-label={`${column.label} row ${rowIndex + 1}`}
                      value={row[column.key]}
                      onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                      rows={column.key === "customerContactTicketLink" || column.key === "replacementSent" ? 5 : 2}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UrlCell({
  row,
  rowIndex,
  keyName,
  onChange,
}: {
  row: ReviewRow;
  rowIndex: number;
  keyName: "ticketLink" | "reviewLink";
  onChange: (value: string) => void;
}) {
  const value = row[keyName];
  const label = keyName === "ticketLink" ? getTicketLinkChipLabel(row) : getReviewLinkChipLabel(row);
  const isValidLink = isHttpUrl(value);
  const editLabel = `${keyName === "ticketLink" ? "Ticket Link" : "Link to review"} row ${rowIndex + 1}`;

  return (
    <div className="urlCell">
      {isValidLink ? (
        <a className="urlChip" href={value} target="_blank" rel="noreferrer" title={value}>
          {label}
        </a>
      ) : (
        <span className="missingLinkChip">{label}</span>
      )}
      <details className="urlEditDetails">
        <summary>Edit</summary>
        <textarea aria-label={editLabel} value={value} onChange={(event) => onChange(event.target.value)} rows={2} />
      </details>
    </div>
  );
}

function normalizeYesNo(value: string): "Y" | "N" {
  return value.trim().toUpperCase() === "Y" ? "Y" : "N";
}
