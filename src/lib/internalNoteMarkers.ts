const photoMarkerLineRegex = /^(?:\*{2,3}\s*)?PHOTO(?:\s*\*{2,3})?$/i;

export function isInternalPhotoMarkerLine(value: string): boolean {
  return photoMarkerLineRegex.test(value.trim());
}

export function containsInternalPhotoMarker(value: string): boolean {
  return normalizeLines(value).some(isInternalPhotoMarkerLine);
}

export function stripInternalNoteMarkers(value: string): string {
  if (!containsInternalPhotoMarker(value)) {
    return value;
  }

  return normalizeLines(value)
    .filter((line) => !isInternalPhotoMarkerLine(line))
    .join("\n")
    .trim();
}

function normalizeLines(value: string): string[] {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}
