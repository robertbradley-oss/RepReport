import { useState } from "react";
import { KpiReportMode } from "./components/KpiReportMode";
import { ReviewLogMode } from "./components/ReviewLogMode";
import { UiIcon } from "./components/UiIcon";

type AppMode = "reviewLog" | "kpiReport";

const TAB_ORDER: AppMode[] = ["reviewLog", "kpiReport"];

export default function App() {
  const [activeMode, setActiveMode] = useState<AppMode>("reviewLog");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const activeModeLabel = activeMode === "reviewLog" ? "Review Log Mode" : "KPI Report Mode";

  function selectMode(mode: AppMode) {
    if (mode === activeMode) {
      return;
    }
    setDirection(TAB_ORDER.indexOf(mode) > TAB_ORDER.indexOf(activeMode) ? "forward" : "back");
    setActiveMode(mode);
  }

  return (
    <main className="appShell">
      <header className="appHeader">
        <div className="brandBlock">
          <img className="brandMark" src="/assets/repreport-mark.svg" alt="" aria-hidden="true" width={36} height={36} />
          <h1 className="brandWordmark">
            <span className="brandRep">Rep</span>
            <span className="brandReport">Report</span>
          </h1>
        </div>
        <p className="appModeLabel">{activeModeLabel}</p>
      </header>

      <nav className="modeTabs" data-active={activeMode} aria-label="RepReport modes">
        <span className="modeTabIndicator" aria-hidden="true" />
        <button
          className={`modeTab ${activeMode === "reviewLog" ? "active" : ""}`}
          type="button"
          onClick={() => selectMode("reviewLog")}
          aria-pressed={activeMode === "reviewLog"}
        >
          <UiIcon name="reviewLog" />
          Review Log
        </button>
        <button
          className={`modeTab ${activeMode === "kpiReport" ? "active" : ""}`}
          type="button"
          onClick={() => selectMode("kpiReport")}
          aria-pressed={activeMode === "kpiReport"}
        >
          <UiIcon name="kpiReport" />
          KPI Report
        </button>
      </nav>

      <div className={`modeContent ${direction === "forward" ? "slideForward" : "slideBack"}`} key={activeMode}>
        {activeMode === "reviewLog" ? <ReviewLogMode /> : <KpiReportMode />}
      </div>
    </main>
  );
}
