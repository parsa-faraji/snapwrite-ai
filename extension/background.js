const FREE_DAILY_LIMIT = 5;
const TRIAL_DAYS = 7;

// ── Backend proxy URL (set this when you deploy your backend) ────────
// When set, all API calls go through YOUR server — users don't need keys.
// Leave empty to use direct API key mode (user provides their own key).
const BACKEND_URL = "https://snap-write-ai-production.up.railway.app";

// ── Prompts ──────────────────────────────────────────────────────────

const PROMPTS = {
  improve: (text) =>
    `You are an expert editor. Improve this text: make it clearer, more engaging, and polished. Preserve the original meaning and intent. Return ONLY the improved text.\n\n${text}`,
  reply: (text) =>
    `You are a helpful communication assistant. Write a thoughtful, natural reply to this message. Match the tone (formal/casual) of the original. Keep it concise but warm. Return ONLY the reply.\n\n${text}`,
  professional: (text) =>
    `Rewrite this text in a polished, professional tone suitable for business emails or reports. Keep the same meaning. Return ONLY the rewritten text.\n\n${text}`,
  casual: (text) =>
    `Rewrite this text in a relaxed, friendly, conversational tone — like texting a colleague you're comfortable with. Return ONLY the rewritten text.\n\n${text}`,
  shorter: (text) =>
    `Make this text much shorter. Cut filler, redundancy, and unnecessary words. Keep the core message. Return ONLY the shortened text.\n\n${text}`,
  longer: (text) =>
    `Expand this text with useful detail, examples, or context. Keep the same tone and style. Return ONLY the expanded text.\n\n${text}`,
  summarize: (text) =>
    `Summarize this in 2-3 clear, concise sentences that capture the key points. Return ONLY the summary.\n\n${text}`,
  fix: (text) =>
    `Fix all grammar, spelling, and punctuation errors. Do NOT change the meaning, style, or tone — only correct mistakes. Return ONLY the corrected text.\n\n${text}`,
  compose: (text) =>
    `You are a skilled writer. Follow the user's instruction and write exactly what they ask for. Be clear, well-structured, and match the implied tone. Return ONLY the written text.\n\n${text}`,
};

// Translate actions are dynamic: translate_spanish, translate_french, etc.
function getTranslatePrompt(text, lang) {
  return `Translate this text to ${lang}. Return ONLY the translation, nothing else.\n\n${text}`;
}

// ── Usage Tracking ──────────────────────────────────────────────────

function todayKey() {
  return `usage_${new Date().toISOString().slice(0, 10)}`;
}

async function getUsageToday() {
  const key = todayKey();
  const data = await chrome.storage.local.get(key);
  return data[key] || 0;
}

async function incrementUsage() {
  const key = todayKey();
  const current = await getUsageToday();
  await chrome.storage.local.set({ [key]: current + 1 });
  return current + 1;
}

async function isPro() {
  const data = await chrome.storage.sync.get(["pro", "installedAt"]);
  if (data.pro === true) return true;

  // Free trial: unlimited for first 7 days
  if (data.installedAt) {
    const installed = new Date(data.installedAt);
    const now = new Date();
    const daysSince = (now - installed) / (1000 * 60 * 60 * 24);
    if (daysSince < TRIAL_DAYS) return true;
  }

  return false;
}

async function getTrialDaysLeft() {
  const data = await chrome.storage.sync.get("installedAt");
  if (!data.installedAt) return 0;
  const installed = new Date(data.installedAt);
  const now = new Date();
  const daysSince = (now - installed) / (1000 * 60 * 60 * 24);
  const left = Math.max(0, Math.ceil(TRIAL_DAYS - daysSince));
  return left;
}

// ── API Calls ───────────────────────────────────────────────────────

async function getSettings() {
  const data = await chrome.storage.sync.get(["apiKey", "provider"]);
  return {
    apiKey: data.apiKey || "",
    provider: data.provider || "openai",
  };
}

async function callOpenAI(apiKey, prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a writing assistant embedded in a browser extension. Follow the user's instruction exactly. Return only the requested text — no preamble, no explanation, no quotes.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const json = await res.json();
  return json.choices[0].message.content.trim();
}

async function callAnthropic(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system:
        "You are a writing assistant embedded in a browser extension. Follow the user's instruction exactly. Return only the requested text — no preamble, no explanation, no quotes.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const json = await res.json();
  return json.content[0].text.trim();
}

async function callBackendProxy(action, text) {
  const res = await fetch(`${BACKEND_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const json = await res.json();
  return json.result;
}

async function callAI(action, text) {
  const truncated = text.slice(0, 5000);

  // If backend proxy is configured, use it (users don't need API keys)
  if (BACKEND_URL) {
    return callBackendProxy(action, truncated);
  }

  // Otherwise, use direct API key mode
  const settings = await getSettings();
  if (!settings.apiKey) {
    throw new Error("NO_API_KEY");
  }

  // Build prompt
  let prompt;
  if (action.startsWith("translate_")) {
    const lang = action.replace("translate_", "");
    const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
    prompt = getTranslatePrompt(truncated, langName);
  } else {
    const promptFn = PROMPTS[action];
    if (!promptFn) throw new Error(`Unknown action: ${action}`);
    prompt = promptFn(truncated);
  }

  if (settings.provider === "anthropic") {
    return callAnthropic(settings.apiKey, prompt);
  }
  return callOpenAI(settings.apiKey, prompt);
}

// ── Message Handler ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "AI_REQUEST") {
    handleAIRequest(request).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (request.type === "GET_USAGE") {
    Promise.all([getUsageToday(), isPro(), getTrialDaysLeft()]).then(
      ([usage, pro, trialDays]) => {
        sendResponse({ usage, limit: FREE_DAILY_LIMIT, pro, trialDays });
      }
    );
    return true;
  }

  if (request.type === "IS_PRO") {
    isPro().then((pro) => {
      sendResponse({ pro });
    });
    return true;
  }

  if (request.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }
});

async function handleAIRequest({ action, text }) {
  const pro = await isPro();
  if (!pro) {
    const usage = await getUsageToday();
    if (usage >= FREE_DAILY_LIMIT) {
      return { error: "LIMIT_REACHED" };
    }
  }

  try {
    const result = await callAI(action, text);
    await incrementUsage();
    return { result };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Context Menu ────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  // Create context menu items
  chrome.contextMenus.create({
    id: "qw-improve",
    title: "SnapWrite: Improve",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "qw-fix",
    title: "SnapWrite: Fix Grammar",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "qw-summarize",
    title: "SnapWrite: Summarize",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "qw-reply",
    title: "SnapWrite: Reply",
    contexts: ["selection"],
  });

  if (details.reason === "install") {
    // Record install date for free trial
    chrome.storage.sync.set({ installedAt: new Date().toISOString() });
    chrome.runtime.openOptionsPage();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText || !tab?.id) return;

  const actionMap = {
    "qw-improve": "improve",
    "qw-fix": "fix",
    "qw-summarize": "summarize",
    "qw-reply": "reply",
  };

  const action = actionMap[info.menuItemId];
  if (!action) return;

  const result = await handleAIRequest({
    action,
    text: info.selectionText,
  });

  // Send result to content script to display
  chrome.tabs.sendMessage(tab.id, {
    type: "SHOW_RESULT",
    ...result,
  });
});

// ── Keyboard Shortcut ───────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "trigger-snapwrite") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_TOOLBAR" });
    }
  }
});
