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
  googleRatingNeedsReview: "Google rating/status needs review",
  mentionUnclear: "Mention status unclear",
  bonusRuleUnclear: "Bonus rule unclear",
  malformedUrl: "Malformed URL",
  invalidTicketUrl: "Invalid ticket URL",
};

const defaultGoogleRating = "5 out of 5 stars";
const bonusRulePlatforms = new Set(["Amazon", "Costco", "Google", "Home Depot", "Lowe's", "Trustpilot"]);

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
    return 10;
  }

  if (row.platform === "Costco") {
    return 15;
  }

  if (row.platform === "Home Depot" || row.platform === "Lowe's") {
    return 25;
  }

  if (row.platform === "Amazon") {
    if (row.verifiedFiveStar === "Y" && row.containsPictures === "Y") {
      return 30;
    }

    return row.verifiedFiveStar === "Y" ? 25 : 15;
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
  const hasMalformedUrl = lines.some(hasMalformedUrlText);
  const ticketNumber = parseTicketNumber(lines);
  const ticketLink = allUrls.find(isSupportTicketUrl) ?? "";
  const supportTicketId = ticketLink ? parseSupportTicketId(ticketLink) : undefined;
  const hasInvalidTicketUrl = Boolean(ticketLink && isInvalidTicketUrl(ticketLink, supportTicketId));
  const reviewLink = allUrls.find((url) => !isSupportTicketUrl(url)) ?? "";
  const platform = reviewLink ? detectPlatform(reviewLink) : "Unknown";
  const customerModel = parseCustomerModel(lines);
  const parsedRating = parseRating(lines, platform);
  const ratingOrStatus = parsedRating.value;
  const reviewDateOrStatus = parseDateOrStatus(lines, ratingOrStatus);
  const reviewText = parseReviewText(lines, allUrls, customerModel?.line, ratingOrStatus, reviewDateOrStatus);
  const containsPictures = /\*\*\*PHOTO\*\*\*/i.test(block) ? "Y" : "N";
  const containsVideo = "N";
  const verifiedFiveStar = platform === "Amazon" ? (/\bverified(?:\s+purchase)?\b/i.test(block) ? "Y" : "N") : "Y";
  const mentionStatus = parseMentionStatus(reviewText);

  flags.push(
    ...buildReviewFlags({
      platform,
      reviewLink,
      ticketNumber,
      supportTicketId,
      customerModel,
      parsedRating,
      ratingOrStatus,
      mentionStatus,
      reviewText,
      hasMalformedUrl,
      hasInvalidTicketUrl,
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
  platform: string;
  reviewLink: string;
  ticketNumber?: string;
  supportTicketId?: string;
  customerModel: { customerName: string; modelNumber: string; line: string } | undefined;
  parsedRating: { value: string; needsReview: boolean };
  ratingOrStatus: string;
  mentionStatus: string;
  reviewText: string;
  hasMalformedUrl: boolean;
  hasInvalidTicketUrl: boolean;
}): string[] {
  const flags: string[] = [];

  if (parts.hasMalformedUrl) flags.push(flagMessages.malformedUrl);
  if (parts.hasInvalidTicketUrl) flags.push(flagMessages.invalidTicketUrl);
  if (parts.platform === "Unknown") flags.push(flagMessages.platform);
  if (parts.platform !== "Unknown" && !bonusRulePlatforms.has(parts.platform)) flags.push(flagMessages.bonusRuleUnclear);
  if (!parts.reviewLink) flags.push(flagMessages.reviewLinkMissing);
  if (parts.ticketNumber && parts.supportTicketId && parts.ticketNumber !== parts.supportTicketId) flags.push(flagMessages.ticketMismatch);
  if (!parts.customerModel) flags.push(flagMessages.customerModel);
  if (parts.customerModel && !parts.customerModel.modelNumber) flags.push(flagMessages.modelMissing);
  if (parts.parsedRating.needsReview) flags.push(flagMessages.googleRatingNeedsReview);
  if (shouldFlagRatingUnclear(parts.platform, parts.reviewLink, parts.ratingOrStatus)) flags.push(flagMessages.ratingUnclear);
  if (!parts.mentionStatus) flags.push(flagMessages.mentionUnclear);
  if (parts.platform !== "Amazon" && parts.platform !== "Unknown" && !parts.reviewText) flags.push(flagMessages.nonAmazonTextMissing);

  return flags;
}

function shouldFlagRatingUnclear(platform: string, reviewLink: string, ratingOrStatus: string): boolean {
  if (ratingOrStatus) return false;
  if (!reviewLink || platform === "Unknown") return false;
  return true;
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

function hasMalformedUrlText(line: string): boolean {
  return /^https?:\/(?!\/)/i.test(line) || /^www\.[^\s]+\.[^\s]+/i.test(line);
}

function isInvalidTicketUrl(url: string, supportTicketId: string | undefined): boolean {
  if (supportTicketId) return false;
  return /[?&]id=|tickets?\.php|\/tickets?(?:[/?#]|$)/i.test(url);
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

function comparePlatformCounts(
  left: { platform: string; count: number },
  right: { platform: string; count: number },
): number {
  const preferredOrder = ["Amazon", "Google", "Trustpilot", "Costco", "Unknown"];
  const leftIndex = preferredOrder.indexOf(left.platform);
  const rightIndex = preferredOrder.indexOf(right.platform);

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? preferredOrder.length : leftIndex) - (rightIndex === -1 ? preferredOrder.length : rightIndex);
  }

  return left.platform.localeCompare(right.platform);
}
