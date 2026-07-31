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
import { getReviewOutputBlockers } from "../lib/exportPackage";
import {
  formatSourceNotesSummary,
  shouldCollapseSourceNotesAfterParse,
} from "../lib/reviewWorkspace";
import type { ReviewRow } from "../types";

type ReviewRowsUpdater = (rows: ReviewRow[]) => ReviewRow[];

export function ReviewLogMode() {
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [parseStatus, setParseStatus] = useState("");
  const [templateStatus, setTemplateStatus] = useState("");
  const [isSourceNotesCollapsed, setIsSourceNotesCollapsed] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [rowsEntering, setRowsEntering] = useState(false);
  const [isReadingNotes, setIsReadingNotes] = useState(false);
  const copySuccessTimer = useRef<number | undefined>(undefined);
  const rowsEnteringTimer = useRef<number | undefined>(undefined);
  const notesFieldRef = useRef<HTMLDivElement | null>(null);

  const flags = useMemo(() => collectFlags(rows), [rows]);
  const bonusSummary = useMemo(() => calculateBonusSummary(rows), [rows]);
  const rowNumbers = useMemo(() => rows.map((_, index) => index + 1), [rows]);
  const sourceNotesSummary = formatSourceNotesSummary(rows.length);
  const notesCharacterCount = notes.length;
  const notesLineCount = notes.split(/\r?\n/).filter((line) => line.trim().length > 0).length;

  function applyParsedRows(parsedRows: ReviewRow[], transferred: boolean) {
    setRowsEntering(transferred);
    window.clearTimeout(rowsEnteringTimer.current);
    if (transferred) {
      rowsEnteringTimer.current = window.setTimeout(() => setRowsEntering(false), 1800);
    }
    setRows(parsedRows);
    setIsSourceNotesCollapsed(shouldCollapseSourceNotesAfterParse(parsedRows.length));
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setParseStatus(
      parsedRows.length > 0
        ? `Parsed ${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"} with ${collectFlags(parsedRows).length} model reminder${collectFlags(parsedRows).length === 1 ? "" : "s"}.`
        : "No review rows found.",
    );
  }

  /** Generate plays a two-beat transfer: a scan bar sweeps down the pasted
   *  notes (reading them), then the parsed rows print into the table. */
  function handleParse() {
    if (isReadingNotes) {
      return;
    }
    const parsedRows = parseReviewNotes(notes);
    const animate =
      parsedRows.length > 0 &&
      notesFieldRef.current !== null &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!animate) {
      applyParsedRows(parsedRows, false);
      return;
    }

    setIsReadingNotes(true);
    // Matches the 1.8s single-pass scan in styles.css (--rr-scan).
    window.setTimeout(() => {
      setIsReadingNotes(false);
      applyParsedRows(parsedRows, true);
    }, 1800);
  }

  function handleClear() {
    setNotes("");
    setRows([]);
    setCopyStatus("");
    setExportStatus("");
    setParseStatus("");
    setTemplateStatus("");
    setIsSourceNotesCollapsed(false);
  }

  const handleRowsChange = useCallback((updateRows: ReviewRowsUpdater) => {
    setRows(updateRows);
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setParseStatus(`${rows.length} editable row${rows.length === 1 ? "" : "s"} in the table.`);
  }, [rows.length]);

  async function handleCopyRows() {
    const blockers = getReviewOutputBlockers(rows);
    if (blockers.length > 0) {
      setCopyStatus(formatBlockedOutputStatus("Copy", blockers.map((blocker) => blocker.rowNumber)));
      return;
    }

    const copied = await copyReviewRows(rows);
    setCopyStatus(copied ? `Copied ${rows.length} row${rows.length === 1 ? "" : "s"}.` : "Copy failed. Select the table cells and copy manually.");
    if (copied) {
      setCopySuccess(true);
      window.clearTimeout(copySuccessTimer.current);
      copySuccessTimer.current = window.setTimeout(() => setCopySuccess(false), 1100);
    }
  }

  async function handleExportExcel() {
    const blockers = getReviewOutputBlockers(rows);
    if (blockers.length > 0) {
      setExportStatus(formatBlockedOutputStatus("Export", blockers.map((blocker) => blocker.rowNumber)));
      return;
    }

    setExportStatus("Building Excel file...");
    await exportExcel(rows);
    setExportStatus("Excel export downloaded.");
  }

  async function handleCopyTemplate() {
    const copied = await copyText(reviewLogTemplate);
    setTemplateStatus(copied ? "Review Log template copied." : "Copy failed. Select the template text and copy manually.");
  }

  return (
    <section className={`reviewLogGrid${isSourceNotesCollapsed ? " sourceNotesCollapsed" : ""}`} aria-label="Reviews">
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
                  <div
                    className={`notesField${isReadingNotes ? " notesFieldReading" : ""}`}
                    ref={notesFieldRef}
                  >
                    <textarea
                      id="review-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder=""
                      spellCheck={false}
                      data-gramm="false"
                      data-gramm_editor="false"
                      data-enable-grammarly="false"
                    />
                    {notes.length === 0 && (
                      <div className="notesFieldHint" aria-hidden="true">
                        <UiIcon name="reviewLog" size={26} />
                        <span>Paste review notes here…</span>
                      </div>
                    )}
                    {isReadingNotes && (
                      <div className="notesScanOverlay" aria-hidden="true">
                        <span className="notesScanVeil" />
                        <span className="notesScanLine" />
                        <span className="notesScanBadge">Scanning</span>
                      </div>
                    )}
                  </div>
                  <div className="sourceNotesMeta" aria-live="polite">
                    <span>{notesCharacterCount === 0 ? "Empty" : `${notesCharacterCount.toLocaleString()} chars`}</span>
                    <span>{notesLineCount.toLocaleString()} note lines</span>
                  </div>
                  <div className="buttonRow parseActions">
                    <button
                      className="primaryButton neuButton"
                      type="button"
                      onClick={handleParse}
                      disabled={isReadingNotes}
                    >
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

          <div className={`resultsPanel reviewOutputCard${rowsEntering ? " rowsTransferIn" : ""}`}>
            <div className="panelHeader resultsHeader">
              <h2 className="panelTitle">Review Log Rows</h2>
            </div>

            <div className="actionsBar reviewActionsBar">
              <SummaryPanel summary={bonusSummary} flagCount={flags.length} />
              <div className="actionStack" aria-label="Review output actions">
                <div className="buttonRow primaryActions">
                  <button className="primaryButton copyPrimaryButton neuButton" type="button" onClick={handleCopyRows} disabled={rows.length === 0}>
                    <CopyResultIcon copied={copySuccess} />
                    Copy Rows
                  </button>
                  <button className="container-btn-file excelPrimaryButton" type="button" onClick={handleExportExcel} disabled={rows.length === 0}>
                    <UiIcon name="excel" size={18} />
                    Export To Excel
                  </button>
                </div>
              </div>
            </div>

            <EditableReviewTable
              density="compact"
              rows={rows}
              rowNumbers={rowNumbers}
              onRowsChange={handleRowsChange}
            />
            {rows.length > 0 && (
              <p className="pasteFormatNote">Copy Rows includes yellow photo/video highlights when supported by the paste target. Excel export always includes highlights.</p>
            )}
            <div className="statusLine" aria-live="polite">
              {[parseStatus, copyStatus, exportStatus].filter(Boolean).join(" ") || null}
            </div>
          </div>
    </section>
  );
}

function formatBlockedOutputStatus(action: "Copy" | "Export", rowNumbers: number[]): string {
  const uniqueRows = [...new Set(rowNumbers)];
  const rowLabel = uniqueRows.length === 1 ? "row" : "rows";
  return `${action} blocked: ${rowLabel} ${uniqueRows.join(", ")} ${uniqueRows.length === 1 ? "has" : "have"} a missing or unrecognized review link. Fix the source notes and generate the table again.`;
}
