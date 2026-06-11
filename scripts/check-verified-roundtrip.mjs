// One-off check: a RepStack export block with the "Verified Purchase" marker
// must parse as a verified Amazon review, with the marker absent from the
// review text and counted in the bonus summary.
import { calculateBonus, calculateBonusSummary, parseReviewNotes } from "../src/lib/reviewParser.ts";
import { buildReviewClipboardHtml } from "../src/lib/reviewClipboard.ts";

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
  "",
  "- photo/video",
  "https://www.amazon.com/gp/customer-reviews/R55ABCDEF12/ref=cm_cr_arp_d_rvw_ttl?ie=UTF8",
  "6/2/26",
  "No ticket on this one but it has both a photo and a video attached.",
  "Dana Cole - WGB22B-PB",
].join("\n");

const rows = parseReviewNotes(notes);
const summary = calculateBonusSummary(rows);

const checks = [
  ["five rows parsed", rows.length === 5],
  ["row 1 platform Amazon", rows[0].platform === "Amazon"],
  ["row 1 verified", rows[0].amazonVerifiedPurchase === true],
  ["row 1 text keeps no marker", !/verified purchase/i.test(rows[0].reviewText)],
  ["row 1 text intact", rows[0].reviewText.includes("Great filter")],
  ["row 2 not verified", rows[1].amazonVerifiedPurchase === false],
  ["summary verified 1 of 3 amazon", summary.verifiedAmazonCount === 1 && summary.amazonCount === 3],
  ["row 3 has photo", rows[2].containsPictures === "Y"],
  ["row 3 has video", rows[2].containsVideo === "Y"],
  ["row 3 ticket parsed", (rows[2].ticketNumber ?? "").includes("240063")],
  ["row 3 text has no media residue", !/photo\s*\/|\/\s*video|\*{2,3}/i.test(rows[2].reviewText)],
  ["row 3 text intact", rows[2].reviewText.includes("Love the system")],
  ["row 4 bare-number video detected", rows[3].containsVideo === "Y"],
  ["row 4 no photo", rows[3].containsPictures === "N"],
  ["row 4 text intact", rows[3].reviewText.includes("unboxing")],
  ["row 5 ticketless platform Amazon", rows[4].platform === "Amazon"],
  ["row 5 ticketless photo detected", rows[4].containsPictures === "Y"],
  ["row 5 ticketless video detected", rows[4].containsVideo === "Y"],
  ["row 5 text has no media residue", !/photo\s*\/|\/\s*video|\*{2,3}|^-\s*$/im.test(rows[4].reviewText)],
  ["row 5 text intact", rows[4].reviewText.includes("No ticket on this one")],
  ["summary photo 2 video 3", summary.photoReviewCount === 2 && summary.videoReviewCount === 3],
  ["row 3 google photo+video bonus is 30", calculateBonus(rows[2]) === 10 + 10 + 10],
  ["row 4 trustpilot video bonus stays 15", calculateBonus(rows[3]) === 15],
  ["row 5 amazon photo+video bonus is 30", calculateBonus(rows[4]) === 15 + 5 + 10],
  [
    "bonus total (25 + 15 amazon, 30 google p/v, 15 trustpilot, 30 amazon p/v)",
    summary.estimatedBonusTotal === 25 + 15 + 30 + 15 + 30,
  ],
  // Copy Rows must paint every photo/video "Y" cell yellow. Across the five
  // rows that is: row3 photo+video, row4 video, row5 photo+video = 5 cells.
  [
    "copy highlights all 5 photo/video Y cells yellow",
    (buildReviewClipboardHtml(rows).match(/background-color:#ffff00;">Y</g) || []).length === 5,
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
