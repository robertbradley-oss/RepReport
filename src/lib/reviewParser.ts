import type { FlagItem, ReviewRow } from "../types";
import { containsInternalPhotoMarker, isInternalPhotoMarkerLine, stripInternalNoteMarkers } from "./internalNoteMarkers";

const urlRegex = /https?:\/\/[^\s]+/gi;
const singleUrlRegex = /^https?:\/\/[^\s]+$/i;
const ticketLineRegex = /^(?:ticket\s*#?\s*|#)(\d{3,})\b/i;

const platformMatchers: Array<[string, RegExp]> = [
  ["Amazon", /amazon\.com/i],
  ["Google", /google\.com/i],
  ["Trustpilot", /trustpilot\.com/i],
  ["Costco", /costco\.(?:com|ca)/i],
  ["Home Depot", /homedepot\.(?:com|ca)/i],
  ["Zoro", /zoro\.com/i],
  ["iSpring Website", /https?:\/\/(?:www\.)?ispringfilter\.com\b/i],
  ["Lowe's", /lowes\.com/i],
];

const flatTwentyFiveDollarPlatforms = new Set(["Costco", "Home Depot", "iSpring Website", "Zoro"]);

const flagMessages = {
  modelMissing: "Model missing",
};

const defaultGoogleRating = "5 out of 5 stars";

export type BonusSummary = {
  totalReviews: number;
  platformCounts: Array<{ platform: string; count: number }>;
  verifiedAmazonCount: number;
  unverifiedAmazonCount: number;
  photoReviewCount: number;
  estimatedBonusTotal: number;
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
    return 15;
  }

  if (flatTwentyFiveDollarPlatforms.has(row.platform) || row.platform === "Lowe's") {
    return 25;
  }

  if (row.platform === "Amazon") {
    const baseBonus = row.verifiedFiveStar === "Y" ? 25 : 15;
    return row.containsPictures === "Y" ? baseBonus + 5 : baseBonus;
  }

  return 0;
}

export function calculateBonusSummary(rows: ReviewRow[]): BonusSummary {
  const platformCounts = new Map<string, number>();

  for (const row of rows) {
    const platform = row.platform || "Unknown";
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  }

  return {
    totalReviews: rows.length,
    platformCounts: Array.from(platformCounts, ([platform, count]) => ({ platform, count })).sort(comparePlatformCounts),
    verifiedAmazonCount: rows.filter((row) => row.platform === "Amazon" && row.verifiedFiveStar === "Y").length,
    unverifiedAmazonCount: rows.filter((row) => row.platform === "Amazon" && row.verifiedFiveStar !== "Y").length,
    photoReviewCount: rows.filter((row) => row.containsPictures === "Y").length,
    estimatedBonusTotal: rows.reduce((sum, row) => sum + calculateBonus(row), 0),
  };
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
  const reviewLink = allUrls.find((url) => !isSupportTicketUrl(url)) ?? "";
  const platform = reviewLink ? detectPlatform(reviewLink) : "Unknown";
  const customerModel = parseCustomerModel(lines);
  const parsedRating = parseRating(lines, platform);
  const ratingOrStatus = parsedRating.value;
  const reviewDateOrStatus = parseDateOrStatus(lines, ratingOrStatus);
  const reviewText = stripInternalNoteMarkers(parseReviewText(lines, allUrls, customerModel?.line, ratingOrStatus, reviewDateOrStatus));
  const containsPictures = containsInternalPhotoMarker(block) ? "Y" : "N";
  const containsVideo = "N";
  const verifiedFiveStar = platform === "Amazon" ? (/\bverified(?:\s+purchase)?\b/i.test(block) ? "Y" : "N") : "Y";
  const mentionStatus = parseMentionStatus(reviewText);

  flags.push(
    ...buildReviewFlags({
      customerModel,
    }),
  );

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

function buildReviewFlags(parts: {
  customerModel: { customerName: string; modelNumber: string; line: string } | undefined;
}): string[] {
  const flags: string[] = [];

  if (!parts.customerModel?.modelNumber) flags.push(flagMessages.modelMissing);

  return flags;
}

function parseTicketNumber(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(ticketLineRegex);
    if (match) return match[1];
  }

  return undefined;
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

    const missingModelMatch = line.match(/^(.+?)\s+-\s*$/);
    if (missingModelMatch) {
      return {
        customerName: missingModelMatch[1].trim(),
        modelNumber: "",
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

function parseRating(lines: string[], platform: string): { value: string; needsReview: boolean } {
  if (platform === "Google") {
    const googleRating = parseGoogleRating(lines);
    if (googleRating.value) return googleRating;

    return {
      value: defaultGoogleRating,
      needsReview: false,
    };
  }

  for (const line of lines) {
    const match = line.match(/\b(5\s+out\s+of\s+5\s+stars|5\s*-?\s*stars?|five\s*-?\s*stars?|★★★★★|5\/5)\b/i);
    if (match) {
      return {
        value: match[1],
        needsReview: false,
      };
    }
  }

  return {
    value: "",
    needsReview: false,
  };
}

function parseGoogleRating(lines: string[]): { value: string; needsReview: boolean } {
  const ratings = lines.flatMap(extractGoogleStarRatings);
  const ratingValues = new Set(ratings.map((rating) => rating.value));

  if (ratings.length > 0) {
    return {
      value: ratings[0].label,
      needsReview: ratingValues.size > 1 || ratings.some((rating) => rating.value !== 5),
    };
  }

  for (const line of lines) {
    const statusMatch = line.match(/\b(review\s+pending|pending|not\s+posted|not\s+published|in\s+review|needs?\s+approval|negative\s+review|negative\s+rating)\b/i);
    if (statusMatch) {
      return {
        value: statusMatch[1],
        needsReview: true,
      };
    }
  }

  return {
    value: "",
    needsReview: false,
  };
}

function extractGoogleStarRatings(line: string): Array<{ label: string; value: number }> {
  const ratings: Array<{ label: string; value: number }> = [];

  for (const match of line.matchAll(/\b([1-5])\s+out\s+of\s+5\s+stars?\b/gi)) {
    ratings.push({
      label: match[0],
      value: Number(match[1]),
    });
  }

  for (const match of line.matchAll(/\b([1-5])\/5\b/gi)) {
    ratings.push({
      label: match[0],
      value: Number(match[1]),
    });
  }

  for (const match of line.matchAll(/\b(one|two|three|four|five)\s*-?\s*stars?\b/gi)) {
    ratings.push({
      label: match[0],
      value: wordToRatingValue(match[1]),
    });
  }

  for (const match of line.matchAll(/\b([1-5])\s*-?\s*stars?\b/gi)) {
    ratings.push({
      label: match[0],
      value: Number(match[1]),
    });
  }

  return ratings;
}

function wordToRatingValue(value: string): number {
  const ratings: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  };

  return ratings[value.toLowerCase()] ?? 0;
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
    if (isInternalPhotoMarkerLine(line)) return false;
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

function comparePlatformCounts(
  left: { platform: string; count: number },
  right: { platform: string; count: number },
): number {
  const preferredOrder = ["Amazon", "Google", "Trustpilot", "Costco", "Home Depot", "Zoro", "iSpring Website", "Lowe's", "Unknown"];
  const leftIndex = preferredOrder.indexOf(left.platform);
  const rightIndex = preferredOrder.indexOf(right.platform);

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? preferredOrder.length : leftIndex) - (rightIndex === -1 ? preferredOrder.length : rightIndex);
  }

  return left.platform.localeCompare(right.platform);
}
