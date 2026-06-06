import { useMemo, useState } from "react";
import { EditableReviewTable } from "./EditableReviewTable";
import { FlagsPanel } from "./FlagsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { UiIcon } from "./UiIcon";
import { reviewLogTemplate, sampleReviewNotes } from "../sampleData";
import { downloadCsv } from "../lib/exportCsv";
import { exportExcel } from "../lib/exportExcel";
import { formatFlagsForClipboard } from "../lib/flagClipboard";
import { copyText } from "../lib/clipboard";
import { copyReviewRows } from "../lib/reviewClipboard";
import { calculateBonusSummary, collectFlags, parseReviewNotes } from "../lib/reviewParser";
import { DEFAULT_REVIEW_TABLE_DENSITY, REVIEW_TABLE_DENSITIES, type ReviewTableDensity } from "../lib/reviewTableLayout";
import {
  buildVisibleReviewRows,
  formatSourceNotesSummary,
  mergeVisibleReviewRowEdits,
  shouldCollapseSourceNotesAfterParse,
} from "../lib/reviewWorkspace";
import type { ReviewRow } from "../types";

export function ReviewLogMode() {
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [parseStatus, setParseStatus] = useState("");
  const [templateStatus, setTemplateStatus] = useState("");
  const [tableDensity, setTableDensity] = useState<ReviewTableDensity>(DEFAULT_REVIEW_TABLE_DENSITY);
  const [isSourceNotesCollapsed, setIsSourceNotesCollapsed] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [rowSearch, setRowSearch] = useState("");
  const [flagCopyStatus, setFlagCopyStatus] = useState("");

  const flags = useMemo(() => collectFlags(rows), [rows]);
  const bonusSummary = useMemo(() => calculateBonusSummary(rows), [rows]);
  const visibleReviewRows = useMemo(() => buildVisibleReviewRows(rows, flaggedOnly, rowSearch), [rows, flaggedOnly, rowSearch]);
  const visibleRows = useMemo(() => visibleReviewRows.map(({ row }) => row), [visibleReviewRows]);
  const visibleRowNumbers = useMemo(() => visibleReviewRows.map(({ sourceIndex }) => sourceIndex + 1), [visibleReviewRows]);
  const sourceNotesSummary = formatSourceNotesSummary(rows.length);
  const notesCharacterCount = notes.length;
  const notesLineCount = notes.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const visibleRowsLabel =
    rows.length === visibleRows.length
      ? `${rows.length} row${rows.length === 1 ? "" : "s"}`
      : `${visibleRows.length} of ${rows.length} rows`;

  function handleParse() {
    const parsedRows = parseReviewNotes(notes);
    setRows(parsedRows);
    setIsSourceNotesCollapsed(shouldCollapseSourceNotesAfterParse(parsedRows.length));
    setFlaggedOnly(false);
    setRowSearch("");
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setFlagCopyStatus("");
    setParseStatus(
      parsedRows.length > 0
        ? `Parsed ${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"} with ${collectFlags(parsedRows).length} model reminder${collectFlags(parsedRows).length === 1 ? "" : "s"}.`
        : "No review rows found.",
    );
  }

  function handleClear() {
    setNotes("");
    setRows([]);
    setCopyStatus("");
    setExportStatus("");
    setParseStatus("");
    setTemplateStatus("");
    setFlagCopyStatus("");
    setIsSourceNotesCollapsed(false);
    setFlaggedOnly(false);
    setRowSearch("");
  }

  function handleLoadSample() {
    setNotes(sampleReviewNotes);
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setFlagCopyStatus("");
    setParseStatus("Sample review notes loaded.");
    setIsSourceNotesCollapsed(false);
    setFlaggedOnly(false);
    setRowSearch("");
  }

  function handleRowsChange(nextRows: ReviewRow[]) {
    setRows(nextRows);
    if (nextRows.length === 0) {
      setFlaggedOnly(false);
      setRowSearch("");
    }
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setFlagCopyStatus("");
    setParseStatus(`${nextRows.length} editable row${nextRows.length === 1 ? "" : "s"} in the table.`);
  }

  function handleVisibleRowsChange(nextVisibleRows: ReviewRow[]) {
    handleRowsChange(visibleReviewRows.length === rows.length ? nextVisibleRows : mergeVisibleReviewRowEdits(rows, visibleReviewRows, nextVisibleRows));
  }

  function handleAddBlankRow() {
    handleRowsChange([...rows, createBlankReviewRow()]);
  }

  function handleDeleteLastRow() {
    handleRowsChange(rows.slice(0, -1));
  }

  async function handleCopyRows() {
    const copied = await copyReviewRows(rows);
    setCopyStatus(copied ? `Copied ${rows.length} row${rows.length === 1 ? "" : "s"}.` : "Copy failed. Select the table cells and copy manually.");
  }

  function handleDownloadCsv() {
    downloadCsv(rows);
    setExportStatus("Review CSV downloaded.");
  }

  async function handleExportExcel() {
    setExportStatus("Building Excel file...");
    await exportExcel(rows);
    setExportStatus("Excel export downloaded.");
  }

  async function handleCopyTemplate() {
    const copied = await copyText(reviewLogTemplate);
    setTemplateStatus(copied ? "Review Log template copied." : "Copy failed. Select the template text and copy manually.");
  }

  async function handleCopyModelReminders() {
    const copied = await copyText(formatFlagsForClipboard(flags));
    setFlagCopyStatus(copied ? "Model reminders copied." : "Copy failed. Select the model reminders and copy manually.");
  }

  return (
    <section className={`reviewLogGrid${isSourceNotesCollapsed ? " sourceNotesCollapsed" : ""}`} aria-label="Review Log Mode">
      <div className="inputPanel reviewInputCard">
        {isSourceNotesCollapsed ? (
          <div className="sourceNotesBar">
            <strong>{sourceNotesSummary}</strong>
            <div className="sourceNotesActions">
              <button type="button" onClick={() => setIsSourceNotesCollapsed(false)}>
                <UiIcon name="collapseInput" />
                Expand
              </button>
              <button className="dangerButton" type="button" onClick={handleClear}>
                <UiIcon name="clear" />
                Clear
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="panelHeader">
              <div>
                <span className="workflowStep">Step 1 · Paste Notes</span>
                <label className="panelLabel" htmlFor="review-notes">
                  Notepad Review Notes
                </label>
              </div>
            </div>
            <textarea
              id="review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Paste ticket and review notes here..."
              spellCheck={false}
            />
            <div className="sourceNotesMeta" aria-live="polite">
              <span>{notesCharacterCount === 0 ? "Empty" : `${notesCharacterCount.toLocaleString()} chars`}</span>
              <span>{notesLineCount.toLocaleString()} note lines</span>
            </div>
            <div className="buttonRow parseActions">
              <button className="primaryButton" type="button" onClick={handleParse}>
                <UiIcon name="parse" />
                Parse Reviews
              </button>
              <button className="secondaryButton" type="button" onClick={handleLoadSample}>
                <UiIcon name="loadSample" />
                Load Sample
              </button>
              <button className="dangerButton" type="button" onClick={handleClear}>
                <UiIcon name="clear" />
                Clear
              </button>
            </div>
            <details className="templateHelper">
              <summary>
                <UiIcon name="template" />
                Template tools
              </summary>
              <div className="buttonRow templateActions">
                <button className="secondaryButton" type="button" onClick={handleCopyTemplate}>
                  <UiIcon name="copy" />
                  Copy Template
                </button>
              </div>
              <pre className="templateBlock">{reviewLogTemplate}</pre>
              <div className="templateStatus" aria-live="polite">
                {templateStatus}
              </div>
            </details>
          </>
        )}
      </div>

      <div className="resultsPanel reviewOutputCard">
        <div className="panelHeader resultsHeader">
          <div>
            <span className="workflowStep">Step 2 · Review Rows</span>
            <h2 className="panelTitle">Review Log Rows</h2>
          </div>
          <span className="rowCountBadge" aria-live="polite">
            {visibleRowsLabel}
          </span>
        </div>

        <div className="actionsBar reviewActionsBar">
          <SummaryPanel summary={bonusSummary} flagCount={flags.length} />
          <div className="actionStack" aria-label="Review output actions">
            <div className="buttonRow primaryActions">
              <button className="primaryButton copyPrimaryButton" type="button" onClick={handleCopyRows} disabled={rows.length === 0}>
                <UiIcon name="copy" />
                Copy Rows
              </button>
              <button className="primaryButton excelPrimaryButton" type="button" onClick={handleExportExcel} disabled={rows.length === 0}>
                <img className="excelButtonIcon" src="/assets/icons8-excel-50.png" alt="" aria-hidden="true" />
                Export Excel
              </button>
            </div>
            <div className="buttonRow secondaryActions">
              <button className="secondaryButton" type="button" onClick={handleDownloadCsv} disabled={rows.length === 0}>
                <UiIcon name="download" />
                Download CSV
              </button>
              <button className="secondaryButton" type="button" onClick={handleAddBlankRow}>
                <UiIcon name="add" />
                Add Blank Row
              </button>
              <button
                className={flaggedOnly ? "filterButton active" : "filterButton"}
                type="button"
                aria-pressed={flaggedOnly}
                onClick={() => setFlaggedOnly((enabled) => !enabled)}
              >
                <UiIcon name="filter" />
                Show Missing Models ({flags.length})
              </button>
              <button className="secondaryButton" type="button" onClick={handleCopyModelReminders}>
                <UiIcon name="copy" />
                Copy Model Reminders
              </button>
            </div>
            <div className="buttonRow destructiveActions">
              <button className="dangerButton" type="button" onClick={handleDeleteLastRow} disabled={rows.length === 0}>
                <UiIcon name="clear" />
                Delete Last Row
              </button>
            </div>
          </div>
        </div>

        <div className="tableToolbar" aria-label="Review table display options">
          <label className="rowSearchField" htmlFor="review-row-search">
            <UiIcon name="search" />
            <span className="srOnly">Filter visible rows</span>
            <input
              id="review-row-search"
              value={rowSearch}
              onChange={(event) => setRowSearch(event.target.value)}
              placeholder="Filter rows..."
              disabled={rows.length === 0}
            />
          </label>
          <div className="densityToggle" role="group" aria-label="Table density">
            {REVIEW_TABLE_DENSITIES.map((density) => (
              <button
                key={density}
                className={tableDensity === density ? "active" : ""}
                type="button"
                aria-pressed={tableDensity === density}
                onClick={() => setTableDensity(density)}
              >
                {density === "compact" ? "Compact" : "Comfortable"}
              </button>
            ))}
          </div>
        </div>
        <EditableReviewTable
          density={tableDensity}
          rows={visibleRows}
          rowNumbers={visibleRowNumbers}
          onRowsChange={handleVisibleRowsChange}
          emptyMessage={rowSearch.trim() ? "No rows match the current filter." : flaggedOnly ? "No rows missing models." : undefined}
        />
        <p className="pasteFormatNote">Copy Rows includes yellow photo/video highlights when supported by the paste target. Excel export always includes highlights.</p>
        <div className="statusLine" aria-live="polite">
          {[parseStatus, copyStatus, exportStatus, flagCopyStatus].filter(Boolean).join(" ")}
        </div>
        <FlagsPanel flags={flags} />
      </div>
    </section>
  );
}

function createBlankReviewRow(): ReviewRow {
  return {
    ticketLink: "",
    reviewLink: "",
    modelNumber: "",
    verifiedFiveStar: "N",
    containsVideo: "N",
    containsPictures: "N",
    customerContactTicketLink: "",
    replacementSent: "",
    platform: "",
    flags: [],
  };
}
