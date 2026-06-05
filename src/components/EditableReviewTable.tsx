import { Fragment, useState } from "react";
import { REVIEW_COLUMNS, type ReviewColumnKey, type ReviewRow } from "../types";
import { stripInternalNoteMarkers } from "../lib/internalNoteMarkers";
import { REVIEW_TABLE_COLUMN_WIDTHS, getReviewTableColumnClassName, type ReviewTableDensity } from "../lib/reviewTableLayout";
import { formatCustomerContactSummary, formatReplacementSummary, updateReviewRowCell } from "../lib/reviewRowDisplay";
import { getReviewLinkChipLabel, getTicketLinkChipLabel, isHttpUrl } from "../lib/reviewUrlDisplay";

type EditableReviewTableProps = {
  density: ReviewTableDensity;
  rows: ReviewRow[];
  onRowsChange: (rows: ReviewRow[]) => void;
  emptyMessage?: string;
};

export function EditableReviewTable({ density, rows, onRowsChange, emptyMessage }: EditableReviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => new Set());

  function updateCell(rowIndex: number, key: ReviewColumnKey, value: string) {
    onRowsChange(rows.map((row, index) => (index === rowIndex ? updateReviewRowCell(row, key, value) : row)));
  }

  function toggleRow(rowIndex: number) {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  }

  if (rows.length === 0) {
    return <div className="emptyState">{emptyMessage ?? "No rows yet. Paste notes and parse, or add a blank row."}</div>;
  }

  return (
    <div className="tableWrap">
      <table className={`reviewTable ${density}Table`}>
        <colgroup>
          <col className="reviewCol-expand" />
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
            <th className="reviewCol-expand" scope="col">
              <span className="srOnly">Expand row</span>
            </th>
            {REVIEW_COLUMNS.map((column) => (
              <th key={column.key} className={getReviewTableColumnClassName(column.key)} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const isExpanded = expandedRows.has(rowIndex);
            const rowKey = `${row.reviewLink || row.ticketLink}-${rowIndex}`;

            return (
              <Fragment key={rowKey}>
                <tr key={rowKey} className={row.flags.length > 0 ? "flaggedRow" : ""}>
                  <td className="reviewCol-expand">
                    <button
                      type="button"
                      className="expandRowButton"
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} row ${rowIndex + 1}`}
                      onClick={() => toggleRow(rowIndex)}
                    >
                      {isExpanded ? "-" : "+"}
                    </button>
                  </td>
                  {REVIEW_COLUMNS.map((column) => (
                    <td key={column.key} className={getReviewTableColumnClassName(column.key)}>
                      <CollapsedCell row={row} columnKey={column.key} />
                    </td>
                  ))}
                </tr>
                {isExpanded ? (
                  <tr key={`${rowKey}-details`} className={row.flags.length > 0 ? "expandedReviewRow flaggedRow" : "expandedReviewRow"}>
                    <td colSpan={REVIEW_COLUMNS.length + 1}>
                      <ExpandedRowEditor row={row} rowIndex={rowIndex} onChange={updateCell} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CollapsedCell({ row, columnKey }: { row: ReviewRow; columnKey: ReviewColumnKey }) {
  if (columnKey === "ticketLink" || columnKey === "reviewLink") {
    return <UrlDisplayCell row={row} keyName={columnKey} />;
  }

  if (columnKey === "customerContactTicketLink") {
    return <span className="cellSummary" title={stripInternalNoteMarkers(row.customerContactTicketLink)}>{formatCustomerContactSummary(row)}</span>;
  }

  if (columnKey === "replacementSent") {
    return <span className="cellSummary mutedSummary" title={stripInternalNoteMarkers(row.replacementSent)}>{formatReplacementSummary(row)}</span>;
  }

  if (columnKey === "verifiedFiveStar" || columnKey === "containsVideo" || columnKey === "containsPictures") {
    return <span className={row[columnKey] === "Y" ? "yesNoBadge yes" : "yesNoBadge"}>{row[columnKey]}</span>;
  }

  return <span className="cellSummary">{row[columnKey] || "-"}</span>;
}

function UrlDisplayCell({
  row,
  keyName,
}: {
  row: ReviewRow;
  keyName: "ticketLink" | "reviewLink";
}) {
  const value = row[keyName];
  const label = keyName === "ticketLink" ? getTicketLinkChipLabel(row) : getReviewLinkChipLabel(row);
  const isValidLink = isHttpUrl(value);

  return (
    <div className="urlCell">
      {isValidLink ? (
        <a className="urlChip" href={value} target="_blank" rel="noreferrer" title={value}>
          {label}
        </a>
      ) : (
        <span className="missingLinkChip">{label}</span>
      )}
    </div>
  );
}

function ExpandedRowEditor({
  row,
  rowIndex,
  onChange,
}: {
  row: ReviewRow;
  rowIndex: number;
  onChange: (rowIndex: number, key: ReviewColumnKey, value: string) => void;
}) {
  return (
    <div className="expandedReviewEditor">
      {REVIEW_COLUMNS.map((column) => (
        <label key={column.key} className={`expandedField ${getReviewTableColumnClassName(column.key)}`}>
          <span>{column.label}</span>
          {column.key === "verifiedFiveStar" || column.key === "containsVideo" || column.key === "containsPictures" ? (
            <select
              aria-label={`${column.label} row ${rowIndex + 1}`}
              value={row[column.key]}
              onChange={(event) => onChange(rowIndex, column.key, event.target.value)}
            >
              <option value="Y">Y</option>
              <option value="N">N</option>
            </select>
          ) : (
            <textarea
              aria-label={`${column.label} row ${rowIndex + 1}`}
              value={getEditableCellValue(row, column.key)}
              onChange={(event) => onChange(rowIndex, column.key, event.target.value)}
              rows={getExpandedTextareaRows(row, column.key)}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function getEditableCellValue(row: ReviewRow, key: ReviewColumnKey): string {
  return key === "customerContactTicketLink" || key === "replacementSent" ? stripInternalNoteMarkers(row[key]) : row[key];
}

function getExpandedTextareaRows(row: ReviewRow, key: ReviewColumnKey): number {
  if (key === "customerContactTicketLink" || key === "replacementSent") {
    return Math.max(4, stripInternalNoteMarkers(row[key]).split(/\r?\n/).length + 1);
  }

  return key === "ticketLink" || key === "reviewLink" ? 2 : 1;
}
