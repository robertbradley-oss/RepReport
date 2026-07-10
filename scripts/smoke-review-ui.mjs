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

async function expectText(locator, expected) {
  await locator.waitFor();
  const text = normalize(await locator.textContent());
  assert(text.includes(expected), `Expected text "${expected}" but found "${text}".`);
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
