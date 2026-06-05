import { useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { copyText } from "../lib/clipboard";
import { formatFlagsForClipboard } from "../lib/flagClipboard";
import type { FlagItem } from "../types";

type FlagsPanelProps = {
  flags: FlagItem[];
};

export function FlagsPanel({ flags }: FlagsPanelProps) {
  const [copyStatus, setCopyStatus] = useState("");

  async function handleCopyFlags() {
    const copied = await copyText(formatFlagsForClipboard(flags));
    setCopyStatus(copied ? "Flags copied." : "Copy failed. Select the flags and copy manually.");
  }

  return (
    <section className="flagsPanel" aria-label="Manual review flags">
      <div className="flagsHeader">
        <div className="flagsTitle">
          <h2>Flags</h2>
          <span>{flags.length}</span>
        </div>
        <button type="button" onClick={handleCopyFlags}>
          <ClipboardCopy size={16} aria-hidden="true" />
          Copy Flags
        </button>
      </div>
      <div className="flagsStatus" aria-live="polite">
        {copyStatus}
      </div>
      {flags.length === 0 ? (
        <p>No manual review flags.</p>
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
