import type { ReviewRow } from "../types";

const supportTicketIdRegex = /[?&]id=(\d{3,})|(?:ticket|tickets|case|cases)[/=/-]*(\d{3,})|\/(\d{3,})(?:[/?#]|$)/i;

export function isHttpUrl(value: string): boolean {
  return parseHttpUrl(value) !== undefined;
}

export function getHttpUrlHref(value: string): string | undefined {
  return parseHttpUrl(value)?.href;
}

export function getTicketLinkChipLabel(row: ReviewRow): string {
  const parsedUrl = parseHttpUrl(row.ticketLink);
  if (!parsedUrl) {
    return "Missing ticket link";
  }

  const ticketNumber = row.ticketNumber ?? parseTicketId(row.ticketLink);
  const action = ticketNumber ? `Ticket #${ticketNumber}` : "Open Ticket";
  return `${action} · ${parsedUrl.hostname}`;
}

export function getReviewLinkChipLabel(row: ReviewRow): string {
  const parsedUrl = parseHttpUrl(row.reviewLink);
  return parsedUrl ? `Open Review · ${parsedUrl.hostname}` : "Missing review link";
}

function parseTicketId(url: string): string | undefined {
  const match = url.match(supportTicketIdRegex);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function parseHttpUrl(value: string): URL | undefined {
  const trimmedValue = value.trim();
  if (!trimmedValue || /\s/.test(trimmedValue)) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    if ((parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") || parsedUrl.username || parsedUrl.password) {
      return undefined;
    }

    return parsedUrl;
  } catch {
    return undefined;
  }
}
