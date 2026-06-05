import type { FlagItem, ReviewRow } from "../types";

const urlRegex = /https?:\/\/[^\s]+/gi;
const singleUrlRegex = /^https?:\/\/[^\s]+$/i;
const ticketLineRegex = /^(?:ticket\s*#?\s*|#)(\d{3,})\b/i;
const supportTicketIdRegex = /[?&]id=(\d{3,})|(?:ticket|tickets|case|cases)[/=/-]*(\d{3,})|\/(\d{3,})(?:[/?#]|$)/i;

const platformMatchers: Array<[string, RegExp]> = [
  ["Amazon", /amazon\.com/i],
  ["Google", /google\.com/i],
  ["Trustpilot", /trustpilot\.com/i],
  ["Costco", /costco/i],
  ["Home Depot", /homedepot\.com/i],
  ["Lowe's", /lowes\.com/i],
];

const flagMessages = {
  platform: "Platform unclear",
  ticketMismatch: "Ticket number and support URL ID do not match",
  customerModel: "Customer/model line cannot be parsed",
  modelMissing: "Model missing",
  reviewLinkMissing: "Review link missing",
  nonAmazonTextMissing: "Non-Amazon review text missing",
  ratingUnclear: "Rating unclear",
  mentionUnclear: "Mention status unclear",
};

export function parseReviewNotes(input: string): ReviewRow[] {
  return splitBlocks(normalizePastedNotes(input)).map(parseBlock);
}

export function collectFlags(rows: ReviewRow[]): FlagItem[] {
  return rows.flatMap((row, index) =>
    row.flags.map((message) => ({
      rowNumber: index + 1,
      platform: row.platform || "Unknown",
      message,
    })),
  );
}

export function calculateBonus(row: ReviewRow): number {
  if (row.platform === "Google") {
    return row.containsPictures === "Y" ? 20 : 10;
  }

  if (row.platform === "Trustpilot") {
    return 10;
  }

  if (row.platform === "Costco") {
    return 15;
  }

  if (row.platform === "Amazon") {
    if (row.verifiedFiveStar === "Y" && row.containsPictures === "Y") {
      return 30;
    }

    return row.verifiedFiveStar === "Y" ? 25 : 15;
  }

  return 0;
}

function splitBlocks(input: string): string[] {
  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const beginsNewBlock =
      current.length > 0 &&
      isBlockStart(line) &&
      (hasReviewUrl(current) || hasCustomerModelLine(current) || isTicketStart(line));

    if (beginsNewBlock) {
      blocks.push(current);
      current = [];
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks.map((block) => block.join("\n"));
}

function normalizePastedNotes(input: string): string {
  const expanded = input
    .replace(/\r\n/g, "\n")
    .replace(/(Ticket\s*#?\s*\d+|#\d{3,})(\s*-\s*PHOTO)?/gi, (_match, ticket: string, photo: string | undefined) =>
      photo ? `${ticket}\n***PHOTO***\n` : `${ticket}\n`,
    )
    .replace(/(https?:\/\/)/gi, "\n$1")
    .replace(/(dpr=1)(\d{1,2}\/\d{1,2}\/\d{2,4})(?=\S)/gi, "$1\n$2\n")
    .replace(/(ie=UTF8)(?=\S)/gi, "$1\n")
    .replace(/\b(5\s+out\s+of\s+5\s+stars)(?=\S)/gi, "$1\n")
    .replace(/([a-z])Verified Purchase/gi, "$1\nVerified Purchase")
    .replace(/(Verified Purchase)(?=\S)/gi, "$1\n")
    .replace(/(Reviewed\b)/gi, "\n$1");

  return expanded
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap(splitGluedCustomerModelLine)
    .join("\n");
}

function parseBlock(block: string): ReviewRow {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const flags: string[] = [];
  const allUrls = [...block.matchAll(urlRegex)].map((match) => stripTrailingPunctuation(match[0]));
  const ticketNumber = parseTicketNumber(lines);
  const ticketLink = allUrls.find(isSupportTicketUrl) ?? "";
  const supportTicketId = ticketLink ? parseSupportTicketId(ticketLink) : undefined;
  const reviewLink = allUrls.find((url) => !isSupportTicketUrl(url) && detectPlatform(url) !== "Unknown") ?? "";
  const platform = reviewLink ? detectPlatform(reviewLink) : "Unknown";
  const customerModel = parseCustomerModel(lines);
  const ratingOrStatus = parseRating(lines);
  const reviewDateOrStatus = parseDateOrStatus(lines, ratingOrStatus);
  const reviewText = parseReviewText(lines, allUrls, customerModel?.line, ratingOrStatus, reviewDateOrStatus);
  const containsPictures = /\*\*\*PHOTO\*\*\*/i.test(block) ? "Y" : "N";
  const containsVideo = "N";
  const verifiedFiveStar = platform === "Amazon" ? (/\bverified(?:\s+purchase)?\b/i.test(block) ? "Y" : "N") : "Y";
  const mentionStatus = parseMentionStatus(reviewText);

  if (platform === "Unknown") flags.push(flagMessages.platform);
  if (!reviewLink) flags.push(flagMessages.reviewLinkMissing);
  if (ticketNumber && supportTicketId && ticketNumber !== supportTicketId) flags.push(flagMessages.ticketMismatch);
  if (!customerModel) flags.push(flagMessages.customerModel);
  if (customerModel && !customerModel.modelNumber) flags.push(flagMessages.modelMissing);
  if (!ratingOrStatus) flags.push(flagMessages.ratingUnclear);
  if (!mentionStatus) flags.push(flagMessages.mentionUnclear);
  if (platform !== "Amazon" && platform !== "Unknown" && !reviewText) flags.push(flagMessages.nonAmazonTextMissing);

  const customerContactTicketLink = buildCustomerContactCell({
    ticketNumber,
    customerName: customerModel?.customerName,
    platform,
    reviewDateOrStatus,
    ratingOrStatus,
    mentionStatus,
  });

  return {
    ticketLink,
    reviewLink,
    modelNumber: customerModel?.modelNumber ?? "",
    verifiedFiveStar,
    containsVideo,
    containsPictures,
    customerContactTicketLink,
    replacementSent: platform === "Amazon" ? "" : reviewText,
    platform,
    ticketNumber,
    customerName: customerModel?.customerName,
    reviewDateOrStatus,
    ratingOrStatus,
    reviewText,
    flags,
  };
}

function parseTicketNumber(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(ticketLineRegex);
    if (match) return match[1];
  }

  return undefined;
}

function parseSupportTicketId(url: string): string | undefined {
  const match = url.match(supportTicketIdRegex);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function isSupportTicketUrl(url: string): boolean {
  return /support|zendesk|freshdesk|osticket|ticket|tickets/i.test(url);
}

function detectPlatform(url: string): string {
  return platformMatchers.find(([, matcher]) => matcher.test(url))?.[0] ?? "Unknown";
}

function parseCustomerModel(lines: string[]): { customerName: string; modelNumber: string; line: string } | undefined {
  const usefulLines = lines.filter((line) => !singleUrlRegex.test(line) && !ticketLineRegex.test(line));

  for (const line of [...usefulLines].reverse()) {
    const match = line.match(/^(.+?)\s+-\s+([A-Za-z0-9][A-Za-z0-9._/-]*)$/);
    if (match) {
      return {
        customerName: match[1].trim(),
        modelNumber: match[2].trim(),
        line,
      };
    }
  }

  return undefined;
}

function splitGluedCustomerModelLine(line: string): string[] {
  const modelMatch = line.match(/\s+-\s+([A-Za-z0-9][A-Za-z0-9._/-]*)$/);
  if (!modelMatch || modelMatch.index === undefined) {
    return [line];
  }

  const beforeModel = line.slice(0, modelMatch.index).trim();
  const customerName = extractTrailingCustomerName(beforeModel);
  if (!customerName) {
    return [line];
  }

  const reviewText = beforeModel.slice(0, beforeModel.length - customerName.length).trim();
  const customerModelLine = `${customerName} - ${modelMatch[1]}`;

  return reviewText ? [reviewText, customerModelLine] : [customerModelLine];
}

function extractTrailingCustomerName(value: string): string {
  const patterns = [
    /(Mr\.?\s*&\s*Mrs\.?\s+[A-Z][A-Za-z.'’]*)$/,
    /[.!?)]\s*([A-Z][A-Za-z'’]*(?:\s+[A-Z][A-Za-z'’]*){0,4})$/,
    /[a-z]([A-Z][A-Za-z'’]*(?:\s+[A-Z][A-Za-z'’]*){1,4})$/,
    /[.!?)]\s*([a-z][a-z'’]*(?:\s+[a-z][a-z'’]*){1,3})$/,
    /^([A-Z][A-Za-z'’]*(?:\s+[A-Z][A-Za-z'’]*){0,4})$/,
    /^([a-z][a-z'’]*(?:\s+[a-z][a-z'’]*){1,3})$/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1].trim();
  }

  return "";
}

function parseRating(lines: string[]): string {
  for (const line of lines) {
    const match = line.match(/\b(5\s+out\s+of\s+5\s+stars|5\s*-?\s*stars?|five\s*-?\s*stars?|★★★★★|5\/5)\b/i);
    if (match) return match[1];
  }

  return "";
}

function parseDateOrStatus(lines: string[], ratingOrStatus: string): string {
  for (const line of lines) {
    if (line === ratingOrStatus || singleUrlRegex.test(line) || ticketLineRegex.test(line)) continue;

    const reviewedMatch = line.match(/\bReviewed\b.*?\bon\s+((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i);
    if (reviewedMatch) return reviewedMatch[0];

    const dateMatch = line.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/i);
    if (dateMatch) return dateMatch[0];
  }

  return "";
}

function parseReviewText(
  lines: string[],
  allUrls: string[],
  customerModelLine: string | undefined,
  ratingOrStatus: string,
  reviewDateOrStatus: string,
): string {
  const urlSet = new Set(allUrls);
  const textLines = lines.filter((line) => {
    if (urlSet.has(stripTrailingPunctuation(line))) return false;
    if (ticketLineRegex.test(line)) return false;
    if (line === customerModelLine) return false;
    if (line === ratingOrStatus) return false;
    if (line === reviewDateOrStatus) return false;
    if (/^\*\*\*PHOTO\*\*\*$/i.test(line)) return false;
    if (/^verified purchase$/i.test(line)) return false;
    return true;
  });

  return textLines.join("\n").trim();
}

function parseMentionStatus(reviewText: string): string {
  if (!reviewText.trim()) {
    return "";
  }

  if (/\brobert\b/i.test(reviewText)) {
    return "Review mentions name";
  }

  return "Review does not mention name";
}

function buildCustomerContactCell(parts: {
  ticketNumber?: string;
  customerName?: string;
  platform: string;
  reviewDateOrStatus: string;
  ratingOrStatus: string;
  mentionStatus: string;
}): string {
  const lines = [
    parts.ticketNumber ? `Ticket #${parts.ticketNumber}` : "",
    parts.customerName ?? "",
    parts.platform,
    parts.reviewDateOrStatus,
    parts.ratingOrStatus,
    parts.mentionStatus,
  ].filter(Boolean);

  return lines.join("\n");
}

function hasReviewUrl(lines: string[]): boolean {
  return lines.some((line) => {
    const urls = line.match(urlRegex) ?? [];
    return urls.some((url) => detectPlatform(url) !== "Unknown");
  });
}

function hasCustomerModelLine(lines: string[]): boolean {
  return Boolean(parseCustomerModel(lines));
}

function isTicketStart(line: string): boolean {
  return ticketLineRegex.test(line);
}

function isBlockStart(line: string): boolean {
  if (isTicketStart(line)) return true;
  const urls = line.match(urlRegex) ?? [];
  return urls.some((url) => isSupportTicketUrl(url) || detectPlatform(url) !== "Unknown");
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[),.;]+$/g, "");
}
