// One-off check: a RepStack export block with the "Verified Purchase" marker
// must parse as a verified Amazon review, with the marker absent from the
// review text and counted in the bonus summary.
import { calculateBonusSummary, parseReviewNotes } from "../src/lib/reviewParser.ts";

const notes = [
  "240061",
  "https://support.ispringfilter.com/scp/tickets.php?id=240061",
  "https://www.amazon.com/gp/customer-reviews/R14R6GTMIQV1J8/ref=cm_cr_arp_d_rvw_ttl?ie=UTF8",
  "6/6/26",
  "Verified Purchase",
  "Great filter, works perfectly. Would buy again.",
  "Sam Veltre - WCB32C-KS",
  "",
  "240062",
  "https://support.ispringfilter.com/scp/tickets.php?id=240062",
  "https://www.amazon.com/gp/customer-reviews/R24R6GTMIQV1J9/ref=cm_cr_arp_d_rvw_ttl?ie=UTF8",
  "6/5/26",
  "Plain Amazon review without the marker line.",
  "Jeff Johns - RO5004F",
].join("\n");

const rows = parseReviewNotes(notes);
const summary = calculateBonusSummary(rows);

const checks = [
  ["two rows parsed", rows.length === 2],
  ["row 1 platform Amazon", rows[0].platform === "Amazon"],
  ["row 1 verified", rows[0].amazonVerifiedPurchase === true],
  ["row 1 text keeps no marker", !/verified purchase/i.test(rows[0].reviewText)],
  ["row 1 text intact", rows[0].reviewText.includes("Great filter")],
  ["row 2 not verified", rows[1].amazonVerifiedPurchase === false],
  ["summary verified 1 of 2 amazon", summary.verifiedAmazonCount === 1 && summary.amazonCount === 2],
  ["verified bonus 25", rows[0].amazonVerifiedPurchase && summary.estimatedBonusTotal === 25 + 15],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
  if (!ok) failed = true;
}
if (failed) {
  console.log("\nrow 1:", JSON.stringify(rows[0], null, 2));
  process.exit(1);
}
console.log("roundtrip ok");
