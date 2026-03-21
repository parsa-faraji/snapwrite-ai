// @ts-check
import { test, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../extension");
const ASSETS_DIR = path.resolve(__dirname, "../website/assets");

// Styled email compose page for the demo
const EMAIL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f0f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px;
    }
    .email-compose {
      width: 680px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      overflow: hidden;
    }
    .email-header {
      padding: 14px 20px;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fafafa;
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-red { background: #ff5f57; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #28c840; }
    .email-header span {
      margin-left: 16px;
      font-size: 14px;
      color: #888;
      font-weight: 500;
    }
    .email-fields {
      padding: 14px 24px;
      border-bottom: 1px solid #f0f0f0;
    }
    .email-field {
      display: flex;
      align-items: center;
      padding: 5px 0;
      font-size: 14px;
    }
    .email-field label {
      color: #999;
      width: 55px;
      font-size: 13px;
      font-weight: 500;
    }
    .email-field span { color: #333; }
    .email-subject {
      padding: 14px 24px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 16px;
      font-weight: 600;
      color: #222;
    }
    .email-body {
      padding: 24px;
      font-size: 15px;
      line-height: 1.75;
      color: #333;
      min-height: 180px;
    }
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
    <div class="email-subject">Re: Project Update — Next Steps</div>
    <div class="email-body" contenteditable="true">
      <p id="demo-text">hey mike, wanted to follw up on the thing we talk about last week. i think we should definately move forward with the project becuase its going to be really good for the team and eveyone will benefit from it. let me know what u think</p>
    </div>
  </div>
</body>
</html>`;

test("record extension demo video", async () => {
  test.setTimeout(120000);

  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-first-run",
      "--disable-gpu",
    ],
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: ASSETS_DIR,
      size: { width: 1280, height: 720 },
    },
  });

  // Wait for extension install flow to settle
  await new Promise((r) => setTimeout(r, 3000));

  // Close all extra pages (options page auto-opens on install)
  const allPages = context.pages();
  for (let i = 1; i < allPages.length; i++) {
    await allPages[i].close();
  }

  const page = allPages[0];

  // Step 1: Show the email compose page (pause for viewer)
  await page.setContent(EMAIL_HTML, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Step 2: Slowly move mouse to the text, then select it
  const textEl = page.locator("#demo-text");
  const box = await textEl.boundingBox();
  if (!box) throw new Error("Could not find demo text");

  // Move mouse to start of text
  await page.mouse.move(box.x + 10, box.y + 10, { steps: 20 });
  await page.waitForTimeout(500);

  // Triple-click to select all text in the paragraph
  await page.click("#demo-text", { clickCount: 3 });
  await page.waitForTimeout(2000);

  // Step 3: The SnapWrite toolbar should appear — wait for it
  // The toolbar is injected via Shadow DOM, so we wait a bit
  await page.waitForTimeout(3000);

  // Step 4: Try to find and click the "Improve" button in the shadow DOM
  // The toolbar is in a shadow root, so we use evaluate
  const clicked = await page.evaluate(() => {
    const hosts = document.querySelectorAll("snapwrite-toolbar");
    for (const host of hosts) {
      const shadow = host.shadowRoot;
      if (shadow) {
        const buttons = shadow.querySelectorAll("button");
        for (const btn of buttons) {
          if (btn.textContent?.trim() === "Improve") {
            btn.click();
            return true;
          }
        }
      }
    }
    return false;
  });

  if (clicked) {
    console.log("Clicked Improve button!");
    // Wait for the AI response to appear
    await page.waitForTimeout(8000);
  } else {
    console.log("Toolbar not found in shadow DOM, capturing what we have");
    await page.waitForTimeout(2000);
  }

  // Step 5: Final pause to show the result
  await page.waitForTimeout(3000);

  // Close context — this saves the video
  await context.close();

  console.log(`Demo video saved to ${ASSETS_DIR}/`);
});
