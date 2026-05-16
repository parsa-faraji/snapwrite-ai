// @ts-check
import { test, expect, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../extension");
const TEST_PAGE = `file://${path.resolve(__dirname, "test-page.html")}`;

async function launchWithExtension() {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-first-run",
      "--disable-gpu",
    ],
  });

  let sw;
  if (context.serviceWorkers().length === 0) {
    sw = await context.waitForEvent("serviceworker");
  } else {
    sw = context.serviceWorkers()[0];
  }

  const extensionId = sw.url().split("/")[2];
  const page = await context.newPage();
  return { context, page, extensionId, sw };
}

test.describe("Context Menu Flow", () => {
  let context, page, extensionId, sw;

  test.beforeAll(async () => {
    const launched = await launchWithExtension();
    context = launched.context;
    page = launched.page;
    extensionId = launched.extensionId;
    sw = launched.sw;
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("right-click context menu triggers AI result", async () => {
    await page.goto(TEST_PAGE);
    await page.waitForTimeout(500);

    const testText = "The quick brown fox jumps over the lazy dog";

    await page.evaluate((txt) => {
      const p = document.getElementById("test-text");
      p.textContent = txt;
      const range = document.createRange();
      range.selectNodeContents(p);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, testText);

    await sw.evaluate(async (text) => {
      // @ts-ignore
      const tabs = await chrome.tabs.query({ active: true });
      const tab = tabs[0];
      // @ts-ignore
      chrome.contextMenus.onClicked.dispatch(
        {
          menuItemId: "qw-improve",
          selectionText: text
        },
        tab
      );
    }, testText);

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const host = document.getElementById("snapwrite-host");
        return host?.style.pointerEvents;
      });
    }, {
      message: "Waiting for SnapWrite UI to become active (pointer-events: auto)",
      timeout: 5000,
    }).toBe("auto");
  });
});
