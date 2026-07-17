import { useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CopyResultIcon, UiIcon } from "./UiIcon";
import { exportKpiExcel } from "../lib/exportExcel";
import { buildKpiTsv, createBlankKpiRow, parseKpiNotes } from "../lib/kpiReportParser";
import { kpiFormatGuide } from "../sampleData";
import { KPI_COLUMNS, type KpiColumnKey, type KpiReportRow } from "../types";

type KpiReportModeProps = {
  onReturnToReviewLog: () => void;
};

export function KpiReportMode({ onReturnToReviewLog }: KpiReportModeProps) {
  const [notes, setNotes] = useState("");
  const [row, setRow] = useState<KpiReportRow>(createBlankKpiRow());
  const [copySuccess, setCopySuccess] = useState(false);
  const [isReadingNotes, setIsReadingNotes] = useState(false);
  const [rowEntering, setRowEntering] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [templateStatus, setTemplateStatus] = useState("");
  const copySuccessTimer = useRef<number | undefined>(undefined);
  const rowEnteringTimer = useRef<number | undefined>(undefined);

  function applyFormattedRow(formattedRow: KpiReportRow, formattedIssues: string[], transferred: boolean) {
    setRowEntering(transferred);
    window.clearTimeout(rowEnteringTimer.current);
    if (transferred) {
      rowEnteringTimer.current = window.setTimeout(() => setRowEntering(false), 1600);
    }
    setRow(formattedRow);
    setIssues(formattedIssues);
  }

  /** Same two-beat transfer as the Review Log: scan the notes, then the KPI
   *  row prints with its cells filling left to right. */
  function handleFormat() {
    if (isReadingNotes) {
      return;
    }
    const result = parseKpiNotes(notes);
    const animate =
      !isKpiRowEmpty(result.row) &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!animate) {
      applyFormattedRow(result.row, result.issues, false);
      return;
    }

    setIsReadingNotes(true);
    // Matches the 1.8s single-pass scan in styles.css (--rr-scan).
    window.setTimeout(() => {
      setIsReadingNotes(false);
      applyFormattedRow(result.row, result.issues, true);
    }, 1800);
  }

  function handleClear() {
    setNotes("");
    setRow(createBlankKpiRow());
    setIssues([]);
    setTemplateStatus("");
  }

  function updateCell(key: KpiColumnKey, value: string) {
    setRow((currentRow) => ({ ...currentRow, [key]: value }));
  }

  async function handleCopyRow() {
    const copied = await copyText(buildKpiTsv(row));
    if (copied) {
      setCopySuccess(true);
      window.clearTimeout(copySuccessTimer.current);
      copySuccessTimer.current = window.setTimeout(() => setCopySuccess(false), 1100);
    }
  }

  async function handleExportExcel() {
    await exportKpiExcel(row);
  }

  async function handleCopyTemplate() {
    const copied = await copyText(kpiFormatGuide);
    setTemplateStatus(copied ? "KPI template copied." : "Copy failed. Select the template text and copy manually.");
  }

  return (
    <section className="kpiGrid" aria-label="KPI Report Mode">
      <div className="inputPanel">
        <div className="kpiModeUtility">
          <button
            className="iconButton kpiReturnButton"
            type="button"
            onClick={onReturnToReviewLog}
            aria-label="Return to Review Log"
            title="Return to Review Log"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" focusable="false" />
          </button>
        </div>
        <label className="panelLabel" htmlFor="kpi-notes">
          KPI Notes
        </label>
        <div className={`notesField${isReadingNotes ? " notesFieldReading" : ""}`}>
          <textarea
            id="kpi-notes"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setIssues([]);
            }}
            placeholder=""
            spellCheck={false}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
          />
          {notes.length === 0 && (
            <div className="notesFieldHint" aria-hidden="true">
              <UiIcon name="kpiReport" size={26} />
              <span>Paste weekly KPI summary here…</span>
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
        <div className="buttonRow">
          <button className="primaryButton" type="button" onClick={handleFormat} disabled={isReadingNotes}>
            <UiIcon name="parse" />
            Format KPI
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
            aria-controls="kpi-template-drawer"
            onClick={() => setIsTemplateOpen((open) => !open)}
          >
            <UiIcon name="template" />
            KPI format guide
          </button>
          <div className={`templateDrawer${isTemplateOpen ? " open" : ""}`} id="kpi-template-drawer">
            <div className="templateDrawerInner">
              <div className="buttonRow templateActions">
                <button className="secondaryButton" type="button" onClick={handleCopyTemplate}>
                  <UiIcon name="copy" />
                  Copy Template
                </button>
              </div>
              <pre className="templateBlock">{kpiFormatGuide}</pre>
              <div className="templateStatus" aria-live="polite">
                {templateStatus}
              </div>
            </div>
          </div>
        </div>
        {issues.length > 0 && (
          <section className="kpiIssues" aria-live="polite">
            <h2>Check KPI format</h2>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className={`resultsPanel${rowEntering ? " kpiTransferIn" : ""}`}>
        <div className="actionsBar">
          <div>
            <h2 className="panelTitle">KPI Row Preview</h2>
          </div>
          <div className="buttonRow">
            <button className="primaryButton copyPrimaryButton neuButton" type="button" onClick={handleCopyRow} disabled={isKpiRowEmpty(row)}>
              <CopyResultIcon copied={copySuccess} />
              Copy KPI Row
            </button>
            <button className="container-btn-file excelPrimaryButton" type="button" onClick={handleExportExcel} disabled={isKpiRowEmpty(row)}>
              <UiIcon name="excel" />
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
