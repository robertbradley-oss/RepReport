const photoMarkerLineRegex = /^(?:\*{2,3}\s*)?PHOTO(?:\s*\*{2,3})?$/i;
const videoMarkerLineRegex = /^(?:\*{2,3}\s*)?VIDEO(?:\s*\*{2,3})?$/i;

export function isInternalPhotoMarkerLine(value: string): boolean {
  return photoMarkerLineRegex.test(value.trim());
}

export function isInternalVideoMarkerLine(value: string): boolean {
  return videoMarkerLineRegex.test(value.trim());
}

export function isInternalNoteMarkerLine(value: string): boolean {
  return isInternalPhotoMarkerLine(value) || isInternalVideoMarkerLine(value);
}

export function containsInternalPhotoMarker(value: string): boolean {
  return normalizeLines(value).some(isInternalPhotoMarkerLine);
}

export function containsInternalVideoMarker(value: string): boolean {
  return normalizeLines(value).some(isInternalVideoMarkerLine);
}

export function stripInternalNoteMarkers(value: string): string {
  const lines = normalizeLines(value);
  if (!lines.some(isInternalNoteMarkerLine)) {
    return value;
  }

  return lines
    .filter((line) => !isInternalNoteMarkerLine(line))
    .join("\n")
    .trim();
}

function normalizeLines(value: string): string[] {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}
