// @ts-check
import { test, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../extension");
const SCREENSHOT_DIR = path.resolve(__dirname, "../website/assets");

// A styled test page that looks like a real email compose window
const EMAIL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px; }
    .email-compose {
      max-width: 640px; margin: 0 auto;
      background: #fff; border-radius: 12px;
      box-shadow: 0 2px 20px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .email-header {
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
      display: flex; align-items: center; gap: 12px;
    }
    .email-header .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-red { background: #ff5f57; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #28c840; }
    .email-header span { margin-left: 12px; font-size: 13px; color: #999; }
    .email-fields {
      padding: 12px 20px;
      border-bottom: 1px solid #f0f0f0;
    }
    .email-field {
      display: flex; align-items: center; padding: 6px 0;
      font-size: 14px; color: #333;
    }
    .email-field label { color: #999; width: 50px; font-size: 13px; }
    .email-field span { color: #333; }
    .email-subject {
      padding: 12px 20px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 15px; font-weight: 600; color: #333;
    }
    .email-body {
      padding: 20px;
      font-size: 15px;
      line-height: 1.7;
      color: #444;
      min-height: 150px;
    }
    .email-body p { margin-bottom: 12px; }
    .error { text-decoration: underline wavy #ef4444; text-underline-offset: 3px; }
  </style>
</head>
<body>
  <div class="email-compose">
    <div class="email-header">
      <div class="dot dot-red"></div>
      <div class="dot dot-yellow"></div>
      <div class="dot dot-green"></div>
      <span>New Message</span>
    </div>
    <div class="email-fields">
      <div class="email-field"><label>To:</label><span>mike.chen@company.com</span></div>
      <div class="email-field"><label>From:</label><span>you@company.com</span></div>
    </div>
    <div class="email-subject">Re: Project Update</div>
    <div class="email-body" contenteditable="true">
      <p id="test-text">hey mike, wanted to <span class="error">follw</span> up on the thing we <span class="error">talk</span> about last week. i think we should <span class="error">definately</span> move forward with the project <span class="error">becuase</span> its going to be really good for the team and <span class="error">eveyone</span> will benefit from it.</p>
    </div>
  </div>
</body>
</html>`;

async function launchWithExtension() {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-first-run",
      "--disable-gpu",
    ],
    viewport: { width: 1280, height: 800 },
  });

  let sw;
  if (context.serviceWorkers().length === 0) {
    sw = await context.waitForEvent("serviceworker");
  } else {
    sw = context.serviceWorkers()[0];
  }

  const extensionId = sw.url().split("/")[2];
  const page = await context.newPage();
  return { context, page, extensionId };
}

test("capture hero screenshot — toolbar over email", async () => {
  const { context, page } = await launchWithExtension();

  // Wait for install flow to settle (options page auto-opens)
  await page.waitForTimeout(2000);

  // Close all pages except one, start fresh
  const allPages = context.pages();
  for (let i = 1; i < allPages.length; i++) {
    await allPages[i].close();
  }
  const mainPage = allPages[0];

  // Navigate to the styled email page
  await mainPage.setContent(EMAIL_HTML, { waitUntil: "networkidle" });
  await mainPage.waitForTimeout(1000);

  // Select the test text to trigger the toolbar
  await mainPage.click("#test-text", { clickCount: 3 });
  await mainPage.waitForTimeout(2000);

  // Screenshot the full page
  await mainPage.screenshot({
    path: path.join(SCREENSHOT_DIR, "hero-screenshot.png"),
    clip: { x: 0, y: 0, width: 1280, height: 800 },
  });

  console.log("Saved: hero-screenshot.png");
  await context.close();
});

test("capture popup screenshot", async () => {
  const { context, page, extensionId } = await launchWithExtension();

  // Navigate to popup
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await popupPage.waitForTimeout(500);

  await popupPage.screenshot({
    path: path.join(SCREENSHOT_DIR, "popup-screenshot.png"),
  });

  console.log("Saved: popup-screenshot.png");
  await context.close();
});

test("capture options screenshot", async () => {
  const { context, page, extensionId } = await launchWithExtension();

  // Wait for the auto-opened options page from install
  await page.waitForTimeout(1500);

  // Find the options page that was auto-opened
  let optionsPage = context.pages().find(p => p.url().includes("options.html"));
  if (!optionsPage) {
    optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: "load" });
  }
  await optionsPage.waitForTimeout(500);

  await optionsPage.screenshot({
    path: path.join(SCREENSHOT_DIR, "options-screenshot.png"),
  });

  console.log("Saved: options-screenshot.png");
  await context.close();
});
