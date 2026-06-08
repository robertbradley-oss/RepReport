import {
  REVIEW_PROMISE_PLATFORMS,
  REVIEW_PROMISE_STATUSES,
  type ReviewPromiseEntry,
  type ReviewPromisePlatform,
  type ReviewPromiseStatus,
} from "../types";

export const REVIEW_PROMISES_STORAGE_KEY = "repstack-review-promises-v1";

const platformValues = new Set<string>(REVIEW_PROMISE_PLATFORMS);
const statusValues = new Set<string>(REVIEW_PROMISE_STATUSES);

export type ReviewPromiseDraft = Omit<ReviewPromiseEntry, "id" | "createdAt">;

export function createEmptyReviewPromiseDraft(): ReviewPromiseDraft {
  return {
    customerName: "",
    platform: "Google",
    ticketNumber: "",
    ticketLink: "",
    modelNumber: "",
    promiseNote: "",
    followUpDate: "",
    status: "Promised",
  };
}

export function createReviewPromiseFromDraft(draft: ReviewPromiseDraft): ReviewPromiseEntry {
  return {
    ...normalizeDraft(draft),
    id: createReviewPromiseId(),
    createdAt: new Date().toISOString(),
  };
}

export function updateReviewPromiseFromDraft(entry: ReviewPromiseEntry, draft: ReviewPromiseDraft): ReviewPromiseEntry {
  return {
    ...entry,
    ...normalizeDraft(draft),
  };
}

export function loadReviewPromises(): ReviewPromiseEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(REVIEW_PROMISES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeStoredEntry).filter((entry): entry is ReviewPromiseEntry => entry !== null) : [];
  } catch {
    return [];
  }
}

export function saveReviewPromises(entries: ReviewPromiseEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REVIEW_PROMISES_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // LocalStorage can fail in private mode or under quota pressure. The UI still
    // keeps the current session state usable.
  }
}

export function buildReviewPromiseSearchText(entry: ReviewPromiseEntry): string {
  return [
    entry.customerName,
    entry.platform,
    entry.ticketNumber,
    entry.modelNumber,
    entry.promiseNote,
    entry.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getReviewPromiseDraft(entry: ReviewPromiseEntry): ReviewPromiseDraft {
  return {
    customerName: entry.customerName,
    platform: entry.platform,
    ticketNumber: entry.ticketNumber ?? "",
    ticketLink: entry.ticketLink ?? "",
    modelNumber: entry.modelNumber ?? "",
    promiseNote: entry.promiseNote ?? "",
    followUpDate: entry.followUpDate ?? "",
    status: entry.status,
  };
}

function normalizeDraft(draft: ReviewPromiseDraft): ReviewPromiseDraft {
  return {
    customerName: draft.customerName.trim(),
    platform: platformValues.has(draft.platform) ? draft.platform : "Other",
    ticketNumber: draft.ticketNumber?.trim() ?? "",
    ticketLink: draft.ticketLink?.trim() ?? "",
    modelNumber: draft.modelNumber?.trim() ?? "",
    promiseNote: draft.promiseNote?.trim() ?? "",
    followUpDate: draft.followUpDate?.trim() ?? "",
    status: statusValues.has(draft.status) ? draft.status : "Promised",
  };
}

function normalizeStoredEntry(value: unknown): ReviewPromiseEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Partial<Record<keyof ReviewPromiseEntry, unknown>>;
  const id = toStringValue(entry.id) || createReviewPromiseId();
  const createdAt = toStringValue(entry.createdAt) || new Date().toISOString();
  const platform = toReviewPromisePlatform(entry.platform);
  const status = toReviewPromiseStatus(entry.status);

  return {
    id,
    createdAt,
    customerName: toStringValue(entry.customerName),
    platform,
    ticketNumber: toStringValue(entry.ticketNumber),
    ticketLink: toStringValue(entry.ticketLink),
    modelNumber: toStringValue(entry.modelNumber),
    promiseNote: toStringValue(entry.promiseNote),
    followUpDate: toStringValue(entry.followUpDate),
    status,
  };
}

function toReviewPromisePlatform(value: unknown): ReviewPromisePlatform {
  return typeof value === "string" && platformValues.has(value) ? (value as ReviewPromisePlatform) : "Other";
}

function toReviewPromiseStatus(value: unknown): ReviewPromiseStatus {
  return typeof value === "string" && statusValues.has(value) ? (value as ReviewPromiseStatus) : "Promised";
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function createReviewPromiseId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `promise-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
