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
        <strong>{summary.verifiedAmazonCount}</strong>
      </div>
      <div className="summaryCard">
        <span>Unverified Amazon</span>
        <strong>{summary.unverifiedAmazonCount}</strong>
      </div>
      <div className="summaryCard">
        <span>Photo reviews</span>
        <strong>{summary.photoReviewCount}</strong>
      </div>
      <div className="summaryCard">
        <span>Model reminders</span>
        <strong>{flagCount}</strong>
      </div>
      <div className="summaryCard bonusCard">
        <span>Estimated bonus</span>
        <strong>${summary.estimatedBonusTotal}</strong>
      </div>
    </section>
  );
}
