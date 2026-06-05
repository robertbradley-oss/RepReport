import type { ReviewRow } from "../types";

const supportTicketIdRegex = /[?&]id=(\d{3,})|(?:ticket|tickets|case|cases)[/=/-]*(\d{3,})|\/(\d{3,})(?:[/?#]|$)/i;

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function getTicketLinkChipLabel(row: ReviewRow): string {
  if (!isHttpUrl(row.ticketLink)) {
    return "Missing ticket link";
  }

  const ticketNumber = row.ticketNumber ?? parseTicketId(row.ticketLink);
  return ticketNumber ? `Ticket #${ticketNumber}` : "Open Ticket";
}

export function getReviewLinkChipLabel(row: ReviewRow): string {
  return isHttpUrl(row.reviewLink) ? "Open Review" : "Missing review link";
}

function parseTicketId(url: string): string | undefined {
  const match = url.match(supportTicketIdRegex);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}
