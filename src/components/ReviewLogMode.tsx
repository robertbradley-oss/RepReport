import { useCallback, useMemo, useRef, useState } from "react";
import { EditableReviewTable } from "./EditableReviewTable";
import { FlagsPanel } from "./FlagsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { CopyResultIcon, UiIcon } from "./UiIcon";
import { reviewLogTemplate } from "../sampleData";
import { exportExcel } from "../lib/exportExcel";
import { copyText } from "../lib/clipboard";
import { copyReviewRows } from "../lib/reviewClipboard";
import { calculateBonusSummary, collectFlags, parseReviewNotes } from "../lib/reviewParser";
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
  const [isSourceNotesCollapsed, setIsSourceNotesCollapsed] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const copySuccessTimer = useRef<number | undefined>(undefined);

  const flags = useMemo(() => collectFlags(rows), [rows]);
  const bonusSummary = useMemo(() => calculateBonusSummary(rows), [rows]);
  const visibleReviewRows = useMemo(() => buildVisibleReviewRows(rows, flaggedOnly), [rows, flaggedOnly]);
  const visibleRows = useMemo(() => visibleReviewRows.map(({ row }) => row), [visibleReviewRows]);
  const visibleRowNumbers = useMemo(() => visibleReviewRows.map(({ sourceIndex }) => sourceIndex + 1), [visibleReviewRows]);
  const sourceNotesSummary = formatSourceNotesSummary(rows.length);
  const notesCharacterCount = notes.length;
  const notesLineCount = notes.split(/\r?\n/).filter((line) => line.trim().length > 0).length;

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

  const handleRowsChange = useCallback((nextRows: ReviewRow[]) => {
    setRows(nextRows);
    if (nextRows.length === 0) {
      setFlaggedOnly(false);
    }
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setParseStatus(`${nextRows.length} editable row${nextRows.length === 1 ? "" : "s"} in the table.`);
  }, []);

  const handleVisibleRowsChange = useCallback(
    (nextVisibleRows: ReviewRow[]) => {
      handleRowsChange(
        visibleReviewRows.length === rows.length ? nextVisibleRows : mergeVisibleReviewRowEdits(rows, visibleReviewRows, nextVisibleRows),
      );
    },
    [handleRowsChange, rows, visibleReviewRows],
  );

  async function handleCopyRows() {
    const copied = await copyReviewRows(rows);
    setCopyStatus(copied ? `Copied ${rows.length} row${rows.length === 1 ? "" : "s"}.` : "Copy failed. Select the table cells and copy manually.");
    if (copied) {
      setCopySuccess(true);
      window.clearTimeout(copySuccessTimer.current);
      copySuccessTimer.current = window.setTimeout(() => setCopySuccess(false), 1100);
    }
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
      <div className="reviewLeftColumn">
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
              <label className="panelLabel" htmlFor="review-notes">
                Review Notes
              </label>
            </div>
            <textarea
              id="review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Paste review notes here..."
              spellCheck={false}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
            />
            <div className="sourceNotesMeta" aria-live="polite">
              <span>{notesCharacterCount === 0 ? "Empty" : `${notesCharacterCount.toLocaleString()} chars`}</span>
              <span>{notesLineCount.toLocaleString()} note lines</span>
            </div>
            <div className="buttonRow parseActions">
              <button className="primaryButton" type="button" onClick={handleParse}>
                <UiIcon name="parse" />
                Generate Review Table
              </button>
              <button className="dangerButton" type="button" onClick={handleClear}>
                <UiIcon name="clear" />
                Clear
              </button>
            </div>
            <div className="templateHelper">
              <button
                type="button"
                className="templateSummary"
                aria-expanded={isTemplateOpen}
                aria-controls="review-template-drawer"
                onClick={() => setIsTemplateOpen((open) => !open)}
              >
                <UiIcon name="template" />
                Template tools
              </button>
              <div className={`templateDrawer${isTemplateOpen ? " open" : ""}`} id="review-template-drawer">
                <div className="templateDrawerInner">
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
                </div>
              </div>
            </div>
          </>
        )}
        </div>
        {flags.length > 0 && <FlagsPanel flags={flags} />}
      </div>

      <div className="resultsPanel reviewOutputCard">
        <div className="panelHeader resultsHeader">
          <h2 className="panelTitle">Review Log Rows</h2>
        </div>

        <div className="actionsBar reviewActionsBar">
          <SummaryPanel summary={bonusSummary} flagCount={flags.length} />
          <div className="actionStack" aria-label="Review output actions">
            <div className="buttonRow primaryActions">
              <button className="primaryButton copyPrimaryButton" type="button" onClick={handleCopyRows} disabled={rows.length === 0}>
                <CopyResultIcon copied={copySuccess} />
                Copy Rows
              </button>
              <button className="primaryButton excelPrimaryButton" type="button" onClick={handleExportExcel} disabled={rows.length === 0}>
                <UiIcon name="excel" size={18} />
                Export Excel
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
            </div>
          </div>
        </div>

        <EditableReviewTable
          density="compact"
          rows={visibleRows}
          rowNumbers={visibleRowNumbers}
          onRowsChange={handleVisibleRowsChange}
          emptyMessage={flaggedOnly ? "No rows missing models." : undefined}
        />
        {rows.length > 0 && (
          <p className="pasteFormatNote">Copy Rows includes yellow photo/video highlights when supported by the paste target. Excel export always includes highlights.</p>
        )}
        <div className="statusLine" aria-live="polite">
          {[parseStatus, copyStatus, exportStatus].filter(Boolean).join(" ")}
        </div>
      </div>
    </section>
  );
}
