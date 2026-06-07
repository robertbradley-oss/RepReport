import { useState } from "react";
import type { BonusSummary } from "../lib/reviewParser";

type SummaryPanelProps = {
  summary: BonusSummary;
  flagCount: number;
};

export function SummaryPanel({ summary, flagCount }: SummaryPanelProps) {
  const [isPlatformBreakdownOpen, setIsPlatformBreakdownOpen] = useState(false);
  const fullPlatformCounts = summary.platformCounts.map(({ platform, count }) => `${platform}: ${count}`).join(", ");
  const platformCountsByVolume = [...summary.platformCounts].sort(
    (left, right) => right.count - left.count || left.platform.localeCompare(right.platform),
  );
  const visiblePlatformCounts = platformCountsByVolume.slice(0, 2);
  const hiddenPlatformCount = Math.max(summary.platformCounts.length - 2, 0);
  const hasPlatformCounts = summary.platformCounts.length > 0;

  return (
    <section className="summaryPanel" aria-label="Review summary">
      <div className="summaryCard">
        <span>Total reviews</span>
        <strong>{summary.totalReviews}</strong>
      </div>
      <button
        className="summaryCard platformSummaryButton"
        type="button"
        onClick={() => setIsPlatformBreakdownOpen(true)}
        disabled={!hasPlatformCounts}
        aria-haspopup="dialog"
        aria-label="Show platform breakdown"
      >
        <span>Platforms</span>
        <div className="platformCounts" title={fullPlatformCounts || "None"}>
          {visiblePlatformCounts.length > 0 ? (
            visiblePlatformCounts.map(({ platform, count }) => (
              <strong className="platformCountLine" key={platform}>
                <span>{platform}</span>
                <span>{count}</span>
              </strong>
            ))
          ) : (
            <strong className="platformCountLine">None</strong>
          )}
          {hiddenPlatformCount > 0 && <span className="platformOverflow">+{hiddenPlatformCount} more</span>}
        </div>
      </button>
      <div className="summaryCard">
        <span>Verified Amazon</span>
        <strong>
          {summary.verifiedAmazonCount}
          <span className="summarySub"> / {summary.amazonCount}</span>
        </strong>
      </div>
      <div className="summaryCard">
        <span>Photos</span>
        <strong>
          {summary.photoReviewCount}
          <span className="summarySub"> / {summary.totalReviews}</span>
        </strong>
      </div>
      <div className={`summaryCard${flagCount > 0 ? " attentionCard" : ""}`}>
        <span>Model reminders</span>
        <strong>{flagCount}</strong>
      </div>
      <div className={`summaryCard${summary.needsAttentionCount > 0 ? " attentionCard" : ""}`}>
        <span>Needs attention</span>
        <strong>{summary.needsAttentionCount}</strong>
      </div>
      <div className="summaryCard bonusCard">
        <span>Estimated bonus</span>
        <strong>${summary.estimatedBonusTotal}</strong>
      </div>
      {isPlatformBreakdownOpen && (
        <div className="platformBreakdownBackdrop" role="presentation" onClick={() => setIsPlatformBreakdownOpen(false)}>
          <div className="platformBreakdownDialog" role="dialog" aria-modal="true" aria-labelledby="platform-breakdown-title" onClick={(event) => event.stopPropagation()}>
            <div className="platformBreakdownHeader">
              <h3 id="platform-breakdown-title">Platform breakdown</h3>
              <button className="secondaryButton platformBreakdownClose" type="button" onClick={() => setIsPlatformBreakdownOpen(false)}>
                Close
              </button>
            </div>
            <div className="platformBreakdownList">
              {platformCountsByVolume.map(({ platform, count }) => (
                <div className="platformBreakdownRow" key={platform}>
                  <span>{platform}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
