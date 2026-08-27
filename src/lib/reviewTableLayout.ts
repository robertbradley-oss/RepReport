import type { ReviewColumnKey } from "../types";

export type ReviewTableDensity = "compact" | "comfortable";

export const DEFAULT_REVIEW_TABLE_DENSITY: ReviewTableDensity = "compact";

export const REVIEW_TABLE_DENSITIES: readonly ReviewTableDensity[] = ["compact", "comfortable"];

export const REVIEW_TABLE_COLUMN_WIDTHS: Record<ReviewColumnKey, number> = {
  ticketLink: 8,
  reviewLink: 10.5,
  modelNumber: 9,
  verifiedFiveStar: 10,
  containsVideo: 6.5,
  containsPictures: 6.5,
  customerContactTicketLink: 26.5,
  replacementSent: 23,
};

export function getReviewTableColumnClassName(key: ReviewColumnKey): string {
  return `reviewCol-${key}`;
}
