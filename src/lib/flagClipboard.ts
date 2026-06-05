import type { FlagItem } from "../types";

export function formatFlagsForClipboard(flags: readonly FlagItem[]): string {
  if (flags.length === 0) {
    return "No model reminders.";
  }

  return flags.map((flag) => `Row ${flag.rowNumber} - ${flag.message}`).join("\n");
}
