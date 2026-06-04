type SummaryPanelProps = {
  rowCount: number;
  flagCount: number;
  estimatedBonus: number;
};

export function SummaryPanel({ rowCount, flagCount, estimatedBonus }: SummaryPanelProps) {
  return (
    <section className="summaryPanel" aria-label="Review summary">
      <div>
        <span>Rows</span>
        <strong>{rowCount}</strong>
      </div>
      <div>
        <span>Flags</span>
        <strong>{flagCount}</strong>
      </div>
      <div>
        <span>Bonus</span>
        <strong>${estimatedBonus}</strong>
      </div>
    </section>
  );
}
