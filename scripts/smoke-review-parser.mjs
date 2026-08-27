import { formatFlagsForClipboard } from "../src/lib/flagClipboard.ts";
import { DEFAULT_REVIEW_TABLE_DENSITY, REVIEW_TABLE_COLUMN_WIDTHS, REVIEW_TABLE_DENSITIES } from "../src/lib/reviewTableLayout.ts";
import { formatCustomerContactSummary, formatReplacementSummary, updateReviewRowCell } from "../src/lib/reviewRowDisplay.ts";
import { calculateBonus, calculateBonusSummary, parseReviewNotes } from "../src/lib/reviewParser.ts";
import { buildReviewExportPackage } from "../src/lib/exportPackage.ts";
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

assertEqual(rows.length, 11, "Review parser should return all 11 batch fixture rows.");
assertEqual(rows.reduce((sum, row) => sum + calculateBonus(row), 0), 180, "Batch review fixture bonus total changed.");
assertEqual(bonusSummary.totalReviews, 11, "Batch bonus summary should include total review count.");
assertEqual(bonusSummary.estimatedBonusTotal, 180, "Batch bonus summary should include estimated bonus total.");
assertEqual(platformCount("Amazon"), 3, "Batch bonus summary should count Amazon reviews.");
assertEqual(platformCount("Google"), 3, "Batch bonus summary should count Google reviews.");
assertEqual(platformCount("Trustpilot"), 2, "Batch bonus summary should count Trustpilot reviews.");
assertEqual(platformCount("Costco US"), 1, "Batch bonus summary should count Costco US reviews.");
assertEqual(platformCount("PureDrop"), 1, "Batch bonus summary should count PureDrop reviews.");
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

const approvedNameExamples = [
  ["Robert", "Robert was helpful"],
  ["John", "John was helpful"],
  ["Jonathan", "Jonathan was helpful"],
  ["Jon", "Thanks Jon!"],
  ["Sean", "Sean was great"],
  ["Shawn", "Shawn helped me"],
  ["Matt", "Matt was helpful"],
  ["Nick", "Nick was helpful"],
  ["Nicholas", "Nicholas was helpful"],
  ["Nicolas", "Nicolas was helpful"],
  ["Nikolas", "Nikolas was helpful"],
  ["Nickolas", "Nickolas was helpful"],
];
for (const [index, [approvedName, reviewText]] of approvedNameExamples.entries()) {
  const row = parseNameMentionExample(reviewText, 101000 + index);
  assertEqual(
    row.customerContactTicketLink.split("\n").at(-1),
    "Review mentions name",
    `${approvedName} should be detected as an approved complete name.`,
  );
}

assertEqual(
  parseNameMentionExample("ROBERT was helpful", 101020).customerContactTicketLink.split("\n").at(-1),
  "Review mentions name",
  "Approved-name detection should be case-insensitive.",
);
assertEqual(
  parseNameMentionExample("Johnson helped me", 101021).customerContactTicketLink.split("\n").at(-1),
  "Review does not mention name",
  "John should not partially match Johnson.",
);
assertEqual(
  parseNameMentionExample("Matthew helped me", 101022).customerContactTicketLink.split("\n").at(-1),
  "Review does not mention name",
  "Matt should not partially match Matthew.",
);
assertEqual(
  parseNameMentionExample("", 101023).customerContactTicketLink.split("\n").at(-1),
  "Review does not mention name",
  "Blank review text should report that no approved name was mentioned.",
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
assertEqual(verifiedAmazonRow.verifiedFiveStar, "Y", "Verified Amazon row should export Y for verified status.");
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
assertEqual(unverifiedAmazonRow.verifiedFiveStar, "N", "Amazon row without Verified wording should export verified N.");
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
assertEqual(googleRow.verifiedFiveStar, "N", "Google row without verified wording should export verified N.");
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
assertEqual(googlePhotoRow.verifiedFiveStar, "N", "Google photo row without verified wording should export verified N.");
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
assertEqual(trustpilotRow.verifiedFiveStar, "N", "Trustpilot row without verified wording should export verified N.");
assertEqual(trustpilotRow.containsPictures, "N", "Trustpilot row without ***PHOTO*** should not mark pictures.");
assertEqual(calculateBonus(trustpilotRow), 10, "Trustpilot should be worth $10.");
assert(trustpilotRow.replacementSent.includes("Fast support"), "Trustpilot Replacement sent should contain the review text.");
assertFlags(trustpilotRow, [], "Clean Trustpilot row should not generate model reminders.");

const costcoRow = rowByTicket("100007");
assertEqual(costcoRow.platform, "Costco US", "Costco.com row should detect Costco US platform.");
assertEqual(costcoRow.verifiedFiveStar, "N", "Costco US row without verified wording should export verified N.");
assertEqual(calculateBonus(costcoRow), 25, "Costco US should be worth $25.");
assertEqual(calculateBonus({ ...costcoRow, platform: "Costco" }), 25, "Legacy Costco rows should remain worth $25.");
assertEqual(
  calculateBonus({ ...costcoRow, platform: "Costco", containsPictures: "Y", containsVideo: "Y" }),
  40,
  "Legacy Costco US rows should receive stacking photo and video bonuses.",
);
assert(costcoRow.replacementSent.includes("Good product"), "Costco US Replacement sent should contain the review text.");
assertFlags(costcoRow, [], "Clean Costco US row should not generate model reminders.");

const costcoMediaRows = parseReviewNotes([
  "Ticket #100011 - photo/video",
  "https://support.ispringfilter.com/scp/tickets.php?id=100011",
  "https://www.costco.com/reviews/costco-us-photo-video",
  "Jun 5, 2026",
  "5 stars",
  "Support helped with installation.",
  "Casey Costco - RO500",
  "",
  "Ticket #100012 - photo",
  "https://support.ispringfilter.com/scp/tickets.php?id=100012",
  "https://www.costco.ca/reviews/costco-ca-photo",
  "Jun 5, 2026",
  "5 stars",
  "Support helped with installation.",
  "Parker Costco - RCC7",
  "",
  "Ticket #100013 - video",
  "https://support.ispringfilter.com/scp/tickets.php?id=100013",
  "https://www.costco.ca/reviews/costco-ca-video",
  "Jun 5, 2026",
  "5 stars",
  "Support helped with installation.",
  "Vera Costco - WGB32B",
].join("\n"));
assertEqual(costcoMediaRows.length, 3, "RepStack Costco media exports should parse every review.");
assertEqual(costcoMediaRows[0].platform, "Costco US", "Costco.com media exports should detect Costco US.");
assertEqual(costcoMediaRows[0].containsPictures, "Y", "Costco US photo/video exports should keep the photo marker.");
assertEqual(costcoMediaRows[0].containsVideo, "Y", "Costco US photo/video exports should keep the video marker.");
assertEqual(calculateBonus(costcoMediaRows[0]), 40, "Costco US photo and video bonuses should stack to $40.");
assertEqual(costcoMediaRows[1].platform, "Costco.ca", "Costco.ca photo exports should detect Costco.ca.");
assertEqual(calculateBonus(costcoMediaRows[1]), 30, "Costco Canada photo reviews should be worth $30.");
assertEqual(costcoMediaRows[2].platform, "Costco.ca", "Costco.ca video exports should detect Costco.ca.");
assertEqual(calculateBonus(costcoMediaRows[2]), 35, "Costco Canada video reviews should be worth $35.");
assertEqual(
  calculateBonusSummary(costcoMediaRows).estimatedBonusTotal,
  105,
  "Costco media bonuses should flow into bonus summaries and exported totals.",
);

const pureDropRow = rowByTicket("100011");
assertEqual(pureDropRow.platform, "PureDrop", "puredropfilter.com rows should detect PureDrop.");
assertEqual(calculateBonus(pureDropRow), 25, "PureDrop reviews should be worth $25.");
assertEqual(
  formatCustomerContactSummary(pureDropRow),
  "Ticket #100011 - Priya PureDrop - PureDrop - Jun 6, 2026",
  "PureDrop should display with its clean platform label.",
);
assert(pureDropRow.replacementSent.includes("PureDrop support helped"), "PureDrop review text should export in Replacement sent.");
assertFlags(pureDropRow, [], "Clean PureDrop rows should not generate parser flags.");
const pureDropExport = buildReviewExportPackage([pureDropRow]);
assertEqual(pureDropExport.pasteRows.rows.length, 1, "PureDrop should export one Review Log row.");
assertEqual(pureDropExport.pasteRows.rows[0].length, 8, "PureDrop should preserve the 8-column Review Log export.");
assertEqual(pureDropExport.summary.summary.estimatedBonusTotal, 25, "PureDrop exports should include the $25 bonus.");
assertEqual(
  pureDropExport.summary.summary.platformCounts.find(({ platform }) => platform === "PureDrop")?.count,
  1,
  "PureDrop exports should include the PureDrop platform summary.",
);

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

const modelFallbackRows = parseReviewNotes([
  "Ticket #238500 - RCC7AK",
  "https://support.ispringfilter.com/scp/tickets.php?id=238500",
  "https://www.google.com/maps/reviews/model-near-ticket",
  "6/9/26",
  "Robert helped us finish setup quickly.",
  "Mara Tickettop -",
  "",
  "Ticket #238501",
  "https://support.ispringfilter.com/scp/tickets.php?id=238501",
  "https://www.trustpilot.com/reviews/model-in-text",
  "Jun 9, 2026",
  "5 stars",
  "The WSP50 filter has been working perfectly since support followed up.",
  "Miles Textmodel -",
  "",
  "Ticket #238502",
  "https://support.ispringfilter.com/scp/tickets.php?id=238502",
  "https://www.google.com/maps/reviews/hyphen-model",
  "6/9/26",
  "Model Number: WGB32B-KDS",
  "The whole-house system is working well.",
  "Hana Hyphen -",
].join("\n"));
assertEqual(modelFallbackRows.length, 3, "Model fallback fixture should parse every row.");
assertEqual(modelFallbackRows[0].modelNumber, "RCC7AK", "Parser should detect a model that appears near the ticket number.");
assertEqual(modelFallbackRows[1].modelNumber, "WSP50", "Parser should detect a model that appears in review/customer text.");
assertEqual(modelFallbackRows[2].modelNumber, "WGB32B-KDS", "Parser should detect hyphenated model labels.");
assertFlags(modelFallbackRows[0], [], "Ticket-adjacent model row should not generate model reminders.");
assertFlags(modelFallbackRows[1], [], "Inline model row should not generate model reminders.");
assertFlags(modelFallbackRows[2], [], "Hyphenated labeled model row should not generate model reminders.");
assert(
  modelFallbackRows[1].replacementSent.includes("The WSP50 filter has been working perfectly"),
  "Inline model mentions should stay in review text.",
);
assert(
  !modelFallbackRows[2].replacementSent.includes("Model Number: WGB32B-KDS"),
  "Dedicated model label lines should not stay in review text.",
);
const modelFallbackExport = buildReviewExportPackage(modelFallbackRows);
assertEqual(modelFallbackExport.pasteRows.rows[0][2], "RCC7AK", "Export package should include ticket-adjacent detected models.");
assertEqual(modelFallbackExport.pasteRows.rows[1][2], "WSP50", "Export package should include inline detected models.");
assertEqual(modelFallbackExport.pasteRows.rows[2][2], "WGB32B-KDS", "Export package should include hyphenated detected models.");

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

const repStackGoogleLinkRows = parseReviewNotes([
  "238610",
  "https://support.ispringfilter.com/scp/tickets.php?id=238610",
  "https://g.page/r/example/review",
  "7/30/26",
  "Robert helped with setup.",
  "Gina Shortlink - RCC7",
  "",
  "238611",
  "https://support.ispringfilter.com/scp/tickets.php?id=238611",
  "https://goo.gl/maps/example",
  "7/30/26",
  "Setup was easy after support helped.",
  "Grant Maplink - WGB32B",
].join("\n"));
assertEqual(repStackGoogleLinkRows.length, 2, "RepStack Google short links should split into separate rows.");
assertEqual(repStackGoogleLinkRows[0].ticketNumber, "238610", "Bare RepStack ticket numbers should be preserved.");
assertEqual(repStackGoogleLinkRows[1].ticketNumber, "238611", "Consecutive bare RepStack ticket numbers should start new rows.");
assertEqual(repStackGoogleLinkRows[0].platform, "Google", "g.page review links should parse as Google.");
assertEqual(repStackGoogleLinkRows[1].platform, "Google", "goo.gl map links should parse as Google.");

const reviewLinkWithSupportWordRows = parseReviewNotes([
  "238612",
  "https://support.ispringfilter.com/scp/tickets.php?id=238612",
  "https://www.google.com/maps/reviews/support-was-great",
  "7/30/26",
  "Support was great.",
  "Greta Support - RCC7AK",
].join("\n"));
assertEqual(reviewLinkWithSupportWordRows[0].platform, "Google", "Review URL paths may contain the word support.");
assertEqual(
  reviewLinkWithSupportWordRows[0].reviewLink,
  "https://www.google.com/maps/reviews/support-was-great",
  "A review URL containing support should not be mistaken for the ticket link.",
);

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
  "https://www.walmart.com/reviews/walmart-basic",
  "Jun 5, 2026",
  "5 stars",
  "***PHOTO***",
  "***VIDEO***",
  "Walmart review after support helped finish installation.",
  "Willa Walmart - WM123",
  "",
  "Ticket #100019",
  "https://support.ispringfilter.com/scp/tickets.php?id=100019",
  "https://www.ispringfilter.com/pages/reviews",
  "Jun 5, 2026",
  "5 stars",
  "Website review after support helped finish installation.",
  "Wendy Website - RCC7",
  "",
  "Ticket #100030",
  "https://support.ispringfilter.com/scp/tickets.php?id=100030",
  "https://www.amazon.ca/review/amazon-canada-verified",
  "Verified Purchase",
  "5 out of 5 stars",
  "Great support and the filter works well.",
  "Ava Canada - RCC7AK",
  "",
  "Ticket #100031",
  "https://support.ispringfilter.com/scp/tickets.php?id=100031",
  "https://www.ispringwater.com/pages/reviews",
  "Jun 5, 2026",
  "5 stars",
  "iSpring Water review after support helped finish installation.",
  "Iris Water - WGB32B",
  "",
  "Ticket #100032",
  "https://support.ispringfilter.com/scp/tickets.php?id=100032",
  "https://www.123filter.com/pages/reviews",
  "Jun 5, 2026",
  "5 stars",
  "123Filter review after support helped finish installation.",
  "Finn Filter - RO500",
].join("\n"));
assertEqual(bonusRuleRows.length, 9, "New bonus-rule platform fixture should parse every row.");
assertEqual(bonusRuleRows[0].platform, "Amazon", "Amazon unverified photo fixture should detect Amazon.");
assertEqual(bonusRuleRows[0].verifiedFiveStar, "N", "Amazon unverified photo fixture should export verified N.");
assertEqual(bonusRuleRows[0].amazonVerifiedPurchase, false, "Amazon unverified photo fixture should stay an unverified purchase.");
assertEqual(bonusRuleRows[0].containsPictures, "Y", "Amazon unverified photo fixture should use the internal photo marker.");
assertEqual(calculateBonus(bonusRuleRows[0]), 20, "Unverified Amazon with photo should be worth $20.");
assertEqual(bonusRuleRows[1].platform, "Costco.ca", "Costco.ca should detect as Costco.ca.");
assertEqual(calculateBonus(bonusRuleRows[1]), 25, "Costco.ca should be worth $25.");
assertEqual(bonusRuleRows[2].platform, "Home Depot", "Home Depot Canada should detect as Home Depot.");
assertEqual(calculateBonus(bonusRuleRows[2]), 25, "Home Depot Canada should be worth $25.");
assertEqual(bonusRuleRows[3].platform, "Zoro", "Zoro should be detected.");
assertEqual(calculateBonus(bonusRuleRows[3]), 25, "Zoro should be worth $25.");
assertEqual(bonusRuleRows[4].platform, "Walmart", "Walmart should be detected.");
assertEqual(bonusRuleRows[4].containsPictures, "Y", "Walmart fixture should keep photo markers for exports.");
assertEqual(bonusRuleRows[4].containsVideo, "Y", "Walmart fixture should keep video markers for exports.");
assertEqual(calculateBonus(bonusRuleRows[4]), 25, "Walmart reviews should stay flat $25 even with media.");
assertEqual(bonusRuleRows[5].platform, "iSpring Website", "iSpring website reviews should be detected.");
assertEqual(calculateBonus(bonusRuleRows[5]), 25, "iSpring website reviews should be worth $25.");
assertEqual(bonusRuleRows[6].platform, "Amazon", "Amazon Canada should use the Amazon bonus rule.");
assertEqual(bonusRuleRows[6].verifiedFiveStar, "Y", "Amazon Canada verified fixture should export verified Y.");
assertEqual(calculateBonus(bonusRuleRows[6]), 25, "Verified Amazon Canada should be worth $25.");
assertEqual(bonusRuleRows[7].platform, "iSpring Website", "iSpring Water reviews should use the iSpring website rule.");
assertEqual(calculateBonus(bonusRuleRows[7]), 25, "iSpring Water reviews should be worth $25.");
assertEqual(bonusRuleRows[8].platform, "iSpring Website", "123Filter reviews should use the iSpring website rule.");
assertEqual(calculateBonus(bonusRuleRows[8]), 25, "123Filter reviews should be worth $25.");

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

const yelpBonusRows = parseReviewNotes([
  "Ticket #100033",
  "https://support.ispringfilter.com/scp/tickets.php?id=100033",
  "https://www.yelp.com/biz/ispring-filter-yelp-review",
  "Jun 5, 2026",
  "5 stars",
  "Yelp review after support helped finish installation.",
  "Yara Yelp - YP123",
].join("\n"));
assertEqual(yelpBonusRows.length, 1, "Yelp review should parse.");
assertEqual(yelpBonusRows[0].platform, "Yelp", "Yelp platform should be detected.");
assertEqual(calculateBonus(yelpBonusRows[0]), 20, "Yelp reviews should use the confirmed $20 bonus.");
assertFlags(yelpBonusRows[0], [], "Clean Yelp row should not generate model reminders.");

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
assertEqual(ratingUnclearRows[0].verifiedFiveStar, "N", "A missing/unclear rating should not imply verified Y.");
assertFlags(ratingUnclearRows[0], [], "Rating unclear should not generate model reminders when the model is present.");

// Rating text must not imply verified status, whether missing entirely or glued
// to the review on an Amazon row.
const noRatingTextRow = parseReviewNotes([
  "Ticket #100020",
  "https://support.ispringfilter.com/scp/tickets.php?id=100020",
  "https://www.google.com/maps/reviews/google-no-rating-text",
  "Jun 5, 2026",
  "Support sorted out my install quickly.",
  "Nina Norating - RCC7AK",
].join("\n"))[0];
assertEqual(noRatingTextRow.verifiedFiveStar, "N", "Google row with no verified wording should export verified N.");
assertFlags(noRatingTextRow, [], "Missing rating text should not flag a row.");

const gluedAmazonRatingRow = parseReviewNotes([
  "Ticket #100021",
  "https://support.ispringfilter.com/scp/tickets.php?id=100021",
  "https://www.amazon.com/review/amazon-glued-rating",
  "5 out of 5 starsGreat product and fast help.",
  "Gary Glued - WGB32B",
].join("\n"))[0];
assertEqual(gluedAmazonRatingRow.platform, "Amazon", "Glued-rating fixture should still detect Amazon.");
assertEqual(gluedAmazonRatingRow.verifiedFiveStar, "N", "Glued Amazon rating text should not imply verified Y.");
assertEqual(gluedAmazonRatingRow.amazonVerifiedPurchase, false, "Amazon row without Verified wording stays unverified purchase.");
assertEqual(calculateBonus(gluedAmazonRatingRow), 15, "Unverified Amazon (no photo) should still be worth $15.");

const explicitVerificationRows = parseReviewNotes([
  "Ticket #100022",
  "https://support.ispringfilter.com/scp/tickets.php?id=100022",
  "https://www.amazon.com/review/amazon-standalone-verified",
  "Verified",
  "5 out of 5 stars",
  "Works well after setup.",
  "Vera Status - RCC7AK",
  "",
  "Ticket #100023",
  "https://support.ispringfilter.com/scp/tickets.php?id=100023",
  "https://www.amazon.com/review/amazon-explicit-not-verified",
  "Not verified",
  "5 out of 5 stars",
  "Works well after setup.",
  "Nick Status - RCC7AK",
  "",
  "Ticket #100024",
  "https://support.ispringfilter.com/scp/tickets.php?id=100024",
  "https://www.trustpilot.com/reviews/trustpilot-verified-buyer",
  "Verified buyer",
  "5 stars",
  "Helpful support and clear instructions.",
  "Tara Buyer - PH100",
].join("\n"));
assertEqual(explicitVerificationRows.length, 3, "Explicit verification fixture should parse every row.");
assertEqual(explicitVerificationRows[0].verifiedFiveStar, "Y", "Amazon standalone Verified should export verified Y.");
assertEqual(calculateBonus(explicitVerificationRows[0]), 25, "Verified Amazon should be worth $25.");
assertEqual(explicitVerificationRows[1].verifiedFiveStar, "N", "Amazon explicitly not verified should export verified N.");
assertEqual(calculateBonus(explicitVerificationRows[1]), 15, "Explicitly unverified Amazon should be worth $15.");
assertEqual(explicitVerificationRows[2].verifiedFiveStar, "Y", "Non-Amazon explicit verified buyer wording should export verified Y.");

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

function parseNameMentionExample(reviewText, ticketNumber) {
  const lines = [
    `Ticket #${ticketNumber}`,
    `https://support.ispringfilter.com/scp/tickets.php?id=${ticketNumber}`,
    `https://www.google.com/maps/reviews/name-mention-${ticketNumber}`,
    "6/5/26",
  ];
  if (reviewText) lines.push(reviewText);
  lines.push("Case Tester - RCC7AK");

  const parsedRows = parseReviewNotes(lines.join("\n"));
  assertEqual(parsedRows.length, 1, `Name-mention fixture ${ticketNumber} should parse into one row.`);
  return parsedRows[0];
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
