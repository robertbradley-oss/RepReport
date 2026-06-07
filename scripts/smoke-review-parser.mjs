import { formatFlagsForClipboard } from "../src/lib/flagClipboard.ts";
import { DEFAULT_REVIEW_TABLE_DENSITY, REVIEW_TABLE_COLUMN_WIDTHS, REVIEW_TABLE_DENSITIES } from "../src/lib/reviewTableLayout.ts";
import { formatCustomerContactSummary, formatReplacementSummary, updateReviewRowCell } from "../src/lib/reviewRowDisplay.ts";
import { calculateBonus, calculateBonusSummary, parseReviewNotes } from "../src/lib/reviewParser.ts";
import {
  buildVisibleReviewRows,
  formatSourceNotesSummary,
  mergeVisibleReviewRowEdits,
  shouldCollapseSourceNotesAfterParse,
} from "../src/lib/reviewWorkspace.ts";
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
const flaggedVisibleRows = buildVisibleReviewRows(rows, true);
const allVisibleRows = buildVisibleReviewRows(rows, false);

assertEqual(rows.length, 10, "Review parser should return all 10 batch fixture rows.");
assertEqual(rows.reduce((sum, row) => sum + calculateBonus(row), 0), 165, "Batch review fixture bonus total changed.");
assertEqual(bonusSummary.totalReviews, 10, "Batch bonus summary should include total review count.");
assertEqual(bonusSummary.estimatedBonusTotal, 165, "Batch bonus summary should include estimated bonus total.");
assertEqual(platformCount("Amazon"), 3, "Batch bonus summary should count Amazon reviews.");
assertEqual(platformCount("Google"), 3, "Batch bonus summary should count Google reviews.");
assertEqual(platformCount("Trustpilot"), 2, "Batch bonus summary should count Trustpilot reviews.");
assertEqual(platformCount("Costco"), 1, "Batch bonus summary should count Costco reviews.");
assertEqual(platformCount("Unknown"), 1, "Batch bonus summary should count unknown-platform reviews.");
assertEqual(bonusSummary.verifiedAmazonCount, 2, "Batch bonus summary should count verified Amazon reviews.");
assertEqual(bonusSummary.unverifiedAmazonCount, 1, "Batch bonus summary should count unverified Amazon reviews.");
assertEqual(bonusSummary.photoReviewCount, 2, "Batch bonus summary should count photo reviews.");
assertEqual(bonusSummary.videoReviewCount, 0, "Batch bonus summary should count video reviews.");
assertEqual(
  REVIEW_COLUMNS.map((column) => column.label).join("|"),
  expectedReviewLabels.join("|"),
  "Review Log export column order changed.",
);
assertEqual(
  Object.values(REVIEW_TABLE_COLUMN_WIDTHS).reduce((total, width) => total + width, 0),
  100,
  "Review table column widths should fill the table exactly.",
);
assert(
  REVIEW_TABLE_COLUMN_WIDTHS.verifiedFiveStar >= 10,
  "Verified 5 star? should keep enough Review Log table width for the full header.",
);
assert(
  REVIEW_TABLE_COLUMN_WIDTHS.customerContactTicketLink > REVIEW_TABLE_COLUMN_WIDTHS.containsPictures &&
    REVIEW_TABLE_COLUMN_WIDTHS.replacementSent > REVIEW_TABLE_COLUMN_WIDTHS.containsVideo,
  "Review Log table should keep contact and replacement columns wider than photo/video columns.",
);
assert(
  REVIEW_TABLE_COLUMN_WIDTHS.containsVideo <= 6.5 && REVIEW_TABLE_COLUMN_WIDTHS.containsPictures <= 6.5,
  "Review Log table should keep photo/video columns narrow.",
);
assertEqual(DEFAULT_REVIEW_TABLE_DENSITY, "compact", "Review Log table should default to compact density.");
assertEqual(REVIEW_TABLE_DENSITIES.join("|"), "compact|comfortable", "Review Log table density options changed.");
assertEqual(allVisibleRows.length, rows.length, "Unfiltered Review Log display should include every parsed row.");
assertEqual(
  flaggedVisibleRows.length,
  rows.filter((row) => row.flags.length > 0).length,
  "Missing-model display should include only rows with model reminders.",
);
assert(flaggedVisibleRows.every(({ row }) => row.flags.length > 0), "Missing-model display should not include rows with models.");
assert(
  flaggedVisibleRows.length > 0 && flaggedVisibleRows.length < rows.length,
  "Batch fixture should cover both missing-model and model-present rows for filtering.",
);
assertEqual(shouldCollapseSourceNotesAfterParse(rows.length), true, "Source notes should collapse after a successful parse.");
assertEqual(shouldCollapseSourceNotesAfterParse(0), false, "Source notes should stay expanded when no rows parse.");
assertEqual(formatSourceNotesSummary(6), "Source notes - 6 parsed", "Collapsed source notes summary text changed.");

const editedFlaggedRows = flaggedVisibleRows.map(({ row }, visibleIndex) =>
  visibleIndex === 0
    ? {
        ...row,
        modelNumber: "EDITED-MODEL",
      }
    : row,
);
const mergedFlaggedEdits = mergeVisibleReviewRowEdits(rows, flaggedVisibleRows, editedFlaggedRows);
assertEqual(mergedFlaggedEdits.length, rows.length, "Editing a filtered missing-model row should preserve the full parsed dataset.");
assertEqual(
  mergedFlaggedEdits[flaggedVisibleRows[0].sourceIndex].modelNumber,
  "EDITED-MODEL",
  "Editing a filtered missing-model row should update the matching source row.",
);
const firstUnflaggedIndex = rows.findIndex((row) => row.flags.length === 0);
assert(firstUnflaggedIndex >= 0, "Batch fixture should include an unflagged row.");
assertEqual(
  mergedFlaggedEdits[firstUnflaggedIndex],
  rows[firstUnflaggedIndex],
  "Editing a filtered missing-model row should not clear or replace unfiltered rows.",
);
assertEqual(
  formatFlagsForClipboard([
    { rowNumber: 3, platform: "Trustpilot", message: "Model missing" },
  ]),
  "Row 3 - Model missing",
  "Copy model reminders clipboard format changed.",
);
assertEqual(formatFlagsForClipboard([]), "No model reminders.", "Copy model reminders empty-state text changed.");

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
assertEqual(verifiedAmazonRow.verifiedFiveStar, "Y", "Verified Amazon row should export Y for 5 star.");
assertEqual(verifiedAmazonRow.amazonVerifiedPurchase, true, "Amazon row with Verified wording should be a verified purchase.");
assertEqual(verifiedAmazonRow.containsPictures, "N", "Amazon verified row without ***PHOTO*** should not mark pictures.");
assertEqual(calculateBonus(verifiedAmazonRow), 25, "Verified Amazon without photo should be worth $25.");
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
assertEqual(unverifiedAmazonRow.verifiedFiveStar, "Y", "Every parsed review defaults to 5 star Y, even unverified Amazon.");
assertEqual(unverifiedAmazonRow.amazonVerifiedPurchase, false, "Amazon row without Verified wording should remain an unverified purchase.");
assertEqual(unverifiedAmazonRow.containsPictures, "N", "Amazon unverified row without ***PHOTO*** should not mark pictures.");
assertEqual(calculateBonus(unverifiedAmazonRow), 15, "Unverified Amazon without photo should be worth $15.");
assertEqual(unverifiedAmazonRow.replacementSent, "", "Unverified Amazon Replacement sent column should stay blank.");

const amazonPhotoRow = rowByTicket("100003");
assertEqual(amazonPhotoRow.platform, "Amazon", "Amazon photo row should be Amazon.");
assertEqual(amazonPhotoRow.verifiedFiveStar, "Y", "Amazon photo row with Verified Purchase should export Y.");
assertEqual(amazonPhotoRow.containsPictures, "Y", "***PHOTO*** should set Contains pictures? to Y for Amazon.");
assertEqual(calculateBonus(amazonPhotoRow), 30, "Verified Amazon with photo should be worth $30.");
assertEqual(amazonPhotoRow.containsVideo, "N", "Contains video? should default to N.");

const googleRow = rowByTicket("100004");
assertEqual(googleRow.platform, "Google", "Google row should detect Google platform.");
assertEqual(googleRow.verifiedFiveStar, "Y", "Google row should export verified Y.");
assertEqual(googleRow.ratingOrStatus, "5 out of 5 stars", "Google row without rating should default to 5 out of 5 stars.");
assertEqual(googleRow.containsPictures, "N", "Google row without ***PHOTO*** should not mark pictures.");
assertEqual(calculateBonus(googleRow), 10, "Google without photo should be worth $10.");
assert(googleRow.replacementSent.includes("Great customer service"), "Google Replacement sent should contain the review text.");
assertFlags(googleRow, [], "Clean Google row should not generate model reminders.");
assertEqual(
  formatCustomerContactSummary(googleRow),
  "Ticket #100004 - Dylan Google - Google - 6/1/26",
  "Customer contact collapsed summary should use ticket, customer, platform, and date.",
);
assertEqual(
  formatReplacementSummary(googleRow),
  "Great customer service and the replacement filter works well.",
  "Replacement collapsed summary should use compact review text.",
);

const longReplacementPreview = formatReplacementSummary({
  ...googleRow,
  replacementSent: "We purchased a 5 stage under the sink RO filter.\nRobert helped us identify the right replacement cartridge and sent clear steps.",
});
assertEqual(
  longReplacementPreview,
  "We purchased a 5 stage under the sink RO filter. Robert helped us identify the...",
  "Replacement collapsed summary should flatten and trim long multiline text.",
);

const editedFromExpandedRow = updateReviewRowCell(googleRow, "replacementSent", "Expanded row edit\nkeeps full text.");
assertEqual(
  editedFromExpandedRow.replacementSent,
  "Expanded row edit\nkeeps full text.",
  "Expanded row text edits should update the row value without summarizing it.",
);
assertEqual(updateReviewRowCell(googleRow, "containsPictures", "yes").containsPictures, "N", "Yes/no edits should normalize non-Y values to N.");
assertEqual(updateReviewRowCell(googleRow, "containsPictures", " y ").containsPictures, "Y", "Yes/no edits should normalize Y values.");

const googlePhotoRow = rowByTicket("100005");
assertEqual(googlePhotoRow.platform, "Google", "Google photo row should detect Google platform.");
assertEqual(googlePhotoRow.containsPictures, "Y", "***PHOTO*** should set Contains pictures? to Y for Google.");
assertEqual(googlePhotoRow.verifiedFiveStar, "Y", "Google photo row should export verified Y.");
assertEqual(calculateBonus(googlePhotoRow), 20, "Google with photo should be worth $20.");
assert(googlePhotoRow.replacementSent.includes("Robert walked me"), "Google photo Replacement sent should contain review text.");
assert(!googlePhotoRow.replacementSent.includes("***PHOTO***"), "Google photo Replacement sent should not include the internal photo marker.");
assert(!googlePhotoRow.customerContactTicketLink.includes("***PHOTO***"), "Google photo customer contact cell should not include the internal photo marker.");
assert(!googlePhotoRow.reviewText.includes("***PHOTO***"), "Google photo review text should not include the internal photo marker.");

const photoMarkerVariantRows = parseReviewNotes([
  "Ticket #238340",
  "https://support.ispringfilter.com/scp/tickets.php?id=238340",
  "https://www.google.com/maps/reviews/google-double-star-photo",
  "6/5/26",
  "**PHOTO**",
  "Robert helped us finish setup, and the normal sentence can mention photos without being removed.",
  "Nora Doublestar - RCC7",
  "",
  "Ticket #238341",
  "https://support.ispringfilter.com/scp/tickets.php?id=238341",
  "https://www.google.com/maps/reviews/google-standalone-photo",
  "6/5/26",
  "PHOTO",
  "The filter is working well after support helped with the cartridge.",
  "Owen Standalone - WGB32B",
].join("\n"));
assertEqual(photoMarkerVariantRows.length, 2, "Photo marker variant fixture should parse into two rows.");
assertEqual(photoMarkerVariantRows[0].containsPictures, "Y", "**PHOTO** should set Contains pictures? to Y.");
assertEqual(photoMarkerVariantRows[1].containsPictures, "Y", "Standalone PHOTO marker line should set Contains pictures? to Y.");
assert(!photoMarkerVariantRows[0].replacementSent.includes("**PHOTO**"), "**PHOTO** marker should not stay in Replacement sent.");
assert(!photoMarkerVariantRows[1].replacementSent.split(/\r?\n/).some((line) => line.trim() === "PHOTO"), "Standalone PHOTO marker should not stay in Replacement sent.");
assert(
  photoMarkerVariantRows[0].replacementSent.includes("normal sentence can mention photos"),
  "Normal review text that mentions photos should not be removed.",
);

const normalPhotoSentenceRows = parseReviewNotes([
  "Ticket #238342",
  "https://support.ispringfilter.com/scp/tickets.php?id=238342",
  "https://www.google.com/maps/reviews/google-photo-word-only",
  "6/5/26",
  "I sent photos to support and they helped me identify the correct replacement.",
  "Paula Photoword - F5-75",
].join("\n"));
assertEqual(normalPhotoSentenceRows.length, 1, "Photo word sentence fixture should parse into one row.");
assertEqual(normalPhotoSentenceRows[0].containsPictures, "N", "A normal sentence mentioning photos should not set Contains pictures? to Y.");
assert(
  normalPhotoSentenceRows[0].replacementSent.includes("I sent photos to support"),
  "A normal sentence mentioning photos should remain in Replacement sent.",
);

const trustpilotRow = rowByTicket("100006");
assertEqual(trustpilotRow.platform, "Trustpilot", "Trustpilot row should detect Trustpilot platform.");
assertEqual(trustpilotRow.verifiedFiveStar, "Y", "Trustpilot row should export verified Y.");
assertEqual(trustpilotRow.containsPictures, "N", "Trustpilot row without ***PHOTO*** should not mark pictures.");
assertEqual(calculateBonus(trustpilotRow), 15, "Trustpilot should be worth $15.");
assert(trustpilotRow.replacementSent.includes("Fast support"), "Trustpilot Replacement sent should contain the review text.");
assertFlags(trustpilotRow, [], "Clean Trustpilot row should not generate model reminders.");

const costcoRow = rowByTicket("100007");
assertEqual(costcoRow.platform, "Costco", "Costco row should detect Costco platform.");
assertEqual(costcoRow.verifiedFiveStar, "Y", "Costco row should export verified Y.");
assertEqual(calculateBonus(costcoRow), 25, "Costco should be worth $25.");
assert(costcoRow.replacementSent.includes("Good product"), "Costco Replacement sent should contain the review text.");
assertFlags(costcoRow, [], "Clean Costco row should not generate model reminders.");

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

// Inline model editing: while typing (value-only update, no flag recompute) the
// row must keep its Model missing flag so it stays visible under the filter; only
// the committed edit (updateReviewRowCell) clears the flag and drops it.
const modelTypingRow = { ...missingModelRow, modelNumber: "R" };
assert(modelTypingRow.flags.includes("Model missing"), "Typing a model should not clear the flag before commit.");
assertEqual(buildVisibleReviewRows([modelTypingRow], true).length, 1, "Missing-model row should stay visible while the model is being typed.");
const modelCommittedRow = updateReviewRowCell(missingModelRow, "modelNumber", "RCC7AK");
assertEqual(modelCommittedRow.modelNumber, "RCC7AK", "Committed model edit should store the full model value.");
assert(!modelCommittedRow.flags.includes("Model missing"), "Committing a model should clear the Model missing flag.");
assertEqual(buildVisibleReviewRows([modelCommittedRow], true).length, 0, "Committed model row should leave the missing-model filter.");

const missingLinkRow = rowByTicket("100010");
assertEqual(missingLinkRow.platform, "Unknown", "Missing review link row should have Unknown platform.");
assertEqual(missingLinkRow.reviewLink, "", "Missing review link row should export a blank review link.");
assertFlags(missingLinkRow, [], "Missing review link row should not generate model reminders when the model is present.");

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
assertFlags(unknownPlatformRows[0], [], "Unknown platform row should not generate model reminders when the model is present.");

const bonusRuleRows = parseReviewNotes([
  "Ticket #100014",
  "https://support.ispringfilter.com/scp/tickets.php?id=100014",
  "https://www.amazon.com/review/amazon-unverified-photo",
  "5 out of 5 stars",
  "***PHOTO***",
  "The system works well and support answered my question.",
  "Una Amazonphoto - RCC7AK",
  "",
  "Ticket #100015",
  "https://support.ispringfilter.com/scp/tickets.php?id=100015",
  "https://www.costco.ca/reviews/costco-ca-basic",
  "Jun 5, 2026",
  "5 stars",
  "Support helped with setup.",
  "Cal CostcoCa - RO500",
  "",
  "Ticket #100016",
  "https://support.ispringfilter.com/scp/tickets.php?id=100016",
  "https://www.homedepot.ca/product/reviews/home-depot-ca-basic",
  "Jun 5, 2026",
  "5 stars",
  "Clear setup help and good product.",
  "Holly Depotca - HDCA123",
  "",
  "Ticket #100017",
  "https://support.ispringfilter.com/scp/tickets.php?id=100017",
  "https://www.zoro.com/reviews/zoro-basic",
  "Jun 5, 2026",
  "5 stars",
  "The replacement arrived and support followed up.",
  "Zane Zoro - ZR123",
  "",
  "Ticket #100018",
  "https://support.ispringfilter.com/scp/tickets.php?id=100018",
  "https://www.ispringfilter.com/pages/reviews",
  "Jun 5, 2026",
  "5 stars",
  "Website review after support helped finish installation.",
  "Wendy Website - RCC7",
].join("\n"));
assertEqual(bonusRuleRows.length, 5, "New bonus-rule platform fixture should parse every row.");
assertEqual(bonusRuleRows[0].platform, "Amazon", "Amazon unverified photo fixture should detect Amazon.");
assertEqual(bonusRuleRows[0].verifiedFiveStar, "Y", "Amazon unverified photo fixture should still export 5 star Y.");
assertEqual(bonusRuleRows[0].amazonVerifiedPurchase, false, "Amazon unverified photo fixture should stay an unverified purchase.");
assertEqual(bonusRuleRows[0].containsPictures, "Y", "Amazon unverified photo fixture should use the internal photo marker.");
assertEqual(calculateBonus(bonusRuleRows[0]), 20, "Unverified Amazon with photo should be worth $20.");
assertEqual(bonusRuleRows[1].platform, "Costco", "Costco.ca should detect as Costco.");
assertEqual(calculateBonus(bonusRuleRows[1]), 25, "Costco.ca should be worth $25.");
assertEqual(bonusRuleRows[2].platform, "Home Depot", "Home Depot Canada should detect as Home Depot.");
assertEqual(calculateBonus(bonusRuleRows[2]), 25, "Home Depot Canada should be worth $25.");
assertEqual(bonusRuleRows[3].platform, "Zoro", "Zoro should be detected.");
assertEqual(calculateBonus(bonusRuleRows[3]), 25, "Zoro should be worth $25.");
assertEqual(bonusRuleRows[4].platform, "iSpring Website", "iSpring website reviews should be detected.");
assertEqual(calculateBonus(bonusRuleRows[4]), 25, "iSpring website reviews should be worth $25.");

const amazonMarketplaceRows = parseReviewNotes([
  "Ticket #237789",
  "https://support.ispringfilter.com/scp/tickets.php?id=237789",
  "https://www.amazon.com/review/amazon-us-marketplace",
  "Verified Purchase",
  "5 out of 5 stars",
  "Reviewed in the United States on November 5, 2024",
  "Robert was very helpful and the filter works great.",
  "Ronak Shah - RCC7AK",
].join("\n"));
assertEqual(amazonMarketplaceRows.length, 1, "Amazon US marketplace fixture should parse into one row.");
const amazonUsRow = amazonMarketplaceRows[0];
assertEqual(amazonUsRow.platform, "Amazon", "Amazon US row should keep Amazon platform for logic.");
assertEqual(amazonUsRow.verifiedFiveStar, "Y", "Amazon US verified purchase should still export Y.");
assertEqual(calculateBonus(amazonUsRow), 25, "Verified Amazon (no photo) should still be worth $25.");
assert(
  amazonUsRow.customerContactTicketLink.includes("Amazon @ US"),
  "Amazon US marketplace text should shorten to 'Amazon @ US' in the contact cell.",
);
assert(
  !amazonUsRow.customerContactTicketLink.includes("Reviewed in the United States"),
  "Long Amazon marketplace phrase should not remain in the contact cell.",
);
assert(!amazonUsRow.reviewText.includes("Reviewed in the United States"), "Marketplace phrase should not leak into review text.");
assertEqual(
  formatCustomerContactSummary(amazonUsRow),
  "Ticket #237789 - Ronak Shah - Amazon @ US - November 5, 2024",
  "Collapsed contact summary should show the shortened Amazon @ US marketplace text.",
);

const amazonNonUsRow = parseReviewNotes([
  "Ticket #237790",
  "https://support.ispringfilter.com/scp/tickets.php?id=237790",
  "https://www.amazon.com/review/amazon-uk-marketplace",
  "Verified Purchase",
  "5 out of 5 stars",
  "Reviewed in the United Kingdom on November 6, 2024",
  "Great product.",
  "Olivia Brown - RO500",
].join("\n"))[0];
assert(
  !amazonNonUsRow.customerContactTicketLink.includes("Amazon @ US"),
  "Non-US Amazon marketplace reviews should not be relabeled as Amazon @ US.",
);

const homeDepotBonusRows = parseReviewNotes([
  "Ticket #100011",
  "https://support.ispringfilter.com/scp/tickets.php?id=100011",
  "https://www.homedepot.com/p/reviews/home-depot-basic",
  "Jun 5, 2026",
  "5 stars",
  "Helpful support and clear setup advice.",
  "Hank Depot - HD123",
].join("\n"));
assertEqual(homeDepotBonusRows.length, 1, "Home Depot review should still parse.");
assertEqual(homeDepotBonusRows[0].platform, "Home Depot", "Home Depot platform should be detected.");
assertEqual(calculateBonus(homeDepotBonusRows[0]), 25, "Home Depot reviews should use the confirmed $25 bonus.");
assert(
  !homeDepotBonusRows[0].flags.includes("Bonus rule unclear"),
  "Home Depot reviews should not flag unclear bonus after the confirmed rule.",
);
assertFlags(homeDepotBonusRows[0], [], "Clean Home Depot row should not generate model reminders.");

const lowesBonusRows = parseReviewNotes([
  "Ticket #100013",
  "https://support.ispringfilter.com/scp/tickets.php?id=100013",
  "https://www.lowes.com/reviews/lowes-basic",
  "Jun 5, 2026",
  "5 stars",
  "Support helped with setup and the replacement works.",
  "Lena Lowes - LW123",
].join("\n"));
assertEqual(lowesBonusRows.length, 1, "Lowe's review should still parse.");
assertEqual(lowesBonusRows[0].platform, "Lowe's", "Lowe's platform should be detected.");
assertEqual(calculateBonus(lowesBonusRows[0]), 25, "Lowe's reviews should use the confirmed $25 bonus.");
assert(
  !lowesBonusRows[0].flags.includes("Bonus rule unclear"),
  "Lowe's reviews should not flag unclear bonus after the confirmed rule.",
);
assertFlags(lowesBonusRows[0], [], "Clean Lowe's row should not generate model reminders.");

const ticketMismatchRows = parseReviewNotes([
  "Ticket #238336",
  "https://support.ispringfilter.com/scp/tickets.php?id=238337",
  "https://www.google.com/maps/reviews/google-mismatch",
  "6/5/26",
  "Support helped us finish setup quickly.",
  "Connor Zitzmann - RCC7",
].join("\n"));
assertEqual(ticketMismatchRows.length, 1, "Ticket mismatch fixture should parse into one row.");
assertFlags(ticketMismatchRows[0], [], "Ticket number/support URL mismatch should not generate model reminders when the model is present.");

const malformedUrlRows = parseReviewNotes([
  "Ticket #238338",
  "https:/support.ispringfilter.com/scp/tickets.php?id=238338",
  "https://www.google.com/maps/reviews/google-malformed-ticket",
  "6/5/26",
  "Robert helped with the setup.",
  "Maya Malformed - RCC7",
].join("\n"));
assertEqual(malformedUrlRows.length, 1, "Malformed URL fixture should parse into one row.");
assertFlags(malformedUrlRows[0], [], "Malformed URL should not generate model reminders when the model is present.");

const ratingUnclearRows = parseReviewNotes([
  "Ticket #238339",
  "https://support.ispringfilter.com/scp/tickets.php?id=238339",
  "https://www.trustpilot.com/reviews/trustpilot-no-rating",
  "Jun 5, 2026",
  "Helpful support and clear setup advice.",
  "Riley Norating - PH100",
].join("\n"));
assertEqual(ratingUnclearRows.length, 1, "Rating-unclear fixture should parse into one row.");
assertEqual(ratingUnclearRows[0].ratingOrStatus, "", "Rating-unclear fixture should keep a blank rating/status output.");
assertEqual(ratingUnclearRows[0].verifiedFiveStar, "Y", "A missing/unclear rating should still default to 5 star Y.");
assertFlags(ratingUnclearRows[0], [], "Rating unclear should not generate model reminders when the model is present.");

// Every parsed review defaults to 5-star Y regardless of how the rating text is
// formatted (missing entirely, or glued to the review on an Amazon row).
const noRatingTextRow = parseReviewNotes([
  "Ticket #100020",
  "https://support.ispringfilter.com/scp/tickets.php?id=100020",
  "https://www.google.com/maps/reviews/google-no-rating-text",
  "Jun 5, 2026",
  "Support sorted out my install quickly.",
  "Nina Norating - RCC7AK",
].join("\n"))[0];
assertEqual(noRatingTextRow.verifiedFiveStar, "Y", "Google row with no rating text should default to 5 star Y.");
assertFlags(noRatingTextRow, [], "Missing rating text should not flag a row.");

const gluedAmazonRatingRow = parseReviewNotes([
  "Ticket #100021",
  "https://support.ispringfilter.com/scp/tickets.php?id=100021",
  "https://www.amazon.com/review/amazon-glued-rating",
  "5 out of 5 starsGreat product and fast help.",
  "Gary Glued - WGB32B",
].join("\n"))[0];
assertEqual(gluedAmazonRatingRow.platform, "Amazon", "Glued-rating fixture should still detect Amazon.");
assertEqual(gluedAmazonRatingRow.verifiedFiveStar, "Y", "Glued Amazon rating text should still default to 5 star Y.");
assertEqual(gluedAmazonRatingRow.amazonVerifiedPurchase, false, "Amazon row without Verified wording stays unverified purchase.");
assertEqual(calculateBonus(gluedAmazonRatingRow), 15, "Unverified Amazon (no photo) should still be worth $15.");

const actualIssueRows = [
  googleRow,
  trustpilotRow,
  homeDepotBonusRows[0],
  lowesBonusRows[0],
  missingModelRow,
  missingLinkRow,
  unknownPlatformRows[0],
  ticketMismatchRows[0],
  ratingUnclearRows[0],
];
const actualIssueVisibleRows = buildVisibleReviewRows(actualIssueRows, true);
assertEqual(actualIssueVisibleRows.length, 1, "Missing model only should include only rows without model numbers.");
assert(
  actualIssueVisibleRows.every(({ row }) => row.flags.length > 0),
  "Missing model only should not include rows with model numbers.",
);
assertEqual(
  actualIssueVisibleRows.map(({ row }) => row.customerName ?? row.ticketNumber ?? row.platform).join("|"),
  "Ivy Missingmodel",
  "Missing model only should identify the expected reminder rows.",
);

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

function assertFlags(row, expectedFlags, message) {
  assertEqual(row.flags.join("|"), expectedFlags.join("|"), message);
}
