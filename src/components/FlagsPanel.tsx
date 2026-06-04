import type { FlagItem } from "../types";

type FlagsPanelProps = {
  flags: FlagItem[];
};

export function FlagsPanel({ flags }: FlagsPanelProps) {
  return (
    <section className="flagsPanel" aria-label="Manual review flags">
      <h2>Flags</h2>
      {flags.length === 0 ? (
        <p>No flags.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Row</th>
              <th>Platform</th>
              <th>Flag</th>
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
      )}
    </section>
  );
}
