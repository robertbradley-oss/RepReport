import { parseReviewNotes } from "../src/lib/reviewParser.ts";
import { REVIEW_COLUMNS } from "../src/types.ts";

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

const reviewNotes = `Ticket #123456
https://support.ispringfilter.com/scp/tickets.php?id=123456
https://www.amazon.com/review/example
Verified Purchase
5 out of 5 stars
Great system and Robert was very helpful.
Customer Name - RCC7AK

https://www.google.com/search/example-review-link
6/5/26
Great customer service from Robert and the system works well.
Customer Name - WGB32B

Ticket #234567
https://support.ispringfilter.com/scp/tickets.php?id=234567
https://www.trustpilot.com/reviews/example
***PHOTO***
Great support, easy installation, and the setup video helped.
Customer Name - RO500AK`;

const rows = parseReviewNotes(reviewNotes);
const [amazonRow, googleRow, trustpilotRow] = rows;

assertEqual(rows.length, 3, "Review parser should return 3 representative rows.");
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

assertEqual(amazonRow.platform, "Amazon", "First row should be Amazon.");
assertEqual(amazonRow.verifiedFiveStar, "Y", "Verified Amazon row should export Y.");
assertEqual(amazonRow.replacementSent, "", "Amazon Replacement sent column should stay blank.");
assertEqual(amazonRow.modelNumber, "RCC7AK", "Amazon model should parse from the customer/model line.");

assertEqual(googleRow.platform, "Google", "Second row should be Google.");
assertEqual(googleRow.ticketNumber, undefined, "No-ticket Google row should not get a ticket number.");
assert(!googleRow.customerContactTicketLink.includes("Ticket #"), "No-ticket row should not include a blank Ticket # line.");
assertEqual(googleRow.ratingOrStatus, "5 out of 5 stars", "Google row without rating should default to 5 out of 5 stars.");
assert(googleRow.replacementSent.includes("Great customer service"), "Google Replacement sent should contain the review text.");

assertEqual(trustpilotRow.platform, "Trustpilot", "Third row should be Trustpilot.");
assertEqual(trustpilotRow.containsPictures, "Y", "***PHOTO*** should set Contains pictures? to Y.");
assertEqual(trustpilotRow.containsVideo, "N", "Text mentioning video should not set Contains video? to Y.");
assert(trustpilotRow.replacementSent.includes("Great support"), "Trustpilot Replacement sent should contain the review text.");

console.log("smoke:review passed");

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
