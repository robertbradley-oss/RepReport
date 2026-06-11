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
  "",
  "Ticket #240063 - photo/video",
  "https://support.ispringfilter.com/scp/tickets.php?id=240063",
  "https://www.google.com/search?q=ispring+reviews+natalie",
  "6/4/26",
  "Love the system, attached photos and a video of the install.",
  "Natalie Wilson - RCC7AK",
  "",
  "240064 - video",
  "https://support.ispringfilter.com/scp/tickets.php?id=240064",
  "https://www.trustpilot.com/reviews/aa1858422cd19168d0329f11",
  "6/3/26",
  "Posted a video review of the unboxing.",
  "Marcus Lee - RO600",
].join("\n");

const rows = parseReviewNotes(notes);
const summary = calculateBonusSummary(rows);

const checks = [
  ["four rows parsed", rows.length === 4],
  ["row 1 platform Amazon", rows[0].platform === "Amazon"],
  ["row 1 verified", rows[0].amazonVerifiedPurchase === true],
  ["row 1 text keeps no marker", !/verified purchase/i.test(rows[0].reviewText)],
  ["row 1 text intact", rows[0].reviewText.includes("Great filter")],
  ["row 2 not verified", rows[1].amazonVerifiedPurchase === false],
  ["summary verified 1 of 2 amazon", summary.verifiedAmazonCount === 1 && summary.amazonCount === 2],
  ["row 3 has photo", rows[2].containsPictures === "Y"],
  ["row 3 has video", rows[2].containsVideo === "Y"],
  ["row 3 ticket parsed", (rows[2].ticketNumber ?? "").includes("240063")],
  ["row 3 text has no media residue", !/photo\s*\/|\/\s*video|\*{2,3}/i.test(rows[2].reviewText)],
  ["row 3 text intact", rows[2].reviewText.includes("Love the system")],
  ["row 4 bare-number video detected", rows[3].containsVideo === "Y"],
  ["row 4 no photo", rows[3].containsPictures === "N"],
  ["row 4 text intact", rows[3].reviewText.includes("unboxing")],
  ["summary photo 1 video 2", summary.photoReviewCount === 1 && summary.videoReviewCount === 2],
  [
    "bonus math (25 + 15 amazon, 20 google photo, 15 trustpilot)",
    summary.estimatedBonusTotal === 25 + 15 + 20 + 15,
  ],
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
