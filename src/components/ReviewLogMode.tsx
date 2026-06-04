import { useMemo, useState } from "react";
import { ClipboardCopy, Download, FileDown, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { EditableReviewTable } from "./EditableReviewTable";
import { FlagsPanel } from "./FlagsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { sampleReviewNotes } from "../sampleData";
import { downloadCsv, buildTsv } from "../lib/exportCsv";
import { exportExcel } from "../lib/exportExcel";
import { calculateBonus, collectFlags, parseReviewNotes } from "../lib/reviewParser";
import type { ReviewRow } from "../types";

export function ReviewLogMode() {
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");

  const flags = useMemo(() => collectFlags(rows), [rows]);
  const estimatedBonus = useMemo(() => rows.reduce((sum, row) => sum + calculateBonus(row), 0), [rows]);

  function handleParse() {
    setRows(parseReviewNotes(notes));
    setCopyStatus("");
    setExportStatus("");
  }

  function handleClear() {
    setNotes("");
    setRows([]);
    setCopyStatus("");
    setExportStatus("");
  }

  function handleLoadSample() {
    setNotes(sampleReviewNotes);
    setCopyStatus("");
    setExportStatus("");
  }

  async function handleCopyRows() {
    const copied = await copyText(buildTsv(rows));
    setCopyStatus(copied ? `Copied ${rows.length} row${rows.length === 1 ? "" : "s"}.` : "Copy failed. Select the table cells and copy manually.");
  }

  async function handleExportExcel() {
    setExportStatus("Building Excel file...");
    await exportExcel(rows);
    setExportStatus("Excel export downloaded.");
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
      </div>

      <div className="resultsPanel">
        <div className="actionsBar">
          <SummaryPanel rowCount={rows.length} flagCount={flags.length} estimatedBonus={estimatedBonus} />
          <div className="buttonRow">
            <button type="button" onClick={handleCopyRows} disabled={rows.length === 0}>
              <ClipboardCopy size={16} aria-hidden="true" />
              Copy Rows
            </button>
            <button type="button" onClick={() => downloadCsv(rows)} disabled={rows.length === 0}>
              <Download size={16} aria-hidden="true" />
              Download CSV
            </button>
            <button type="button" onClick={handleExportExcel} disabled={rows.length === 0}>
              <FileDown size={16} aria-hidden="true" />
              Export Excel
            </button>
          </div>
        </div>

        <EditableReviewTable rows={rows} onRowsChange={setRows} />
        <div className="statusLine" aria-live="polite">
          {[copyStatus, exportStatus].filter(Boolean).join(" ")}
        </div>
        <FlagsPanel flags={flags} />
      </div>
    </section>
  );
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
