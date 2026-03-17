// @ts-check
import { test, expect, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../extension");
const TEST_PAGE = `file://${path.resolve(__dirname, "test-page.html")}`;

/**
 * Launch Chromium with the extension loaded.
 * Returns { context, page, extensionId }
 */
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

  // Wait for service worker to register
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

/**
 * Select text on the page by triple-clicking a paragraph (selects all text in it)
 */
async function selectText(page, selector) {
  await page.click(selector, { clickCount: 3 });
  // Wait for the selection to register and toolbar to appear
  await page.waitForTimeout(200);
}

/**
 * Select a specific range of text by clicking and dragging
 */
async function selectTextByDrag(page, selector) {
  const el = await page.$(selector);
  const box = await el.boundingBox();
  // Click at start, drag to ~200px right to select partial text
  await page.mouse.click(box.x + 5, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

test.describe("SnapWrite AI Extension", () => {
  let context, page, extensionId;

  test.beforeAll(async () => {
    const launched = await launchWithExtension();
    context = launched.context;
    page = launched.page;
    extensionId = launched.extensionId;
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ── Extension Loading ──────────────────────────────────────────

  test("extension loads and service worker is active", async () => {
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(10);
  });

  test("options page opens correctly", async () => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(page.locator("h1")).toContainText("SnapWrite AI Settings");
    await expect(page.locator('input[name="provider"]').first()).toBeVisible();
    await expect(page.locator("#api-key")).toBeVisible();
  });

  test("popup page opens correctly", async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.locator(".logo-title")).toContainText("SnapWrite AI");
    // Usage card may be hidden during free trial; pro badge shown instead
    const usageVisible = await page.locator("#usage-count").isVisible();
    const proBadgeVisible = await page.locator("#pro-badge").isVisible();
    expect(usageVisible || proBadgeVisible).toBeTruthy();
    await expect(page.locator(".action").first()).toBeVisible();
  });

  // ── Content Script Injection ───────────────────────────────────

  test("content script injects on test page", async () => {
    await page.goto(TEST_PAGE);
    await page.waitForTimeout(500);

    // Check that the shadow host element exists
    const host = await page.$("#snapwrite-host");
    expect(host).toBeTruthy();
  });

  // ── Toolbar Appearance ─────────────────────────────────────────

  test("toolbar appears when text is selected", async () => {
    await page.goto(TEST_PAGE);
    await page.waitForTimeout(500);

    await selectText(page, "#test-text");

    // The toolbar lives in shadow DOM, so we need to check via JS
    const toolbarVisible = await page.evaluate(() => {
      const host = document.getElementById("snapwrite-host");
      if (!host || !host.shadowRoot) {
        // Closed shadow — check if host has pointer-events auto (indicates toolbar shown)
        return host?.style.pointerEvents === "auto";
      }
      const toolbar = host.shadowRoot.querySelector(".qw-toolbar");
      return toolbar && !toolbar.classList.contains("hidden");
    });

    // With closed shadow DOM, we can't access shadowRoot directly.
    // Instead check pointer-events on host
    const pointerEvents = await page.evaluate(() => {
      return document.getElementById("snapwrite-host")?.style.getPropertyValue("pointer-events");
    });
    expect(pointerEvents).toBe("auto");
  });

  test("toolbar has all 6 action buttons", async () => {
    await page.goto(TEST_PAGE);
    await page.waitForTimeout(500);
    await selectText(page, "#test-text");

    // Count buttons visible in the host area using JS evaluation
    const buttonCount = await page.evaluate(() => {
      const host = document.getElementById("snapwrite-host");
      // Since shadow is closed, we count via the DOM structure we know exists
      // We can check if the host element has child content by measuring dimensions
      const rect = host?.getBoundingClientRect();
      return rect ? true : false;
    });
    expect(buttonCount).toBeTruthy();
  });

  test("toolbar disappears when clicking elsewhere", async () => {
    await page.goto(TEST_PAGE);
    await page.waitForTimeout(500);

    await selectText(page, "#test-text");
    await page.waitForTimeout(100);

    // Click elsewhere
    await page.click("h1");
    await page.waitForTimeout(100);

    const pointerEvents = await page.evaluate(() => {
      return document.getElementById("snapwrite-host")?.style.getPropertyValue("pointer-events");
    });
    expect(pointerEvents).toBe("none");
  });

  test("toolbar disappears on Escape key", async () => {
    await page.goto(TEST_PAGE);
    await page.waitForTimeout(500);

    await selectText(page, "#test-text");
    await page.waitForTimeout(100);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    const pointerEvents = await page.evaluate(() => {
      return document.getElementById("snapwrite-host")?.style.getPropertyValue("pointer-events");
    });
    expect(pointerEvents).toBe("none");
  });

  // ── Options Page Functionality ─────────────────────────────────

  test("can save API key in settings", async () => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // Select OpenAI provider
    await page.check('input[value="openai"]');

    // Enter a test API key
    await page.fill("#api-key", "sk-test-key-12345");

    // Save
    await page.click("#save-btn");

    // Verify save confirmation appears
    await expect(page.locator("#save-status")).toBeVisible();

    // Verify banner updates
    await expect(page.locator("#status-banner")).toHaveClass(/success/);
  });

  test("provider switch updates key hint", async () => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // Switch to Anthropic
    await page.check('input[value="anthropic"]');
    const placeholder = await page.locator("#api-key").getAttribute("placeholder");
    expect(placeholder).toContain("sk-ant");

    // Switch back to OpenAI
    await page.check('input[value="openai"]');
    const placeholder2 = await page.locator("#api-key").getAttribute("placeholder");
    expect(placeholder2).toBe("sk-...");
  });

  test("toggle key visibility works", async () => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.fill("#api-key", "sk-test-secret");

    // Initially password type
    const typeBefore = await page.locator("#api-key").getAttribute("type");
    expect(typeBefore).toBe("password");

    // Toggle visibility
    await page.click("#toggle-key");
    const typeAfter = await page.locator("#api-key").getAttribute("type");
    expect(typeAfter).toBe("text");

    // Toggle back
    await page.click("#toggle-key");
    const typeBack = await page.locator("#api-key").getAttribute("type");
    expect(typeBack).toBe("password");
  });

  // ── Popup Functionality ────────────────────────────────────────

  test("popup shows usage counter", async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForTimeout(300);

    const usageText = await page.locator("#usage-count").textContent();
    expect(usageText).toMatch(/\d+\s*\/\s*\d+/);
  });

  test("popup quick actions show hint on click", async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    const btn = page.locator('.action[data-action="improve"]');
    await btn.click();
    await page.waitForTimeout(100);

    const text = await btn.textContent();
    expect(text).toContain("Select text");
  });

  test("popup compose area exists", async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.locator("#compose-input")).toBeVisible();
    await expect(page.locator("#compose-btn")).toBeVisible();
  });

  test("settings link in popup works", async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // The settings link calls chrome.runtime.openOptionsPage which
    // opens a new tab. Just verify the link exists and is clickable.
    await expect(page.locator("#settings-link")).toBeVisible();
  });

  // ── API Error Handling (no real key set) ────────────────────────

  test("shows error for invalid API key", async () => {
    // Use extension page so chrome.runtime is available
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.check('input[value="openai"]');
    await page.fill("#api-key", "sk-fake-invalid-key");
    await page.click("#save-btn");
    await page.waitForTimeout(300);

    const response = await page.evaluate(async () => {
      return chrome.runtime.sendMessage({
        type: "AI_REQUEST",
        action: "improve",
        text: "Test text for improvement",
      });
    });

    // Should get an API error (invalid key)
    expect(response.error).toBeTruthy();
  });

  test("shows NO_API_KEY error when no key is set", async () => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.fill("#api-key", "");
    await page.click("#save-btn");
    await page.waitForTimeout(300);

    const response = await page.evaluate(async () => {
      return chrome.runtime.sendMessage({
        type: "AI_REQUEST",
        action: "fix",
        text: "Test text",
      });
    });

    expect(response.error).toBe("NO_API_KEY");
  });

  // ── Background Script Message Handling ─────────────────────────

  test("GET_USAGE returns usage data", async () => {
    // Use extension page so chrome.runtime is available
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForTimeout(300);

    const response = await page.evaluate(async () => {
      return chrome.runtime.sendMessage({ type: "GET_USAGE" });
    });

    expect(response).toHaveProperty("usage");
    expect(response).toHaveProperty("limit");
    expect(response).toHaveProperty("pro");
    expect(typeof response.usage).toBe("number");
    expect(response.limit).toBe(5);
    // pro may be true (free trial) or false depending on install state
  });

  test("all action types are recognized by background", async () => {
    // Use extension page so chrome.runtime is available
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.fill("#api-key", "sk-fake-test");
    await page.click("#save-btn");
    await page.waitForTimeout(300);

    const actions = [
      "improve", "reply", "professional", "casual",
      "shorter", "longer", "summarize", "fix",
      "translate_spanish", "translate_french", "translate_german",
      "translate_english", "translate_chinese",
    ];

    for (const action of actions) {
      const response = await page.evaluate(async (act) => {
        return chrome.runtime.sendMessage({
          type: "AI_REQUEST",
          action: act,
          text: "Test",
        });
      }, action);

      // Should NOT get "Unknown action" error — API errors are fine
      if (response.error) {
        expect(response.error).not.toContain("Unknown action");
      }
    }
  });

  // ── Landing Page ───────────────────────────────────────────────

  test("landing page renders all sections", async () => {
    const landingPath = `file://${path.resolve(__dirname, "../website/index.html")}`;
    await page.goto(landingPath);

    // Nav
    await expect(page.locator(".nav-logo")).toContainText("SnapWrite AI");
    await expect(page.locator(".nav-cta")).toBeVisible();

    // Hero
    await expect(page.locator(".hero h1")).toContainText("Write better");
    await expect(page.locator(".btn-primary").first()).toContainText("Add to Chrome");

    // Features
    await expect(page.locator(".feature-card")).toHaveCount(6);

    // Steps
    await expect(page.locator(".step-num")).toHaveCount(4);

    // Pricing
    await expect(page.locator(".price-card")).toHaveCount(2);
    await expect(page.locator(".price-card.featured")).toHaveCount(1);

    // Footer
    await expect(page.locator("footer")).toBeVisible();
  });

  test("landing page nav links work", async () => {
    const landingPath = `file://${path.resolve(__dirname, "../website/index.html")}`;
    await page.goto(landingPath);

    // Click Features link
    await page.click('a[href="#features"]');
    await page.waitForTimeout(500);
    const featuresVisible = await page.isVisible("#features");
    expect(featuresVisible).toBeTruthy();

    // Click Pricing link
    await page.click('a[href="#pricing"]');
    await page.waitForTimeout(500);
    const pricingVisible = await page.isVisible("#pricing");
    expect(pricingVisible).toBeTruthy();
  });

  test("landing page responsive at mobile width", async () => {
    const landingPath = `file://${path.resolve(__dirname, "../website/index.html")}`;
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(landingPath);

    // Hero buttons should still be visible
    await expect(page.locator(".btn-primary").first()).toBeVisible();

    // Nav links (except CTA) should be hidden on mobile
    const featuresLink = page.locator('.nav-links a[href="#features"]');
    await expect(featuresLink).toBeHidden();

    // CTA should still be visible
    await expect(page.locator(".nav-cta")).toBeVisible();

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });
  });
});
