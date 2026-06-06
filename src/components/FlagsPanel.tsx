import { useState } from "react";
import { UiIcon } from "./UiIcon";
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
    setCopyStatus(copied ? "Model reminders copied." : "Copy failed. Select the model reminders and copy manually.");
  }

  return (
    <section className="flagsPanel" aria-label="Model reminders">
      <div className="flagsHeader">
        <div className="flagsTitle">
          <h2>Model reminders</h2>
          <span>{flags.length}</span>
        </div>
        <button className="secondaryButton" type="button" onClick={handleCopyFlags}>
          <UiIcon name="copy" />
          Copy Model Reminders
        </button>
      </div>
      <div className="flagsStatus" aria-live="polite">
        {copyStatus}
      </div>
      {flags.length === 0 ? (
        <p>No missing model reminders.</p>
      ) : (
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
      )}
    </section>
  );
}
