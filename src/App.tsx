import { useEffect, useRef, useState } from "react";
import { KpiReportMode } from "./components/KpiReportMode";
import { ReviewLogMode } from "./components/ReviewLogMode";
import { UiIcon } from "./components/UiIcon";

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
  const activeModeLabel = activeMode === "reviewLog" ? "Review Log Mode" : "KPI Report Mode";
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
          <img className="brandMark" src="/assets/repreport-mark.svg" alt="" aria-hidden="true" width={36} height={36} />
          <h1 className="brandWordmark">
            <span className="brandRep">Rep</span>
            <span className="brandReport">Report</span>
          </h1>
          <button
            type="button"
            className="themeToggle"
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle dark mode"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            <span className="themeToggleKnob">
              <span className="themeToggleIcon themeToggleIcon--sun" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4" />
                </svg>
              </span>
              <span className="themeToggleIcon themeToggleIcon--moon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
                </svg>
              </span>
            </span>
          </button>
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
