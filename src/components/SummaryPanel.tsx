import type { BonusSummary } from "../lib/reviewParser";

type SummaryPanelProps = {
  summary: BonusSummary;
  flagCount: number;
};

export function SummaryPanel({ summary, flagCount }: SummaryPanelProps) {
  const platformCounts = summary.platformCounts.map(({ platform, count }) => `${platform}: ${count}`).join(", ");

  return (
    <section className="summaryPanel" aria-label="Review summary">
      <div className="summaryCard">
        <span>Total reviews</span>
        <strong>{summary.totalReviews}</strong>
      </div>
      <div className="summaryCard">
        <span>Platforms</span>
        <strong className="platformCounts">{platformCounts || "None"}</strong>
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
