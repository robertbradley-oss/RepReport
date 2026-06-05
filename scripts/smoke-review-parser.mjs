import { calculateBonus, calculateBonusSummary, parseReviewNotes } from "../src/lib/reviewParser.ts";
import { REVIEW_COLUMNS } from "../src/types.ts";
import { readFileSync } from "node:fs";

const expectedReviewLabels = [
  "Ticket Link",
  "Link to review",
  "Model Number",
  "Verified 5 star?",
  "Contains video?",
  "Contains pictures?",
  "Customer contact/Ticket link",
  "Replacement sent",
];

const reviewNotes = readFileSync(new URL("./fixtures/batch-review-notes.txt", import.meta.url), "utf8");

const rows = parseReviewNotes(reviewNotes);
const bonusSummary = calculateBonusSummary(rows);

assertEqual(rows.length, 10, "Review parser should return all 10 batch fixture rows.");
assertEqual(rows.reduce((sum, row) => sum + calculateBonus(row), 0), 145, "Batch review fixture bonus total changed.");
assertEqual(bonusSummary.totalReviews, 10, "Batch bonus summary should include total review count.");
assertEqual(bonusSummary.estimatedBonusTotal, 145, "Batch bonus summary should include estimated bonus total.");
assertEqual(platformCount("Amazon"), 3, "Batch bonus summary should count Amazon reviews.");
assertEqual(platformCount("Google"), 3, "Batch bonus summary should count Google reviews.");
assertEqual(platformCount("Trustpilot"), 2, "Batch bonus summary should count Trustpilot reviews.");
assertEqual(platformCount("Costco"), 1, "Batch bonus summary should count Costco reviews.");
assertEqual(platformCount("Unknown"), 1, "Batch bonus summary should count unknown-platform reviews.");
assertEqual(bonusSummary.verifiedAmazonCount, 2, "Batch bonus summary should count verified Amazon reviews.");
assertEqual(bonusSummary.unverifiedAmazonCount, 1, "Batch bonus summary should count unverified Amazon reviews.");
assertEqual(bonusSummary.photoReviewCount, 2, "Batch bonus summary should count photo reviews.");
assertEqual(
  REVIEW_COLUMNS.map((column) => column.label).join("|"),
  expectedReviewLabels.join("|"),
  "Review Log export column order changed.",
);

for (const [index, row] of rows.entries()) {
  for (const column of REVIEW_COLUMNS) {
    assert(column.key in row, `Row ${index + 1} is missing export field ${column.key}.`);
  }
}

for (const [index, row] of rows.entries()) {
  assertEqual(REVIEW_COLUMNS.map((column) => row[column.key]).length, 8, `Export row ${index + 1} should contain 8 mapped columns.`);
}

const verifiedAmazonRow = rowByTicket("100001");
assertEqual(verifiedAmazonRow.platform, "Amazon", "Verified Amazon row should be Amazon.");
assertEqual(verifiedAmazonRow.verifiedFiveStar, "Y", "Verified Amazon row should export Y.");
assertEqual(verifiedAmazonRow.containsPictures, "N", "Amazon verified row without ***PHOTO*** should not mark pictures.");
assertEqual(verifiedAmazonRow.replacementSent, "", "Amazon Replacement sent column should stay blank.");
assertEqual(
  verifiedAmazonRow.customerContactTicketLink,
  [
    "Ticket #100001",
    "Alice Verified",
    "Amazon",
    "5 out of 5 stars",
    "Review mentions name",
  ].join("\n"),
  "Ticketed customer contact cell should include ticket, customer, platform, rating, and mention status.",
);

const unverifiedAmazonRow = rowByTicket("100002");
assertEqual(unverifiedAmazonRow.platform, "Amazon", "Unverified Amazon row should be Amazon.");
assertEqual(unverifiedAmazonRow.verifiedFiveStar, "N", "Amazon row without verified wording should export N.");
assertEqual(unverifiedAmazonRow.containsPictures, "N", "Amazon unverified row without ***PHOTO*** should not mark pictures.");
assertEqual(unverifiedAmazonRow.replacementSent, "", "Unverified Amazon Replacement sent column should stay blank.");

const amazonPhotoRow = rowByTicket("100003");
assertEqual(amazonPhotoRow.platform, "Amazon", "Amazon photo row should be Amazon.");
assertEqual(amazonPhotoRow.verifiedFiveStar, "Y", "Amazon photo row with Verified Purchase should export Y.");
assertEqual(amazonPhotoRow.containsPictures, "Y", "***PHOTO*** should set Contains pictures? to Y for Amazon.");
assertEqual(amazonPhotoRow.containsVideo, "N", "Contains video? should default to N.");

const googleRow = rowByTicket("100004");
assertEqual(googleRow.platform, "Google", "Google row should detect Google platform.");
assertEqual(googleRow.verifiedFiveStar, "Y", "Google row should export verified Y.");
assertEqual(googleRow.ratingOrStatus, "5 out of 5 stars", "Google row without rating should default to 5 out of 5 stars.");
assertEqual(googleRow.containsPictures, "N", "Google row without ***PHOTO*** should not mark pictures.");
assert(googleRow.replacementSent.includes("Great customer service"), "Google Replacement sent should contain the review text.");

const googlePhotoRow = rowByTicket("100005");
assertEqual(googlePhotoRow.platform, "Google", "Google photo row should detect Google platform.");
assertEqual(googlePhotoRow.containsPictures, "Y", "***PHOTO*** should set Contains pictures? to Y for Google.");
assertEqual(googlePhotoRow.verifiedFiveStar, "Y", "Google photo row should export verified Y.");
assert(googlePhotoRow.replacementSent.includes("Robert walked me"), "Google photo Replacement sent should contain review text.");

const trustpilotRow = rowByTicket("100006");
assertEqual(trustpilotRow.platform, "Trustpilot", "Trustpilot row should detect Trustpilot platform.");
assertEqual(trustpilotRow.verifiedFiveStar, "Y", "Trustpilot row should export verified Y.");
assertEqual(trustpilotRow.containsPictures, "N", "Trustpilot row without ***PHOTO*** should not mark pictures.");
assert(trustpilotRow.replacementSent.includes("Fast support"), "Trustpilot Replacement sent should contain the review text.");

const costcoRow = rowByTicket("100007");
assertEqual(costcoRow.platform, "Costco", "Costco row should detect Costco platform.");
assertEqual(costcoRow.verifiedFiveStar, "Y", "Costco row should export verified Y.");
assert(costcoRow.replacementSent.includes("Good product"), "Costco Replacement sent should contain the review text.");

const noTicketRow = rows.find((row) => row.customerName === "Henry Noticket");
assert(noTicketRow, "No-ticket review should parse into a row.");
assertEqual(noTicketRow.ticketNumber, undefined, "No-ticket row should not get a ticket number.");
assertEqual(noTicketRow.ticketLink, "", "No-ticket row should not get a ticket link.");
assert(!noTicketRow.customerContactTicketLink.includes("Ticket #"), "No-ticket row should not include a blank Ticket # line.");
assertEqual(
  noTicketRow.customerContactTicketLink,
  [
    "Henry Noticket",
    "Google",
    "6/5/26",
    "5 out of 5 stars",
    "Review mentions name",
  ].join("\n"),
  "No-ticket customer contact cell should start with customer name.",
);

const missingModelRow = rowByTicket("100009");
assertEqual(missingModelRow.platform, "Trustpilot", "Missing-model row should still detect platform.");
assertEqual(missingModelRow.customerName, "Ivy Missingmodel", "Missing-model row should still parse customer name.");
assertEqual(missingModelRow.modelNumber, "", "Missing-model row should export a blank model.");
assert(missingModelRow.flags.includes("Model missing"), "Missing-model row should generate Model missing flag.");

const missingLinkRow = rowByTicket("100010");
assertEqual(missingLinkRow.platform, "Unknown", "Missing review link row should have Unknown platform.");
assertEqual(missingLinkRow.reviewLink, "", "Missing review link row should export a blank review link.");
assert(missingLinkRow.flags.includes("Platform unclear"), "Missing review link row should flag unclear platform.");
assert(missingLinkRow.flags.includes("Review link missing"), "Missing review link row should flag missing review link.");

const unknownPlatformRows = parseReviewNotes([
  "Ticket #100012",
  "https://support.ispringfilter.com/scp/tickets.php?id=100012",
  "https://reviews.example.com/post/unknown-platform",
  "Jun 5, 2026",
  "5 stars",
  "Support followed up and the system works again.",
  "Uma Unknown - RCC7",
].join("\n"));
assertEqual(unknownPlatformRows.length, 1, "Unknown platform review URL should still parse into one row.");
assertEqual(unknownPlatformRows[0].platform, "Unknown", "Unknown platform review URL should keep Unknown platform.");
assertEqual(
  unknownPlatformRows[0].reviewLink,
  "https://reviews.example.com/post/unknown-platform",
  "Unknown platform review URL should stay in Link to review for manual fixing.",
);
assert(unknownPlatformRows[0].flags.includes("Platform unclear"), "Unknown platform review URL should still flag unclear platform.");
assert(
  !unknownPlatformRows[0].flags.includes("Review link missing"),
  "Unknown platform review URL should not be flagged as a missing review link.",
);

const unclearBonusRows = parseReviewNotes([
  "Ticket #100011",
  "https://support.ispringfilter.com/scp/tickets.php?id=100011",
  "https://www.homedepot.com/p/reviews/home-depot-basic",
  "Jun 5, 2026",
  "5 stars",
  "Helpful support and clear setup advice.",
  "Hank Depot - HD123",
].join("\n"));
assertEqual(unclearBonusRows.length, 1, "Known platform without a bonus rule should still parse.");
assertEqual(unclearBonusRows[0].platform, "Home Depot", "Home Depot platform should be detected.");
assertEqual(calculateBonus(unclearBonusRows[0]), 0, "Unclear bonus rule should not guess a dollar value.");
assert(unclearBonusRows[0].flags.includes("Bonus rule unclear"), "Known platform without a bonus rule should be flagged.");

console.log("smoke:review passed");

function platformCount(platform) {
  return bonusSummary.platformCounts.find((entry) => entry.platform === platform)?.count ?? 0;
}

function rowByTicket(ticketNumber) {
  const row = rows.find((candidate) => candidate.ticketNumber === ticketNumber);
  assert(row, `Expected row for ticket ${ticketNumber}.`);
  return row;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${String(expected)}\nActual: ${String(actual)}`);
  }
}
