import { useState } from "react";
import { ClipboardCopy, Download, FileDown, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { sampleKpiNotes } from "../sampleData";
import { downloadKpiCsv } from "../lib/exportCsv";
import { exportKpiExcel } from "../lib/exportExcel";
import { buildKpiTsv, createBlankKpiRow, parseKpiNotes } from "../lib/kpiReportParser";
import { KPI_COLUMNS, type KpiColumnKey, type KpiReportRow } from "../types";

export function KpiReportMode() {
  const [notes, setNotes] = useState("");
  const [row, setRow] = useState<KpiReportRow>(createBlankKpiRow());
  const [issues, setIssues] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [formatStatus, setFormatStatus] = useState("");

  function handleFormat() {
    const result = parseKpiNotes(notes);
    setRow(result.row);
    setIssues(result.issues);
    setCopyStatus("");
    setExportStatus("");
    setFormatStatus(result.issues.length > 0 ? `Formatted KPI row with ${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}.` : "Formatted 1 KPI row.");
  }

  function handleClear() {
    setNotes("");
    setRow(createBlankKpiRow());
    setIssues([]);
    setCopyStatus("");
    setExportStatus("");
    setFormatStatus("");
  }

  function handleLoadSample() {
    setNotes(sampleKpiNotes);
    setCopyStatus("");
    setExportStatus("");
    setFormatStatus("Sample KPI notes loaded.");
  }

  function updateCell(key: KpiColumnKey, value: string) {
    setRow((currentRow) => ({ ...currentRow, [key]: value }));
    setCopyStatus("");
    setExportStatus("");
  }

  async function handleCopyRow() {
    const copied = await copyText(buildKpiTsv(row));
    setCopyStatus(copied ? "Copied 1 KPI row." : "Copy failed. Select the KPI row cells and copy manually.");
  }

  async function handleExportExcel() {
    setExportStatus("Building KPI Excel file...");
    await exportKpiExcel(row);
    setExportStatus("KPI Excel export downloaded.");
  }

  function handleDownloadCsv() {
    downloadKpiCsv(row);
    setExportStatus("KPI CSV export downloaded.");
  }

  return (
    <section className="kpiGrid" aria-label="KPI Report Mode">
      <div className="inputPanel">
        <label className="panelLabel" htmlFor="kpi-notes">
          Paste KPI Notes
        </label>
        <p className="helperText">
          Expected headings: Top 3 Achievements, 3 Best Tickets, and 3 Worst Tickets. Worst tickets work best as Ticket # plus a short summary.
        </p>
        <textarea
          id="kpi-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Paste weekly or pay-period KPI summary here..."
          spellCheck={false}
        />
        <div className="buttonRow">
          <button className="primaryButton" type="button" onClick={handleFormat}>
            <Sparkles size={16} aria-hidden="true" />
            Format KPI
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
          <div>
            <h2 className="panelTitle">KPI Row Preview</h2>
            <p className="helperText">Edit any cell before copying. Line breaks are kept inside each spreadsheet cell.</p>
          </div>
          <div className="buttonRow">
            <button type="button" onClick={handleCopyRow} disabled={isKpiRowEmpty(row)}>
              <ClipboardCopy size={16} aria-hidden="true" />
              Copy KPI Row
            </button>
            <button type="button" onClick={handleDownloadCsv} disabled={isKpiRowEmpty(row)}>
              <Download size={16} aria-hidden="true" />
              Download KPI CSV
            </button>
            <button type="button" onClick={handleExportExcel} disabled={isKpiRowEmpty(row)}>
              <FileDown size={16} aria-hidden="true" />
              Export KPI Excel
            </button>
          </div>
        </div>

        <div className="tableWrap">
          <table className="reviewTable kpiTable">
            <thead>
              <tr>
                {KPI_COLUMNS.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {KPI_COLUMNS.map((column) => (
                  <td key={column.key}>
                    <textarea
                      aria-label={column.label}
                      value={row[column.key]}
                      onChange={(event) => updateCell(column.key, event.target.value)}
                      rows={column.key === "top3Achievements" || column.key === "threeBestTickets" ? 6 : 7}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="statusLine" aria-live="polite">
          {[formatStatus, copyStatus, exportStatus].filter(Boolean).join(" ")}
        </div>

        {issues.length > 0 && (
          <div className="flagsPanel kpiIssues" aria-label="KPI issues">
            <h2>KPI issues</h2>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function isKpiRowEmpty(row: KpiReportRow): boolean {
  return Object.values(row).every((value) => value.trim() === "");
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
