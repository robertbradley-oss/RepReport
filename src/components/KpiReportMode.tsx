import { useRef, useState } from "react";
import { CopyResultIcon, UiIcon } from "./UiIcon";
import { exportKpiExcel } from "../lib/exportExcel";
import { buildKpiTsv, createBlankKpiRow, parseKpiNotes } from "../lib/kpiReportParser";
import { KPI_COLUMNS, type KpiColumnKey, type KpiReportRow } from "../types";

export function KpiReportMode() {
  const [notes, setNotes] = useState("");
  const [row, setRow] = useState<KpiReportRow>(createBlankKpiRow());
  const [copySuccess, setCopySuccess] = useState(false);
  const copySuccessTimer = useRef<number | undefined>(undefined);

  function handleFormat() {
    const result = parseKpiNotes(notes);
    setRow(result.row);
  }

  function handleClear() {
    setNotes("");
    setRow(createBlankKpiRow());
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

  return (
    <section className="kpiGrid" aria-label="KPI Report Mode">
      <div className="inputPanel">
        <label className="panelLabel" htmlFor="kpi-notes">
          KPI Summary
        </label>
        <textarea
          id="kpi-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Paste weekly KPI summary here..."
          spellCheck={false}
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
        />
        <div className="buttonRow">
          <button className="primaryButton" type="button" onClick={handleFormat}>
            <UiIcon name="parse" />
            Format KPI
          </button>
          <button className="dangerButton" type="button" onClick={handleClear}>
            <UiIcon name="clear" />
            Clear
          </button>
        </div>
      </div>

      <div className="resultsPanel">
        <div className="actionsBar">
          <div>
            <h2 className="panelTitle">KPI Row Preview</h2>
          </div>
          <div className="buttonRow">
            <button className="primaryButton copyPrimaryButton" type="button" onClick={handleCopyRow} disabled={isKpiRowEmpty(row)}>
              <CopyResultIcon copied={copySuccess} />
              Copy KPI Row
            </button>
            <button className="primaryButton excelPrimaryButton" type="button" onClick={handleExportExcel} disabled={isKpiRowEmpty(row)}>
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
