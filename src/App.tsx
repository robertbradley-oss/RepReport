import { useState } from "react";
import { KpiReportMode } from "./components/KpiReportMode";
import { ReviewLogMode } from "./components/ReviewLogMode";
import { UiIcon } from "./components/UiIcon";

type AppMode = "reviewLog" | "kpiReport";

export default function App() {
  const [activeMode, setActiveMode] = useState<AppMode>("reviewLog");
  const activeModeLabel = activeMode === "reviewLog" ? "Review Log Mode" : "KPI Report Mode";

  return (
    <main className="appShell">
      <header className="appHeader">
        <div className="brandBlock">
          <img className="brandLogo" src="/assets/repreport-logo.png" alt="RepReport" />
          <div className="brandText">
            <h1 className="srOnly">RepReport</h1>
            <p>{activeModeLabel}</p>
          </div>
        </div>
      </header>

      <nav className="modeTabs" aria-label="RepReport modes">
        <button
          className={`modeTab ${activeMode === "reviewLog" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveMode("reviewLog")}
          aria-pressed={activeMode === "reviewLog"}
        >
          <UiIcon name="reviewLog" />
          Review Log
        </button>
        <button
          className={`modeTab ${activeMode === "kpiReport" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveMode("kpiReport")}
          aria-pressed={activeMode === "kpiReport"}
        >
          <UiIcon name="kpiReport" />
          KPI Report
        </button>
      </nav>

      {activeMode === "reviewLog" ? <ReviewLogMode /> : <KpiReportMode />}
    </main>
  );
}
