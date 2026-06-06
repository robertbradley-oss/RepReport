import type { FlagItem } from "../types";

type FlagsPanelProps = {
  flags: FlagItem[];
};

export function FlagsPanel({ flags }: FlagsPanelProps) {
  return (
    <section className="flagsPanel" aria-label="Model reminders">
      <div className="flagsHeader">
        <div className="flagsTitle">
          <h2>Model reminders</h2>
          <span>{flags.length}</span>
        </div>
      </div>
      {flags.length === 0 ? (
        <p>No missing model reminders.</p>
      ) : (
        <div className="flagsTableScroll">
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Platform</th>
                <th>Reminder</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag, index) => (
                <tr key={`${flag.rowNumber}-${flag.message}-${index}`}>
                  <td>{flag.rowNumber}</td>
                  <td>{flag.platform}</td>
                  <td>{flag.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
