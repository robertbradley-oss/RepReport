import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ClipboardCopy, Download, FileDown, Filter, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { EditableReviewTable } from "./EditableReviewTable";
import { FlagsPanel } from "./FlagsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { reviewLogTemplate, sampleReviewNotes } from "../sampleData";
import { downloadCsv, buildTsv } from "../lib/exportCsv";
import { exportExcel } from "../lib/exportExcel";
import { copyText } from "../lib/clipboard";
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
    const copied = await copyText(buildTsv(rows));
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
      <div className="inputPanel">
        {isSourceNotesCollapsed ? (
          <div className="sourceNotesBar">
            <strong>{sourceNotesSummary}</strong>
            <div className="sourceNotesActions">
              <button type="button" onClick={() => setIsSourceNotesCollapsed(false)}>
                <ChevronDown size={16} aria-hidden="true" />
                Expand
              </button>
              <button type="button" onClick={handleClear}>
                <Trash2 size={16} aria-hidden="true" />
                Clear
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="panelLabel" htmlFor="review-notes">
              Paste Notepad Review Notes
            </label>
            <textarea
              id="review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Paste ticket and review notes here..."
              spellCheck={false}
            />
            <div className="buttonRow">
              <button className="primaryButton" type="button" onClick={handleParse}>
                <Sparkles size={16} aria-hidden="true" />
                Parse Reviews
              </button>
              <button type="button" onClick={handleClear}>
                <Trash2 size={16} aria-hidden="true" />
                Clear
              </button>
              <button type="button" onClick={handleLoadSample}>
                <RotateCcw size={16} aria-hidden="true" />
                Load Sample
              </button>
            </div>
            <div className="templateHelper">
              <div className="buttonRow templateActions">
                <button type="button" onClick={() => setIsTemplateVisible((visible) => !visible)}>
                  <BookOpen size={16} aria-hidden="true" />
                  {isTemplateVisible ? "Hide Template" : "Show Template"}
                </button>
                <button type="button" onClick={handleCopyTemplate}>
                  <ClipboardCopy size={16} aria-hidden="true" />
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

      <div className="resultsPanel">
        <div className="actionsBar">
          <SummaryPanel summary={bonusSummary} flagCount={flags.length} />
          <div className="buttonRow">
            <button className="primaryButton" type="button" onClick={handleCopyRows} disabled={rows.length === 0}>
              <ClipboardCopy size={16} aria-hidden="true" />
              Copy Rows
            </button>
            <button type="button" onClick={handleDownloadCsv} disabled={rows.length === 0}>
              <Download size={16} aria-hidden="true" />
              Download CSV
            </button>
            <button type="button" onClick={handleExportExcel} disabled={rows.length === 0}>
              <FileDown size={16} aria-hidden="true" />
              Export Excel
            </button>
            <button type="button" onClick={handleAddBlankRow}>
              <Plus size={16} aria-hidden="true" />
              Add Blank Row
            </button>
            <button type="button" onClick={handleDeleteLastRow} disabled={rows.length === 0}>
              <Trash2 size={16} aria-hidden="true" />
              Delete Last Row
            </button>
          </div>
        </div>

        <div className="tableToolbar" aria-label="Review table display options">
          <button
            className={flaggedOnly ? "filterButton active" : "filterButton"}
            type="button"
            aria-pressed={flaggedOnly}
            onClick={() => setFlaggedOnly((enabled) => !enabled)}
          >
            <Filter size={16} aria-hidden="true" />
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
        <p className="pasteFormatNote">Copy Rows pastes text only. Yellow photo/video highlights are included in Excel export.</p>
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
