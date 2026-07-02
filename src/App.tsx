import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { KpiReportMode } from "./components/KpiReportMode";
import { ReviewLogMode } from "./components/ReviewLogMode";

type AppMode = "reviewLog" | "kpiReport";
type Theme = "light" | "dark";

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
    setDirection(mode === "kpiReport" ? "forward" : "back");
    setActiveMode(mode);
  }

  function handleLogoClick() {
    selectMode(activeMode === "kpiReport" ? "reviewLog" : "kpiReport");
  }

  const logoActionLabel = activeMode === "kpiReport" ? "Return to Review Log" : "Open KPI Analyzer";

  return (
    <main className="appShell">
      <header className="appHeader">
        <div className="brandBlock">
          <button
            className="brandMarkButton"
            type="button"
            onClick={handleLogoClick}
            aria-label={logoActionLabel}
            title={logoActionLabel}
          >
            <img className="brandMark" src="/assets/repreport-mark.svg" alt="" aria-hidden="true" width={48} height={48} />
          </button>
          <div className="brandLockup">
            <h1 className="brandWordmark">
              <span className="brandRep">Rep</span>
              <span className="brandReport">Report</span>
            </h1>
            <p className="brandTagline">Reviews, reported.</p>
          </div>
        </div>

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
        {activeMode === "reviewLog" ? <ReviewLogMode /> : <KpiReportMode onReturnToReviewLog={() => selectMode("reviewLog")} />}
      </div>
    </main>
  );
}
