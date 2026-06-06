import { Fragment, memo, useState } from "react";
import { REVIEW_COLUMNS, type ReviewColumnKey, type ReviewRow } from "../types";
import { stripInternalNoteMarkers } from "../lib/internalNoteMarkers";
import { REVIEW_TABLE_COLUMN_WIDTHS, getReviewTableColumnClassName, type ReviewTableDensity } from "../lib/reviewTableLayout";
import { formatCustomerContactSummary, formatReplacementSummary, updateReviewRowCell } from "../lib/reviewRowDisplay";
import { getReviewLinkChipLabel, getTicketLinkChipLabel, isHttpUrl } from "../lib/reviewUrlDisplay";
import { UiIcon } from "./UiIcon";

type EditableReviewTableProps = {
  density: ReviewTableDensity;
  rows: ReviewRow[];
  rowNumbers?: number[];
  onRowsChange: (rows: ReviewRow[]) => void;
  emptyMessage?: string;
};

function EditableReviewTableImpl({ density, rows, rowNumbers, onRowsChange, emptyMessage }: EditableReviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => new Set());

  function updateCell(rowIndex: number, key: ReviewColumnKey, value: string) {
    onRowsChange(rows.map((row, index) => (index === rowIndex ? updateReviewRowCell(row, key, value) : row)));
  }

  function toggleRow(rowNumber: number) {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  }

  if (rows.length === 0) {
    return emptyMessage ? (
      <div className="emptyState">
        <strong>{emptyMessage}</strong>
      </div>
    ) : (
      <div className="emptyState">
        <span className="emptyStateIcon">
          <UiIcon name="reviewLog" size={24} />
        </span>
        <strong>No review rows yet</strong>
        <span>Paste your Notepad notes on the left, then click Parse Reviews to turn them into spreadsheet-ready rows.</span>
        <div className="workflowChips" aria-label="Review Log workflow">
          <span className="workflowChip">Paste notes</span>
          <span className="workflowDivider">&gt;</span>
          <span className="workflowChip">Parse</span>
          <span className="workflowDivider">&gt;</span>
          <span className="workflowChip">Review rows</span>
          <span className="workflowDivider">&gt;</span>
          <span className="workflowChip">Copy / Export</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`tableWrap ${density}TableWrap`}>
      <table className={`reviewTable ${density}Table`}>
        <colgroup>
          <col className="reviewCol-rowNumber" />
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
            <th className="reviewCol-rowNumber" scope="col">
              #
            </th>
            {REVIEW_COLUMNS.map((column) => (
              <th key={column.key} className={getReviewTableColumnClassName(column.key)} scope="col">
                {getBrowserReviewColumnLabel(column.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const displayRowNumber = rowNumbers?.[rowIndex] ?? rowIndex + 1;
            const isExpanded = expandedRows.has(displayRowNumber);
            const rowKey = `${row.reviewLink || row.ticketLink || "review-row"}-${displayRowNumber}`;

            return (
              <Fragment key={rowKey}>
                <tr key={rowKey} className={row.flags.length > 0 ? "flaggedRow" : ""}>
                  <td className="reviewCol-rowNumber rowNumberCell">
                    <button
                      type="button"
                      className="rowNumberButton"
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Collapse editor for" : "Edit"} row ${displayRowNumber}`}
                      onClick={() => toggleRow(displayRowNumber)}
                    >
                      {displayRowNumber}
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
                      <ExpandedRowEditor row={row} rowNumber={displayRowNumber} rowIndex={rowIndex} onChange={updateCell} />
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
  rowNumber,
  rowIndex,
  onChange,
}: {
  row: ReviewRow;
  rowNumber: number;
  rowIndex: number;
  onChange: (rowIndex: number, key: ReviewColumnKey, value: string) => void;
}) {
  return (
    <div className="expandedReviewEditor">
      {REVIEW_COLUMNS.map((column) => (
        <label key={column.key} className={`expandedField ${getReviewTableColumnClassName(column.key)}`}>
          <span>{getBrowserReviewColumnLabel(column.key)}</span>
          {column.key === "verifiedFiveStar" || column.key === "containsVideo" || column.key === "containsPictures" ? (
            <select
              aria-label={`${column.label} row ${rowNumber}`}
              value={row[column.key]}
              onChange={(event) => onChange(rowIndex, column.key, event.target.value)}
            >
              <option value="Y">Y</option>
              <option value="N">N</option>
            </select>
          ) : (
            <textarea
              aria-label={`${column.label} row ${rowNumber}`}
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

function getBrowserReviewColumnLabel(key: ReviewColumnKey): string {
  if (key === "reviewLink") {
    return "Review";
  }

  if (key === "modelNumber") {
    return "Model";
  }

  if (key === "verifiedFiveStar") {
    return "5 star";
  }

  if (key === "containsVideo") {
    return "Video";
  }

  if (key === "containsPictures") {
    return "Photo";
  }

  if (key === "customerContactTicketLink") {
    return "Customer / Platform";
  }

  if (key === "replacementSent") {
    return "Review Text";
  }

  return "Ticket";
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

// Memoized so theme toggles (which re-render the parent) don't re-render the
// whole table. Re-renders normally when row data/props actually change.
export const EditableReviewTable = memo(EditableReviewTableImpl);
