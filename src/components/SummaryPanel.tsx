import type { BonusSummary } from "../lib/reviewParser";

type SummaryPanelProps = {
  summary: BonusSummary;
  flagCount: number;
};

export function SummaryPanel({ summary, flagCount }: SummaryPanelProps) {
  const fullPlatformCounts = summary.platformCounts.map(({ platform, count }) => `${platform}: ${count}`).join(", ");
  const visiblePlatformCounts = [...summary.platformCounts]
    .sort((left, right) => right.count - left.count || left.platform.localeCompare(right.platform))
    .slice(0, 3)
    .map(({ platform, count }) => `${platform}: ${count}`)
    .join(", ");
  const hiddenPlatformCount = Math.max(summary.platformCounts.length - 3, 0);

  return (
    <section className="summaryPanel" aria-label="Review summary">
      <div className="summaryCard">
        <span>Total reviews</span>
        <strong>{summary.totalReviews}</strong>
      </div>
      <div className="summaryCard">
        <span>Platforms</span>
        <strong className="platformCounts" title={fullPlatformCounts || "None"}>
          {visiblePlatformCounts || "None"}
          {hiddenPlatformCount > 0 && <span className="platformOverflow">+{hiddenPlatformCount} more</span>}
        </strong>
      </div>
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
    </section>
  );
}
