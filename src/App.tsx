import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { KpiReportMode } from "./components/KpiReportMode";
import { ReviewLogMode } from "./components/ReviewLogMode";

type AppMode = "reviewLog" | "kpiReport";
type Theme = "light" | "dark";

const TAB_ORDER: AppMode[] = ["reviewLog", "kpiReport"];
const THEME_STORAGE_KEY = "repreport-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function App() {
  const [activeMode, setActiveMode] = useState<AppMode>("reviewLog");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const themeAnimTimer = useRef<number | undefined>(undefined);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore persistence failures (e.g. private mode)
    }
  }, [theme]);

  function toggleTheme() {
    // Briefly enable cross-app color transitions so the theme change fades
    // smoothly instead of snapping. Removed shortly after so it never slows
    // normal interactions.
    const root = document.documentElement;
    root.classList.add("theme-animating");
    window.clearTimeout(themeAnimTimer.current);
    themeAnimTimer.current = window.setTimeout(() => {
      root.classList.remove("theme-animating");
    }, 480);
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

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
          <img className="brandMark" src="/assets/repreport-mark.svg" alt="" aria-hidden="true" width={48} height={48} />
          <div className="brandLockup">
            <h1 className="brandWordmark">
              <span className="brandRep">Rep</span>
              <span className="brandReport">Report</span>
            </h1>
            <p className="brandTagline">Reviews, reported.</p>
          </div>
        </div>

        <nav className="modeTabs" aria-label="RepReport modes">
          <button
            className={`modeTab ${activeMode === "reviewLog" ? "active" : ""}`}
            type="button"
            onClick={() => selectMode("reviewLog")}
            aria-pressed={activeMode === "reviewLog"}
          >
            Review Log
          </button>
          <button
            className={`modeTab ${activeMode === "kpiReport" ? "active" : ""}`}
            type="button"
            onClick={() => selectMode("kpiReport")}
            aria-pressed={activeMode === "kpiReport"}
          >
            KPI Report
          </button>
        </nav>

        <div className="headerActions">
          <label className="theme-switch" title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            <input
              type="checkbox"
              className="theme-switch-input"
              checked={isDark}
              onChange={toggleTheme}
              aria-label="Toggle dark mode"
            />
            <span className="theme-switch-track">
              <span className="theme-switch-thumb" aria-hidden="true">
                <Sun size={13} strokeWidth={2.5} className="theme-switch-icon theme-switch-icon--sun" />
                <Moon size={12} strokeWidth={2.5} className="theme-switch-icon theme-switch-icon--moon" />
              </span>
            </span>
          </label>
        </div>
      </header>

      <div className={`modeContent ${direction === "forward" ? "slideForward" : "slideBack"}`} key={activeMode}>
        {activeMode === "reviewLog" ? <ReviewLogMode /> : <KpiReportMode />}
      </div>
    </main>
  );
}
