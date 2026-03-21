import { createServer } from "node:http";
import crypto from "node:crypto";
import OpenAI from "openai";
import Stripe from "stripe";

// ── Config ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || "openai"; // "openai" or "anthropic"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",");
const RATE_LIMIT_PER_IP = 30; // requests per hour per IP
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
  console.error("Either OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable is required");
  process.exit(1);
}

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// ── Rate limiter (in-memory, resets hourly) ─────────────────────────
const rateLimits = new Map();
setInterval(() => rateLimits.clear(), 60 * 60 * 1000);

function checkRateLimit(ip) {
  const count = rateLimits.get(ip) || 0;
  if (count >= RATE_LIMIT_PER_IP) return false;
  rateLimits.set(ip, count + 1);
  return true;
}

// ── Prompts ─────────────────────────────────────────────────────────
const SYSTEM =
  "You are a writing assistant embedded in a browser extension. Follow the user's instruction exactly. Return only the requested text — no preamble, no explanation, no quotes.";

const PROMPTS = {
  improve: (t) =>
    `Improve this text: make it clearer, more engaging, and polished. Preserve the original meaning.\n\n${t}`,
  reply: (t) =>
    `Write a thoughtful, natural reply to this message. Match the tone. Keep it concise but warm.\n\n${t}`,
  professional: (t) =>
    `Rewrite in a polished, professional tone for business. Keep the same meaning.\n\n${t}`,
  casual: (t) =>
    `Rewrite in a relaxed, friendly, conversational tone.\n\n${t}`,
  shorter: (t) =>
    `Make this much shorter. Cut filler and redundancy. Keep the core message.\n\n${t}`,
  longer: (t) =>
    `Expand with useful detail, examples, or context. Keep the same tone.\n\n${t}`,
  summarize: (t) =>
    `Summarize in 2-3 clear sentences that capture the key points.\n\n${t}`,
  fix: (t) =>
    `Fix all grammar, spelling, and punctuation. Do NOT change meaning or tone.\n\n${t}`,
  compose: (t) =>
    `Follow the user's instruction and write exactly what they ask for. Be clear, well-structured, and match the implied tone. Return ONLY the written text.\n\n${t}`,
};

function buildPrompt(action, text) {
  if (action.startsWith("translate_")) {
    const lang = action.replace("translate_", "");
    const name = lang.charAt(0).toUpperCase() + lang.slice(1);
    return `Translate to ${name}. Return ONLY the translation.\n\n${text}`;
  }
  const fn = PROMPTS[action];
  if (!fn) throw new Error(`Unknown action: ${action}`);
  return fn(text);
}

// ── AI Provider Calls ───────────────────────────────────────────────

async function callOpenAI(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt },
    ],
    max_tokens: 2048,
    temperature: 0.5,
  });
  return completion.choices[0].message.content.trim();
}

async function callAnthropic(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error ${res.status}`);
  }

  const json = await res.json();
  return json.content[0].text.trim();
}

async function callAI(prompt, provider) {
  // Per-request provider override takes precedence, then server-level AI_PROVIDER
  const selected = provider || AI_PROVIDER;

  if (selected === "anthropic" && ANTHROPIC_API_KEY) {
    return callAnthropic(prompt);
  }
  if (selected === "openai" && openai) {
    return callOpenAI(prompt);
  }
  // Fallback: use whichever key is available
  if (openai) return callOpenAI(prompt);
  if (ANTHROPIC_API_KEY) return callAnthropic(prompt);
  throw new Error("No AI provider configured");
}

// ── License Key Generator ───────────────────────────────────────────
function generateLicenseKey() {
  const bytes = crypto.randomBytes(16);
  const hex = bytes.toString("hex").toUpperCase();
  return `SW-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

// ── HTTP Server ─────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // ── Stripe Webhook (no CORS, raw body) ────────────────────────────
  if (req.method === "POST" && pathname === "/api/stripe-webhook") {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      res.writeHead(503, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Stripe not configured" }));
    }

    try {
      const rawBody = await readRawBody(req);
      const sig = req.headers["stripe-signature"];
      const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const customerId = session.customer;
        const licenseKey = generateLicenseKey();

        await stripe.customers.update(customerId, {
          metadata: { license_key: licenseKey, license_status: "active" },
        });

        console.log(`License generated: ${licenseKey} for customer ${customerId}`);
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await stripe.customers.update(customerId, {
          metadata: { license_status: "cancelled" },
        });

        console.log(`Subscription cancelled for customer ${customerId}`);
      }

      if (event.type === "customer.subscription.updated") {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status === "active" ? "active" : subscription.status;

        await stripe.customers.update(customerId, {
          metadata: { license_status: status },
        });

        console.log(`Subscription updated to ${status} for customer ${customerId}`);
      }

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await stripe.customers.update(customerId, {
          metadata: { license_status: "past_due" },
        });

        console.log(`Payment failed for customer ${customerId}`);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ received: true }));
    } catch (err) {
      console.error("Stripe webhook error:", err.message);
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // ── CORS — allow chrome-extension:// origins and configured origins
  const origin = req.headers.origin || "*";
  const isChromeExtension = origin.startsWith("chrome-extension://");
  const isSnapwriteSite = origin === "https://snapwrite.io";
  const allowOrigin =
    ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin) || isChromeExtension || isSnapwriteSite
      ? origin
      : "";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Health check
  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", service: "snapwrite-api", provider: AI_PROVIDER }));
  }

  // Waitlist endpoint
  if (req.method === "POST" && pathname === "/api/waitlist") {
    try {
      const body = await readBody(req);
      const { email } = JSON.parse(body);
      if (!email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "email required" }));
      }
      // Append to file for persistence
      const fs = await import("node:fs/promises");
      await fs.appendFile("waitlist.txt", `${email},${new Date().toISOString()}\n`);
      console.log(`Waitlist signup: ${email}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to save" }));
    }
  }

  // Main endpoint
  if (req.method === "POST" && pathname === "/api/generate") {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    if (!checkRateLimit(ip)) {
      res.writeHead(429, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Rate limit exceeded. Try again later." }));
    }

    try {
      const body = await readBody(req);
      const { action, text, provider } = JSON.parse(body);

      if (!action || !text) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "action and text required" }));
      }

      const truncated = text.slice(0, 5000);
      const prompt = buildPrompt(action, truncated);
      const result = await callAI(prompt, provider);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ result }));
    } catch (err) {
      console.error("API error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "Something went wrong. Please try again." })
      );
    }
  }

  // ── Validate License ──────────────────────────────────────────────
  if (req.method === "POST" && pathname === "/api/validate-license") {
    if (!stripe) {
      res.writeHead(503, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Stripe not configured" }));
    }

    try {
      const body = await readBody(req);
      const { licenseKey } = JSON.parse(body);

      if (!licenseKey) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "licenseKey required" }));
      }

      const result = await stripe.customers.search({
        query: `metadata["license_key"]:"${licenseKey}"`,
      });

      if (result.data.length === 0) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ valid: false, status: "not_found" }));
      }

      const customer = result.data[0];
      const status = customer.metadata.license_status || "unknown";

      if (status === "active") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ valid: true, status: "active" }));
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ valid: false, status }));
    } catch (err) {
      console.error("License validation error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Validation failed" }));
    }
  }

  // ── Stripe Billing Portal ─────────────────────────────────────────
  if (req.method === "GET" && pathname === "/api/stripe-portal") {
    if (!stripe) {
      res.writeHead(503, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Stripe not configured" }));
    }

    try {
      const licenseKey = parsedUrl.searchParams.get("license_key");

      if (!licenseKey) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "license_key query param required" }));
      }

      const result = await stripe.customers.search({
        query: `metadata["license_key"]:"${licenseKey}"`,
      });

      if (result.data.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Customer not found" }));
      }

      const customer = result.data[0];
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: "https://snapwrite.io",
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ url: portalSession.url }));
    } catch (err) {
      console.error("Stripe portal error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Failed to create portal session" }));
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

server.listen(PORT, () => {
  const provider = AI_PROVIDER === "anthropic" && ANTHROPIC_API_KEY ? "Anthropic" : "OpenAI";
  console.log(`SnapWrite API running on port ${PORT} (${provider})`);
});
