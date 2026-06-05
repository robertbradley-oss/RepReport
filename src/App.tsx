import { FileSpreadsheet, TableProperties } from "lucide-react";
import { ReviewLogMode } from "./components/ReviewLogMode";

export default function App() {
  return (
    <main className="appShell">
      <header className="appHeader">
        <div className="brandBlock">
          <img className="brandLogo" src="/assets/repreport-logo.png" alt="RepReport" />
          <div className="brandText">
            <h1 className="srOnly">RepReport</h1>
            <p>Review Log Mode</p>
          </div>
        </div>
      </header>

      <nav className="modeTabs" aria-label="RepReport modes">
        <button className="modeTab active" type="button">
          <TableProperties size={16} aria-hidden="true" />
          Review Log
        </button>
        <button className="modeTab" type="button" disabled>
          <FileSpreadsheet size={16} aria-hidden="true" />
          KPI Report
        </button>
      </nav>

      <ReviewLogMode />
    </main>
  );
}
