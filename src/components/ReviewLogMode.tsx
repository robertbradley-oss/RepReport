import { useMemo, useState } from "react";
import { BookOpen, ClipboardCopy, Download, FileDown, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { EditableReviewTable } from "./EditableReviewTable";
import { FlagsPanel } from "./FlagsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { reviewLogTemplate, sampleReviewNotes } from "../sampleData";
import { downloadCsv, buildTsv } from "../lib/exportCsv";
import { exportExcel } from "../lib/exportExcel";
import { calculateBonus, collectFlags, parseReviewNotes } from "../lib/reviewParser";
import type { ReviewRow } from "../types";

export function ReviewLogMode() {
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [parseStatus, setParseStatus] = useState("");
  const [templateStatus, setTemplateStatus] = useState("");
  const [isTemplateVisible, setIsTemplateVisible] = useState(false);

  const flags = useMemo(() => collectFlags(rows), [rows]);
  const estimatedBonus = useMemo(() => rows.reduce((sum, row) => sum + calculateBonus(row), 0), [rows]);

  function handleParse() {
    const parsedRows = parseReviewNotes(notes);
    setRows(parsedRows);
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setParseStatus(
      parsedRows.length > 0
        ? `Parsed ${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"} with ${collectFlags(parsedRows).length} flag${collectFlags(parsedRows).length === 1 ? "" : "s"}.`
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
  }

  function handleLoadSample() {
    setNotes(sampleReviewNotes);
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setParseStatus("Sample review notes loaded.");
  }

  function handleRowsChange(nextRows: ReviewRow[]) {
    setRows(nextRows);
    setCopyStatus("");
    setExportStatus("");
    setTemplateStatus("");
    setParseStatus(`${nextRows.length} editable row${nextRows.length === 1 ? "" : "s"} in the table.`);
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
    <section className="reviewLogGrid" aria-label="Review Log Mode">
      <div className="inputPanel">
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
      </div>

      <div className="resultsPanel">
        <div className="actionsBar">
          <SummaryPanel rowCount={rows.length} flagCount={flags.length} estimatedBonus={estimatedBonus} />
          <div className="buttonRow">
            <button type="button" onClick={handleCopyRows} disabled={rows.length === 0}>
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

        <EditableReviewTable rows={rows} onRowsChange={handleRowsChange} />
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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
