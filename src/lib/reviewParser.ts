import type { FlagItem, ReviewRow, YesNo } from "../types";
import {
  containsInternalPhotoMarker,
  containsInternalVideoMarker,
  isInternalNoteMarkerLine,
  stripInternalNoteMarkers,
} from "./internalNoteMarkers";

const urlRegex = /https?:\/\/[^\s]+/gi;
const singleUrlRegex = /^https?:\/\/[^\s]+$/i;
const ticketLineRegex = /^(?:ticket\s*#?\s*|#)(\d{3,})\b/i;
const modelTokenRegex = /\b(?:ICEK|[A-Z]{1,8}\d[A-Z0-9]*(?:[-/][A-Z0-9]+)*)\b/g;
const modelLabelRegex = /\b(?:model(?:\s+number)?|system|product|sku)\b\s*(?:#|no\.?|number)?\s*[:=-]?\s*/i;

const platformMatchers: Array<[string, RegExp]> = [
  ["Amazon", /(^|\.)(?:amazon\.(?:com|ca)|amzn\.to|a\.co)$/i],
  ["Google", /(^|\.)(?:google\.com|g\.page|goo\.gl)$/i],
  ["Trustpilot", /(^|\.)trustpilot\.com$/i],
  ["Yelp", /(^|\.)yelp\.com$/i],
  ["Costco US", /(^|\.)costco\.com$/i],
  ["Costco.ca", /(^|\.)costco\.ca$/i],
  ["Home Depot", /(^|\.)homedepot\.(?:com|ca)$/i],
  ["Zoro", /(^|\.)zoro\.com$/i],
  ["Walmart", /(^|\.)walmart\.com$/i],
  ["PureDrop", /(^|\.)puredropfilter\.com$/i],
  ["iSpring Website", /(^|\.)(?:ispringfilter|ispringwater|123filter)\.com$/i],
  ["Lowe's", /(^|\.)lowes\.com$/i],
];

const costcoPlatforms = new Set(["Costco", "Costco US", "Costco.ca"]);
const flatTwentyFiveDollarPlatforms = new Set(["Home Depot", "iSpring Website", "PureDrop", "Zoro", "Walmart"]);

export const flagMessages = {
  modelMissing: "Model missing",
};

const defaultGoogleRating = "5 out of 5 stars";

export type BonusSummary = {
  totalReviews: number;
  platformCounts: Array<{ platform: string; count: number }>;
  verifiedAmazonCount: number;
  unverifiedAmazonCount: number;
  amazonCount: number;
  photoReviewCount: number;
  videoReviewCount: number;
  needsAttentionCount: number;
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
  const hasPhoto = row.containsPictures === "Y";
  const hasVideo = row.containsVideo === "Y";

  if (row.platform === "Google") {
    return 10 + (hasPhoto ? 10 : 0) + (hasVideo ? 10 : 0);
  }

  if (row.platform === "Trustpilot") {
    return 10;
  }

  if (row.platform === "Yelp") {
    return 20;
  }

  if (row.platform === "Amazon") {
    const baseBonus = row.verifiedFiveStar === "Y" ? 25 : 15;
    return baseBonus + (hasPhoto ? 5 : 0) + (hasVideo ? 10 : 0);
  }

  if (row.platform === "Home Depot" || row.platform === "Lowe's") {
    return 25 + (hasPhoto ? 5 : 0) + (hasVideo ? 10 : 0);
  }

  if (costcoPlatforms.has(row.platform)) {
    return 25 + (hasPhoto ? 5 : 0) + (hasVideo ? 10 : 0);
  }

  if (flatTwentyFiveDollarPlatforms.has(row.platform)) {
    return 25;
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
    amazonCount: rows.filter((row) => row.platform === "Amazon").length,
    photoReviewCount: rows.filter((row) => row.containsPictures === "Y").length,
    videoReviewCount: rows.filter((row) => row.containsVideo === "Y").length,
    needsAttentionCount: rows.filter((row) => row.reviewLink.trim() === "" || row.platform === "Unknown").length,
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
      ((isBlockStart(line) &&
        (hasReviewUrl(current) || hasCustomerModelLine(current) || isTicketStart(line))) ||
        // A leading media-marker line (RepStack ticketless export) starts the
        // next review — but only once the current review is complete, so a
        // marker that legitimately sits after a review URL doesn't split its
        // own review.
        (isInternalNoteMarkerLine(line) && hasCustomerModelLine(current)));

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
  // Media suffixes like "- photo", "- video", "- photo/video" become internal
  // marker lines so photo/video detection survives the line-level parsing.
  const mediaSuffixToMarkers = (media: string | undefined): string => {
    if (!media) {
      return "";
    }
    const markers: string[] = [];
    if (/photo/i.test(media)) markers.push("***PHOTO***");
    if (/video/i.test(media)) markers.push("***VIDEO***");
    return markers.length > 0 ? `${markers.join("\n")}\n` : "";
  };
  const mediaSuffixPattern = "(?:photo|video)(?:\\s*\\/\\s*(?:photo|video))?";

  const expanded = input
    .replace(/\r\n/g, "\n")
    // Bare ticket numbers, with or without a media suffix (RepStack export
    // first lines). Rewriting these is important because RepStack does not add
    // the literal "Ticket #" prefix.
    .replace(
      new RegExp(`^(\\d{3,})(?:[ \\t]*-[ \\t]*(${mediaSuffixPattern}))?[ \\t]*$`, "gim"),
      (_match, ticket: string, media: string | undefined) =>
        `Ticket #${ticket}\n${mediaSuffixToMarkers(media)}`,
    )
    .replace(
      new RegExp(`(Ticket\\s*#?\\s*\\d+|#\\d{3,})(\\s*-\\s*${mediaSuffixPattern})?`, "gi"),
      (_match, ticket: string, media: string | undefined) =>
        `${ticket}\n${mediaSuffixToMarkers(media)}`,
    )
    // Ticketless reviews export the media label as a standalone first line
    // (e.g. "- photo/video"). Convert that whole line to markers too.
    .replace(
      new RegExp(`^\\s*-\\s*(${mediaSuffixPattern})\\s*$`, "gim"),
      (_match, media: string) => mediaSuffixToMarkers(media).trimEnd(),
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
  const platform = reviewLink ? detectReviewPlatform(reviewLink) : "Unknown";
  const customerModel = parseCustomerModel(lines);
  const parsedRating = parseRating(lines, platform);
  const ratingOrStatus = parsedRating.value;
  const reviewDateOrStatus = parseDateOrStatus(lines, ratingOrStatus);
  const reviewText = stripInternalNoteMarkers(parseReviewText(lines, allUrls, customerModel?.linesToOmit ?? [], ratingOrStatus, reviewDateOrStatus));
  const containsPictures = containsInternalPhotoMarker(block) ? "Y" : "N";
  const containsVideo = containsInternalVideoMarker(block) ? "Y" : "N";
  const verifiedFiveStar = parseVerifiedStatus(lines, customerModel?.linesToOmit ?? []);
  const amazonVerifiedPurchase = platform === "Amazon" && verifiedFiveStar === "Y";
  const mentionStatus = parseMentionStatus(reviewText);

  flags.push(
    ...buildReviewFlags({
      customerModel,
    }),
  );

  const amazonMarketplace = normalizeAmazonMarketplace(platform, reviewDateOrStatus);
  const displayDateOrStatus = amazonMarketplace.dateOrStatus;

  const customerContactTicketLink = buildCustomerContactCell({
    ticketNumber,
    customerName: customerModel?.customerName,
    platform: amazonMarketplace.platformDisplay,
    reviewDateOrStatus: displayDateOrStatus,
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
    amazonVerifiedPurchase,
    ticketNumber,
    customerName: customerModel?.customerName,
    reviewDateOrStatus: displayDateOrStatus,
    ratingOrStatus,
    reviewText,
    flags,
  };
}

function buildReviewFlags(parts: {
  customerModel: ParsedCustomerModel | undefined;
}): string[] {
  const flags: string[] = [];

  if (!parts.customerModel?.modelNumber) flags.push(flagMessages.modelMissing);

  return flags;
}

function parseVerifiedStatus(lines: string[], linesToOmit: string[]): YesNo {
  const omittedLines = new Set(linesToOmit);
  const verificationLines = lines.filter((line) => !singleUrlRegex.test(line) && !ticketLineRegex.test(line) && !omittedLines.has(line));

  if (verificationLines.some(hasClearUnverifiedStatus)) {
    return "N";
  }

  return verificationLines.some(hasClearVerifiedStatus) ? "Y" : "N";
}

function hasClearUnverifiedStatus(line: string): boolean {
  return /\b(?:unverified|not\s+verified|not\s+a\s+verified\s+(?:purchase|buyer|customer|review|owner)|not\s+verified\s+(?:purchase|buyer|customer|review|owner)|non[-\s]?verified)\b/i.test(line);
}

function hasClearVerifiedStatus(line: string): boolean {
  return (
    /\bverified\s+(?:purchase|buyer|customer|review|owner)\b/i.test(line) ||
    /^verified\s*[:=-]\s*(?:y|yes|true)$/i.test(line.trim()) ||
    line
      .split(/\s+-\s+|\s+\|\s+/)
      .some((segment) => /^verified$/i.test(segment.trim()))
  );
}

function isVerificationStatusLine(line: string): boolean {
  const trimmedLine = line.trim();
  return (
    /^(?:verified(?:\s+(?:purchase|buyer|customer|review|owner))?|unverified|not\s+verified|not\s+a\s+verified\s+(?:purchase|buyer|customer|review|owner)|not\s+verified\s+(?:purchase|buyer|customer|review|owner)|non[-\s]?verified)$/i.test(trimmedLine) ||
    /^verified\s*[:=-]\s*(?:y|yes|true)$/i.test(trimmedLine)
  );
}

function parseTicketNumber(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(ticketLineRegex);
    if (match) return match[1];
  }

  return undefined;
}

function isSupportTicketUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();
    const hasTicketQueryParameter = Array.from(parsedUrl.searchParams.keys()).some((key) => /^(?:ticket|ticket_id|ticketid|id)$/i.test(key));

    return (
      /(^|\.)(?:support|tickets?)\./i.test(hostname) ||
      /(?:zendesk|freshdesk|osticket)/i.test(hostname) ||
      /\/(?:scp\/)?tickets?(?:\.php)?(?:\/|$)/i.test(pathname) ||
      (hasTicketQueryParameter && /(?:support|help|ticket)/i.test(hostname))
    );
  } catch {
    return false;
  }
}

export function detectReviewPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return platformMatchers.find(([, matcher]) => matcher.test(hostname))?.[0] ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

type ParsedCustomerModel = {
  customerName?: string;
  modelNumber: string;
  line?: string;
  linesToOmit?: string[];
};

function parseCustomerModel(lines: string[]): ParsedCustomerModel | undefined {
  const usefulLines = lines.filter((line) => !singleUrlRegex.test(line) && !ticketLineRegex.test(line));
  let missingModelMatch: RegExpMatchArray | undefined;

  for (const line of [...usefulLines].reverse()) {
    const match = line.match(/^(.+?)\s+-\s+([A-Za-z0-9][A-Za-z0-9._/-]*)$/);
    if (match) {
      return {
        customerName: match[1].trim(),
        modelNumber: match[2].trim(),
        line,
        linesToOmit: [line],
      };
    }

    missingModelMatch ??= line.match(/^(.+?)\s+-\s*$/) ?? undefined;
  }

  const fallbackModel = findModelCandidate(lines);

  if (missingModelMatch) {
    const linesToOmit = [missingModelMatch[0]];
    if (fallbackModel?.omitLine) {
      linesToOmit.push(fallbackModel.line);
    }

    return {
      customerName: missingModelMatch[1].trim(),
      modelNumber: fallbackModel?.modelNumber ?? "",
      line: missingModelMatch[0],
      linesToOmit,
    };
  }

  if (fallbackModel) {
    return {
      modelNumber: fallbackModel.modelNumber,
      line: fallbackModel.omitLine ? fallbackModel.line : undefined,
      linesToOmit: fallbackModel.omitLine ? [fallbackModel.line] : [],
    };
  }

  return undefined;
}

function findModelCandidate(lines: string[]): { modelNumber: string; line: string; omitLine: boolean } | undefined {
  const searchableLines = lines.filter((line) => !singleUrlRegex.test(line));

  for (const line of searchableLines) {
    const labeledModel = extractLabeledModel(line);
    if (labeledModel) {
      return { modelNumber: labeledModel, line, omitLine: true };
    }
  }

  for (const line of searchableLines) {
    const standaloneModel = extractStandaloneModel(line);
    if (standaloneModel) {
      return { modelNumber: standaloneModel, line, omitLine: true };
    }
  }

  for (const line of searchableLines) {
    if (shouldSkipInlineModelSearch(line)) continue;

    const inlineModel = extractModelToken(line);
    if (inlineModel) {
      return { modelNumber: inlineModel, line, omitLine: false };
    }
  }

  return undefined;
}

function extractLabeledModel(line: string): string | undefined {
  const labelMatch = line.match(modelLabelRegex);
  if (!labelMatch || labelMatch.index === undefined) {
    return undefined;
  }

  return extractModelToken(line.slice(labelMatch.index + labelMatch[0].length));
}

function extractStandaloneModel(line: string): string | undefined {
  const normalizedLine = line.replace(/^\s*-\s*/, "").trim();
  const model = extractModelToken(normalizedLine);

  return model && normalizedLine.toUpperCase() === model ? model : undefined;
}

function extractModelToken(value: string): string | undefined {
  modelTokenRegex.lastIndex = 0;
  const match = modelTokenRegex.exec(value.toUpperCase());
  return match?.[0];
}

function shouldSkipInlineModelSearch(line: string): boolean {
  return (
    ticketLineRegex.test(line) ||
    isInternalNoteMarkerLine(line) ||
    isVerificationStatusLine(line) ||
    /\b\d+(?:\.\d+)?\s*(?:out of\s*)?5\s*stars?\b/i.test(line) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/i.test(line)
  );
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
  linesToOmit: string[],
  ratingOrStatus: string,
  reviewDateOrStatus: string,
): string {
  const urlSet = new Set(allUrls);
  const omittedLines = new Set(linesToOmit);
  const textLines = lines.filter((line) => {
    if (urlSet.has(stripTrailingPunctuation(line))) return false;
    if (ticketLineRegex.test(line)) return false;
    if (omittedLines.has(line)) return false;
    if (line === ratingOrStatus) return false;
    if (line === reviewDateOrStatus) return false;
    if (isInternalNoteMarkerLine(line)) return false;
    if (isVerificationStatusLine(line)) return false;
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

// Shorten Amazon's US marketplace status (e.g. "Reviewed in the United States
// on November 5, 2024") to a compact "Amazon @ US" platform label, keeping any
// review date. Only United States variants are shortened; other platforms and
// countries are left untouched. row.platform stays "Amazon" for bonus/verified
// logic — only the displayed contact-cell text changes.
function normalizeAmazonMarketplace(platform: string, dateOrStatus: string): { platformDisplay: string; dateOrStatus: string } {
  if (platform !== "Amazon" || !/\breviewed\s+in\s+the\s+(?:united\s+states|u\.?\s*s\.?(?:\s*a\.?)?)\b/i.test(dateOrStatus)) {
    return { platformDisplay: platform, dateOrStatus };
  }

  const reviewDate = dateOrStatus.match(
    /\bon\s+((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  );

  return { platformDisplay: "Amazon @ US", dateOrStatus: reviewDate ? reviewDate[1] : "" };
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
    return urls.some((url) => !isSupportTicketUrl(url) && detectReviewPlatform(url) !== "Unknown");
  });
}

function hasCustomerModelLine(lines: string[]): boolean {
  return lines.some((line) =>
    !singleUrlRegex.test(line) &&
    !ticketLineRegex.test(line) &&
    (/^(.+?)\s+-\s+([A-Za-z0-9][A-Za-z0-9._/-]*)$/.test(line) || /^(.+?)\s+-\s*$/.test(line)),
  );
}

function isTicketStart(line: string): boolean {
  return ticketLineRegex.test(line);
}

function isBlockStart(line: string): boolean {
  if (isTicketStart(line)) return true;
  const urls = line.match(urlRegex) ?? [];
  return urls.some((url) => isSupportTicketUrl(url) || detectReviewPlatform(url) !== "Unknown");
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[),.;]+$/g, "");
}

function comparePlatformCounts(
  left: { platform: string; count: number },
  right: { platform: string; count: number },
): number {
  const preferredOrder = ["Amazon", "Google", "Trustpilot", "Yelp", "Costco", "Costco US", "Costco.ca", "Home Depot", "Zoro", "Walmart", "iSpring Website", "PureDrop", "Lowe's", "Unknown"];
  const leftIndex = preferredOrder.indexOf(left.platform);
  const rightIndex = preferredOrder.indexOf(right.platform);

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? preferredOrder.length : leftIndex) - (rightIndex === -1 ? preferredOrder.length : rightIndex);
  }

  return left.platform.localeCompare(right.platform);
}
