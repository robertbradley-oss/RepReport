import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const host = "127.0.0.1";
const port = 4177;
const baseUrl = `http://${host}:${port}`;
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const reviewNotes = readFileSync(new URL("./fixtures/batch-review-notes.txt", import.meta.url), "utf8");
const server = await createServer({
  root: projectRoot,
  logLevel: "error",
  server: {
    host,
    port,
    strictPort: true,
  },
});

try {
  await server.listen();
  await runGoldenPath({ width: 1440, height: 980, expectedInternalTableScroll: false });
  await runGoldenPath({ width: 390, height: 844, expectedInternalTableScroll: true });
  console.log("smoke:ui passed");
} finally {
  await server.close();
}

async function runGoldenPath({ width, height, expectedInternalTableScroll }) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    page.on("pageerror", (error) => {
      throw error;
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator("#review-notes").fill(reviewNotes);
    await page.getByRole("button", { name: "Generate Review Table" }).click();

    await expectText(page.locator(".statusLine"), "Parsed 11 rows with 1 model reminder.");
    await expectReviewColumns(page);
    await expectRowShape(page);
    await expectExactText(page.locator(".urlChip").nth(0), "Ticket");
    await expectExactText(page.locator(".urlChip").nth(1), "Open Review");
    await expectAttribute(page.locator(".urlChip").nth(0), "aria-label", "Ticket #100001 · support.ispringfilter.com");
    await expectAttribute(page.locator(".urlChip").nth(1), "aria-label", "Open Review · www.amazon.com");
    await expectExactText(page.locator(".reviewCol-ticketLink .missingLinkChip").first(), "Missing Link");
    await expectAttribute(page.locator(".reviewCol-ticketLink .missingLinkChip").first(), "aria-label", "Missing ticket link");
    await expectCompactUrlChips(page);
    await expectCenteredUrlChips(page);
    await expectResponsiveContainment(page, expectedInternalTableScroll);

    const missingModelInput = page.getByLabel("Model number row 9");
    await missingModelInput.fill("RCC7AK");
    await missingModelInput.press("Enter");
    await expectText(page.locator(".statusLine"), "11 editable rows in the table.");
    await expectNoModelReminderRows(page);

    await expectEnabled(page.getByRole("button", { name: "Copy Rows" }));
    await expectEnabled(page.getByRole("button", { name: "Export To Excel" }));
  } finally {
    await context.close();
    await browser.close();
  }
}

async function expectReviewColumns(page) {
  const headers = await page.locator(".reviewOutputCard thead th").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? ""),
  );
  assertEqual(
    headers.join("|"),
    "#|Ticket|Review|Model|Verified?|Video|Photo|Customer / Platform|Review Text",
    "Review Log browser table columns changed.",
  );
}

async function expectRowShape(page) {
  await page.locator(".reviewOutputCard tbody tr").first().waitFor();
  const firstRowCellCount = await page.locator(".reviewOutputCard tbody tr").first().locator("td").count();
  assertEqual(firstRowCellCount, 9, "Review Log browser table should render row number plus 8 export columns.");

  const modelInputs = await page.locator(".reviewOutputCard .modelInput").count();
  assertEqual(modelInputs, 11, "Review Log browser table should render one editable model input per parsed row.");
}

async function expectResponsiveContainment(page, expectedInternalTableScroll) {
  const metrics = await page.evaluate(() => {
    const tableWrap = document.querySelector(".reviewOutputCard .tableWrap");
    return {
      bodyScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.documentElement.clientWidth,
      tableScrollWidth: tableWrap?.scrollWidth ?? 0,
      tableClientWidth: tableWrap?.clientWidth ?? 0,
    };
  });

  assert(
    metrics.bodyScrollWidth <= metrics.bodyClientWidth + 1,
    `Page should not create horizontal document overflow. scrollWidth=${metrics.bodyScrollWidth}, clientWidth=${metrics.bodyClientWidth}`,
  );

  if (expectedInternalTableScroll) {
    assert(
      metrics.tableScrollWidth > metrics.tableClientWidth,
      "Mobile Review Log table should keep wide columns inside the table scroller.",
    );
  }
}

async function expectCompactUrlChips(page) {
  const chipHeights = await page.locator(".urlChip").evaluateAll((chips) =>
    chips.map((chip) => chip.getBoundingClientRect().height),
  );
  assert(chipHeights.length > 0, "Review Log should render valid URL chips for the fixture.");
  assert(
    chipHeights.every((height) => height <= 30),
    `Review Log URL chips should stay single-line and compact. heights=${chipHeights.join(",")}`,
  );

  const reviewChipMetrics = await page.locator(".reviewCol-reviewLink .urlChip").first().evaluate((chip) => ({
    clientWidth: chip.clientWidth,
    scrollWidth: chip.scrollWidth,
  }));
  assert(
    reviewChipMetrics.scrollWidth <= reviewChipMetrics.clientWidth,
    `Review URL chips should show the complete Open Review label without truncation. client=${reviewChipMetrics.clientWidth}, scroll=${reviewChipMetrics.scrollWidth}`,
  );

  const missingLinkHeights = await page.locator(".reviewCol-ticketLink .missingLinkChip").evaluateAll((chips) =>
    chips.map((chip) => chip.getBoundingClientRect().height),
  );
  assert(missingLinkHeights.length > 0, "Review Log fixture should render a missing-link chip.");
  assert(
    missingLinkHeights.every((height) => height <= 30),
    `Missing-link chips should stay compact. heights=${missingLinkHeights.join(",")}`,
  );
}

async function expectCenteredUrlChips(page) {
  const centerOffsets = await page.locator(".reviewCol-ticketLink .urlChip, .reviewCol-ticketLink .missingLinkChip, .reviewCol-reviewLink .urlChip, .reviewCol-reviewLink .missingLinkChip").evaluateAll((chips) =>
    chips.map((chip) => {
      const cell = chip.closest("td");
      if (!cell) return Number.POSITIVE_INFINITY;

      const chipRect = chip.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      return Math.abs((chipRect.left + chipRect.right) / 2 - (cellRect.left + cellRect.right) / 2);
    }),
  );

  assert(centerOffsets.length > 0, "Review Log should render URL chips for alignment checks.");
  assert(
    centerOffsets.every((offset) => offset <= 1),
    `Review Log URL chips should be horizontally centered in their cells. offsets=${centerOffsets.join(",")}`,
  );

  const missingLinkTextAlignments = await page.locator(".missingLinkChip").evaluateAll((chips) =>
    chips.map((chip) => getComputedStyle(chip).textAlign),
  );
  assert(missingLinkTextAlignments.length > 0, "Review Log fixture should render a missing-link chip.");
  assert(
    missingLinkTextAlignments.every((textAlign) => textAlign === "center"),
    `Missing-link chip text should be centered. alignments=${missingLinkTextAlignments.join(",")}`,
  );
}

async function expectText(locator, expected) {
  await locator.waitFor();
  const text = normalize(await locator.textContent());
  assert(text.includes(expected), `Expected text "${expected}" but found "${text}".`);
}

async function expectExactText(locator, expected) {
  await locator.waitFor();
  assertEqual(normalize(await locator.textContent()), expected, `Expected exact text "${expected}".`);
}

async function expectAttribute(locator, attributeName, expected) {
  await locator.waitFor();
  assertEqual(await locator.getAttribute(attributeName), expected, `Expected ${attributeName}="${expected}".`);
}

async function expectNoModelReminderRows(page) {
  await page.waitForFunction(() => document.querySelectorAll(".flagsPanel tbody tr").length === 0);
  assertEqual(await page.getByText("Model missing").count(), 0, "Committed model edit should clear Model missing reminders.");
}

async function expectEnabled(locator) {
  await locator.waitFor();
  assert(await locator.isEnabled(), "Expected control to be enabled.");
}

function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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
