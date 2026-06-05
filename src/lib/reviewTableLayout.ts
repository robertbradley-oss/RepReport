import type { ReviewColumnKey } from "../types";

export const REVIEW_TABLE_COLUMN_WIDTHS: Record<ReviewColumnKey, number> = {
  ticketLink: 11,
  reviewLink: 14,
  modelNumber: 8,
  verifiedFiveStar: 10,
  containsVideo: 6.5,
  containsPictures: 6.5,
  customerContactTicketLink: 24,
  replacementSent: 20,
};

export function getReviewTableColumnClassName(key: ReviewColumnKey): string {
  return `reviewCol-${key}`;
}
