import { useMemo, useState } from "react";
import { EditableReviewTable } from "./EditableReviewTable";
import { FlagsPanel } from "./FlagsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { UiIcon } from "./UiIcon";
import { reviewLogTemplate, sampleReviewNotes } from "../sampleData";
import { downloadCsv } from "../lib/exportCsv";
import { exportExcel } from "../lib/exportExcel";
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
  const [isTemplateVisible, setIsTemplateVisible] = useState(false);
  const [tableDensity, setTableDensity] = useState<ReviewTableDensity>(DEFAULT_REVIEW_TABLE_DENSITY);
  const [isSourceNotesCollapsed, setIsSourceNotesCollapsed] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const flags = useMemo(() => collectFlags(rows), [rows]);
  const bonusSummary = useMemo(() => calculateBonusSummary(rows), [rows]);
  const visibleReviewRows = useMemo(() => buildVisibleReviewRows(rows, flaggedOnly), [rows, flaggedOnly]);
  const visibleRows = useMemo(() => visibleReviewRows.map(({ row }) => row), [visibleReviewRows]);
  const sourceNotesSummary = formatSourceNotesSummary(rows.length);

  function handleParse() {
    const parsedRows = parseReviewNotes(notes);
    setRows(parsedRows);
    setIsSourceNotesCollapsed(shouldCollapseSourceNotesAfterParse(parsedRows.length));
    setFlaggedOnly(false);
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
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
    setIsSourceNotesCollapsed(false);
    setFlaggedOnly(false);
  }

  function handleLoadSample() {
    setNotes(sampleReviewNotes);
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setParseStatus("Sample review notes loaded.");
    setIsSourceNotesCollapsed(false);
    setFlaggedOnly(false);
  }

  function handleRowsChange(nextRows: ReviewRow[]) {
    setRows(nextRows);
    if (nextRows.length === 0) {
      setFlaggedOnly(false);
    }
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setParseStatus(`${nextRows.length} editable row${nextRows.length === 1 ? "" : "s"} in the table.`);
  }

  function handleVisibleRowsChange(nextVisibleRows: ReviewRow[]) {
    handleRowsChange(flaggedOnly ? mergeVisibleReviewRowEdits(rows, visibleReviewRows, nextVisibleRows) : nextVisibleRows);
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
                <span className="workflowStep">Paste notes</span>
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
            <div className="buttonRow">
              <button className="primaryButton" type="button" onClick={handleParse}>
                <UiIcon name="parse" />
                Parse Reviews
              </button>
              <button className="dangerButton" type="button" onClick={handleClear}>
                <UiIcon name="clear" />
                Clear
              </button>
              <button className="secondaryButton" type="button" onClick={handleLoadSample}>
                <UiIcon name="loadSample" />
                Load Sample
              </button>
            </div>
            <div className="templateHelper">
              <div className="buttonRow templateActions">
                <button className="secondaryButton" type="button" onClick={() => setIsTemplateVisible((visible) => !visible)}>
                  <UiIcon name="template" />
                  {isTemplateVisible ? "Hide Template" : "Show Template"}
                </button>
                <button className="secondaryButton" type="button" onClick={handleCopyTemplate}>
                  <UiIcon name="copy" />
                  Copy Template
                </button>
              </div>
              {isTemplateVisible && <pre className="templateBlock">{reviewLogTemplate}</pre>}
              <div className="templateStatus" aria-live="polite">
                {templateStatus}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="resultsPanel reviewOutputCard">
        <div className="panelHeader resultsHeader">
          <div>
            <span className="workflowStep">Review rows</span>
            <h2 className="panelTitle">Review Log Rows</h2>
          </div>
        </div>

        <div className="actionsBar reviewActionsBar">
          <SummaryPanel summary={bonusSummary} flagCount={flags.length} />
          <div className="actionStack" aria-label="Review output actions">
            <div className="buttonRow primaryActions">
              <button className="primaryButton" type="button" onClick={handleCopyRows} disabled={rows.length === 0}>
                <UiIcon name="copy" />
                Copy Rows
              </button>
              <button className="primaryButton" type="button" onClick={handleExportExcel} disabled={rows.length === 0}>
                <UiIcon name="excel" />
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
              <button className="dangerButton" type="button" onClick={handleDeleteLastRow} disabled={rows.length === 0}>
                <UiIcon name="clear" />
                Delete Last Row
              </button>
            </div>
          </div>
        </div>

        <div className="tableToolbar" aria-label="Review table display options">
          <button
            className={flaggedOnly ? "filterButton active" : "filterButton"}
            type="button"
            aria-pressed={flaggedOnly}
            onClick={() => setFlaggedOnly((enabled) => !enabled)}
          >
            <UiIcon name="filter" />
            Show missing models ({flags.length})
          </button>
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
          onRowsChange={handleVisibleRowsChange}
          emptyMessage={flaggedOnly ? "No rows missing models." : undefined}
        />
        <p className="pasteFormatNote">Copy Rows includes yellow photo/video highlights when supported by the paste target. Excel export always includes highlights.</p>
        <div className="statusLine" aria-live="polite">
          {[parseStatus, copyStatus, exportStatus].filter(Boolean).join(" ")}
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
