(function () {
  "use strict";

  // Prevent double injection
  if (window.__snapwriteInjected) return;
  window.__snapwriteInjected = true;

  // ── Config ──────────────────────────────────────────────────────

  const ACTIONS = [
    { id: "improve", label: "Improve", icon: "wand" },
    { id: "reply", label: "Reply", icon: "reply" },
    {
      id: "rewrite",
      label: "Rewrite",
      icon: "pen",
      submenu: [
        { id: "professional", label: "Professional" },
        { id: "casual", label: "Casual" },
        { id: "shorter", label: "Shorter" },
        { id: "longer", label: "Longer" },
      ],
    },
    { id: "summarize", label: "Summarize", icon: "list" },
    { id: "fix", label: "Fix Grammar", icon: "check" },
    {
      id: "translate",
      label: "Translate",
      icon: "globe",
      submenu: [
        { id: "translate_spanish", label: "Spanish" },
        { id: "translate_french", label: "French" },
        { id: "translate_german", label: "German" },
        { id: "translate_portuguese", label: "Portuguese" },
        { id: "translate_chinese", label: "Chinese" },
        { id: "translate_japanese", label: "Japanese" },
        { id: "translate_korean", label: "Korean" },
        { id: "translate_arabic", label: "Arabic" },
        { id: "translate_english", label: "English" },
      ],
    },
  ];

  const ICONS = {
    wand: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></svg>`,
    reply: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`,
    pen: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>`,
    list: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    globe: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
    chevron: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    insert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m8 8 4-5 4 5"/></svg>`,
  };

  // ── State ───────────────────────────────────────────────────────

  let selectedText = "";
  let selectionRange = null;

  // Chrome Web Store URL (update with your real extension ID)
  const CHROME_STORE_URL = "https://chromewebstore.google.com/detail/snapwrite-ai/bpclponaiaeckhcpgfmojbkhkkgnlifg";
  const CHROME_STORE_REVIEW_URL = CHROME_STORE_URL + "/reviews";

  // ── Viral Growth Helpers ───────────────────────────────────────

  async function checkIfPro() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "IS_PRO" });
      return resp && resp.pro === true;
    } catch {
      return false;
    }
  }

  async function getLifetimeResultCount() {
    const data = await chrome.storage.local.get("snapwrite_lifetime_uses");
    return data.snapwrite_lifetime_uses || 0;
  }

  async function incrementLifetimeResultCount() {
    const current = await getLifetimeResultCount();
    const next = current + 1;
    await chrome.storage.local.set({ snapwrite_lifetime_uses: next });
    return next;
  }

  async function hasShownSharePrompt() {
    const data = await chrome.storage.local.get("snapwrite_share_shown");
    return data.snapwrite_share_shown === true;
  }

  async function markSharePromptShown() {
    await chrome.storage.local.set({ snapwrite_share_shown: true });
  }

  async function hasShownReviewPrompt() {
    const data = await chrome.storage.local.get("snapwrite_review_shown");
    return data.snapwrite_review_shown === true;
  }

  async function markReviewPromptShown() {
    await chrome.storage.local.set({ snapwrite_review_shown: true });
  }

  function showPromoBanner(config) {
    // Remove any existing promo banner
    const existing = shadow.querySelector(".qw-promo-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.className = "qw-promo-banner";
    banner.innerHTML = `
      <div class="qw-promo-content">
        <p class="qw-promo-text">${escapeHtml(config.message)}</p>
        <div class="qw-promo-buttons">
          <button class="qw-promo-action">${escapeHtml(config.actionLabel)}</button>
          <button class="qw-promo-dismiss">${escapeHtml(config.dismissLabel)}</button>
        </div>
      </div>`;

    // Position below the result panel
    const rRect = result.getBoundingClientRect();
    const scrollY = window.scrollY;
    banner.style.left = result.style.left;
    banner.style.top = (rRect.bottom + scrollY + 8) + "px";

    shadow.appendChild(banner);

    banner.querySelector(".qw-promo-action").addEventListener("click", () => {
      config.onAction();
      banner.remove();
    });

    banner.querySelector(".qw-promo-dismiss").addEventListener("click", () => {
      if (config.onDismiss) config.onDismiss();
      banner.remove();
    });
  }

  async function maybeShowViralPrompts() {
    const count = await incrementLifetimeResultCount();

    if (count >= 3 && !(await hasShownSharePrompt())) {
      await markSharePromptShown();
      showPromoBanner({
        message: "Enjoying SnapWrite AI? Share it with a friend! \uD83C\uDF89",
        actionLabel: "Share",
        dismissLabel: "Maybe Later",
        onAction: () => {
          navigator.clipboard.writeText(CHROME_STORE_URL);
          // Brief feedback
          const btn = shadow.querySelector(".qw-promo-action");
          if (btn) btn.textContent = "Link Copied!";
        },
        onDismiss: () => {},
      });
      return;
    }

    if (count >= 10 && !(await hasShownReviewPrompt())) {
      await markReviewPromptShown();
      showPromoBanner({
        message: "You\u2019ve used SnapWrite AI 10 times! \u2B50 Would you mind leaving a quick review?",
        actionLabel: "Leave Review",
        dismissLabel: "Not Now",
        onAction: () => {
          window.open(CHROME_STORE_REVIEW_URL, "_blank");
        },
        onDismiss: () => {},
      });
    }
  }

  // ── Shadow DOM Setup ────────────────────────────────────────────

  const host = document.createElement("div");
  host.id = "snapwrite-host";
  host.style.cssText = "position:absolute !important; top:0 !important; left:0 !important; width:0 !important; height:0 !important; overflow:visible !important; z-index:2147483647 !important; pointer-events:none !important; margin:0 !important; padding:0 !important; border:none !important; background:none !important;";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = buildStyles();
  shadow.appendChild(style);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "qw-toolbar";
  shadow.appendChild(toolbar);

  // Result panel
  const result = document.createElement("div");
  result.className = "qw-result";
  shadow.appendChild(result);

  // ── Event Listeners ─────────────────────────────────────────────

  document.addEventListener("mouseup", onMouseUp, true);
  document.addEventListener("mousedown", onMouseDown, true);
  document.addEventListener("keydown", onKeyDown, true);

  function onMouseUp(e) {
    // Ignore clicks inside our UI
    if (e.target === host || host.contains(e.target)) return;

    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();

      if (text && text.length > 1) {
        selectedText = text;
        try {
          selectionRange = sel.getRangeAt(0).cloneRange();
        } catch {
          selectionRange = null;
        }
        showToolbar(e.pageX, e.pageY);
      }
    }, 20);
  }

  function onMouseDown(e) {
    // With closed shadow DOM, clicks inside shadow appear as clicks on host
    if (e.target === host || e.composedPath().includes(host)) {
      return; // click is inside our UI, don't hide
    }
    hideAll();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") hideAll();
  }

  // ── Message listener (context menu results + keyboard shortcut) ──

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SHOW_RESULT") {
      // Show result from context menu action at center of viewport
      const x = window.scrollX + window.innerWidth / 2;
      const y = window.scrollY + window.innerHeight / 3;
      toolbar.innerHTML = "";
      toolbar.classList.remove("hidden");
      toolbar.style.left = x - 200 + "px";
      toolbar.style.top = y + "px";
      host.style.setProperty("pointer-events", "auto", "important");

      if (msg.error) {
        showError(msg.error);
      } else if (msg.result) {
        showSuccess(msg.result);
      }
    }

    if (msg.type === "TRIGGER_TOOLBAR") {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 1) {
        selectedText = text;
        try {
          selectionRange = sel.getRangeAt(0).cloneRange();
          const rect = selectionRange.getBoundingClientRect();
          showToolbar(
            rect.left + rect.width / 2 + window.scrollX,
            rect.top + window.scrollY
          );
        } catch {
          showToolbar(
            window.scrollX + window.innerWidth / 2,
            window.scrollY + window.innerHeight / 3
          );
        }
      }
    }
  });

  // ── Toolbar ─────────────────────────────────────────────────────

  function showToolbar(x, y) {
    toolbar.innerHTML = "";
    toolbar.classList.remove("hidden");
    result.classList.add("hidden");
    host.style.setProperty("pointer-events", "auto", "important");

    const row = document.createElement("div");
    row.className = "qw-row";

    ACTIONS.forEach((action) => {
      const btn = document.createElement("button");
      btn.className = "qw-btn";
      btn.innerHTML = `${ICONS[action.icon]}<span>${action.label}</span>`;

      if (action.submenu) {
        btn.innerHTML += ICONS.chevron;
        btn.classList.add("has-sub");
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleSubmenu(btn, action.submenu);
        });
      } else {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          runAction(action.id);
        });
      }

      row.appendChild(btn);
    });

    toolbar.appendChild(row);

    // Position near selection
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const vw = document.documentElement.clientWidth;

    let left = x - 200;
    let top = y - 55;

    // Keep in viewport
    if (left < scrollX + 8) left = scrollX + 8;
    if (left + 420 > scrollX + vw) left = scrollX + vw - 430;
    if (top < scrollY + 8) top = y + 15;

    toolbar.style.left = left + "px";
    toolbar.style.top = top + "px";
  }

  function toggleSubmenu(btn, items) {
    // Remove existing submenu
    const existing = toolbar.querySelector(".qw-submenu");
    if (existing) {
      existing.remove();
      return;
    }

    const sub = document.createElement("div");
    sub.className = "qw-submenu";

    items.forEach((item) => {
      const sbtn = document.createElement("button");
      sbtn.className = "qw-sub-btn";
      sbtn.textContent = item.label;
      sbtn.addEventListener("click", (e) => {
        e.stopPropagation();
        runAction(item.id);
      });
      sub.appendChild(sbtn);
    });

    // Position submenu below the button
    const rect = btn.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    sub.style.left = rect.left - toolbarRect.left + "px";
    sub.style.top = rect.bottom - toolbarRect.top + 4 + "px";

    toolbar.appendChild(sub);
  }

  // ── Execute Action ──────────────────────────────────────────────

  async function runAction(actionId) {
    // Close submenu
    const sub = toolbar.querySelector(".qw-submenu");
    if (sub) sub.remove();

    showLoading();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "AI_REQUEST",
        action: actionId,
        text: selectedText,
      });

      if (response.error === "LIMIT_REACHED") {
        showLimitReached();
      } else if (response.error === "NO_API_KEY") {
        showNoKey();
      } else if (response.error) {
        showError(response.error);
      } else {
        showSuccess(response.result);
      }
    } catch (err) {
      showError(err.message || "Something went wrong");
    }
  }

  // ── Result Panel ────────────────────────────────────────────────

  function positionResult() {
    result.classList.remove("hidden");
    const tRect = toolbar.getBoundingClientRect();
    const scrollY = window.scrollY;
    result.style.left = toolbar.style.left;
    result.style.top = tRect.bottom + scrollY + 6 + "px";

    // Constrain width
    const vw = document.documentElement.clientWidth;
    const rLeft = parseFloat(result.style.left);
    if (rLeft + 400 > window.scrollX + vw) {
      result.style.left = window.scrollX + vw - 410 + "px";
    }
  }

  function showLoading() {
    result.innerHTML = `
      <div class="qw-loading">
        <div class="qw-spinner"></div>
        <span>Writing...</span>
      </div>`;
    positionResult();
  }

  function showSuccess(text) {
    result.innerHTML = `
      <div class="qw-success">
        <div class="qw-text">${escapeHtml(text)}</div>
        <div class="qw-bar">
          <button class="qw-action-btn qw-copy">${ICONS.copy} Copy</button>
          <button class="qw-action-btn qw-insert">${ICONS.insert} Replace</button>
          <button class="qw-action-btn qw-close">${ICONS.close}</button>
        </div>
      </div>`;
    positionResult();

    result.querySelector(".qw-copy").addEventListener("click", async () => {
      // Check if user is Pro to decide on watermark
      const pro = await checkIfPro();
      const copyText = pro
        ? text
        : text + "\n\n\u2014 Written with SnapWrite AI (Free Chrome Extension)";

      navigator.clipboard.writeText(copyText).then(() => {
        const btn = result.querySelector(".qw-copy");
        btn.innerHTML = `${ICONS.check} Copied!`;
        setTimeout(() => (btn.innerHTML = `${ICONS.copy} Copy`), 1500);
      });
    });

    result.querySelector(".qw-insert").addEventListener("click", () => {
      insertText(text);
      hideAll();
    });

    result.querySelector(".qw-close").addEventListener("click", hideAll);

    // Check for viral growth prompts (share / review)
    maybeShowViralPrompts();
  }

  function showLimitReached() {
    result.innerHTML = `
      <div class="qw-limit">
        <strong>Daily free limit reached</strong>
        <p>Upgrade to SnapWrite Pro for unlimited AI writing.</p>
        <button class="qw-upgrade-btn">Upgrade — $9.99/mo</button>
      </div>`;
    positionResult();
    result.querySelector(".qw-upgrade-btn").addEventListener("click", () => {
      window.open("https://safaraji.gumroad.com/l/snapwrite-pro", "_blank");
    });
  }

  function showNoKey() {
    result.innerHTML = `
      <div class="qw-limit">
        <strong>API key required</strong>
        <p>Set up your AI provider key to get started.</p>
        <button class="qw-settings-link">Open Settings</button>
      </div>`;
    positionResult();

    result.querySelector(".qw-settings-link").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
    });
  }

  function showError(msg) {
    result.innerHTML = `
      <div class="qw-error">
        <strong>Error</strong>
        <p>${escapeHtml(msg)}</p>
      </div>`;
    positionResult();
  }

  // ── Helpers ─────────────────────────────────────────────────────

  function hideAll() {
    toolbar.classList.add("hidden");
    toolbar.innerHTML = "";
    result.classList.add("hidden");
    result.innerHTML = "";
    // Remove any promo banners
    const promo = shadow.querySelector(".qw-promo-banner");
    if (promo) promo.remove();
    host.style.setProperty("pointer-events", "none", "important");
  }

  function insertText(text) {
    try {
      if (selectionRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(selectionRange);
      }
      // Try execCommand first (works for contenteditable)
      if (!document.execCommand("insertText", false, text)) {
        // Fallback for textareas/inputs
        const el = document.activeElement;
        if (el && ("selectionStart" in el)) {
          const s = el.selectionStart;
          const e = el.selectionEnd;
          el.value = el.value.slice(0, s) + text + el.value.slice(e);
          el.selectionStart = el.selectionEnd = s + text.length;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } catch {
      // Last resort: copy to clipboard
      navigator.clipboard.writeText(text);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Styles ──────────────────────────────────────────────────────

  function buildStyles() {
    return `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      .qw-toolbar, .qw-result {
        position: absolute;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        color: #1a1a2e;
        pointer-events: auto;
      }

      .hidden { display: none !important; }

      /* ── Toolbar ── */
      .qw-toolbar {
        background: #fff;
        border: 1px solid #e2e4e9;
        border-radius: 10px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06);
        padding: 4px;
        animation: qw-fade-in 0.12s ease-out;
      }

      .qw-row {
        display: flex;
        gap: 2px;
        flex-wrap: nowrap;
      }

      .qw-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 10px;
        border: none;
        border-radius: 7px;
        background: transparent;
        color: #374151;
        font-size: 12.5px;
        font-family: inherit;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.1s, color 0.1s;
      }
      .qw-btn:hover {
        background: #f0f1ff;
        color: #4338ca;
      }
      .qw-btn svg { flex-shrink: 0; }
      .qw-btn.has-sub { padding-right: 6px; }

      /* ── Submenu ── */
      .qw-submenu {
        position: absolute;
        background: #fff;
        border: 1px solid #e2e4e9;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        padding: 4px;
        display: flex;
        flex-direction: column;
        gap: 1px;
        animation: qw-fade-in 0.1s ease-out;
        z-index: 10;
      }
      .qw-sub-btn {
        display: block;
        width: 100%;
        text-align: left;
        padding: 6px 14px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #374151;
        font-size: 12.5px;
        font-family: inherit;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.1s, color 0.1s;
      }
      .qw-sub-btn:hover {
        background: #f0f1ff;
        color: #4338ca;
      }

      /* ── Result Panel ── */
      .qw-result {
        background: #fff;
        border: 1px solid #e2e4e9;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06);
        max-width: 420px;
        min-width: 280px;
        overflow: hidden;
        animation: qw-fade-in 0.15s ease-out;
      }

      .qw-loading {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        color: #6b7280;
      }

      .qw-spinner {
        width: 18px; height: 18px;
        border: 2.5px solid #e5e7eb;
        border-top-color: #4f46e5;
        border-radius: 50%;
        animation: qw-spin 0.6s linear infinite;
      }

      .qw-success .qw-text {
        padding: 16px 20px;
        color: #1a1a2e;
        font-size: 13.5px;
        line-height: 1.6;
        max-height: 260px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .qw-bar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        border-top: 1px solid #f1f2f4;
        background: #fafbfc;
      }

      .qw-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        border: 1px solid #e2e4e9;
        border-radius: 6px;
        background: #fff;
        color: #374151;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.1s;
      }
      .qw-action-btn:hover {
        background: #f0f1ff;
        color: #4338ca;
        border-color: #c7d0ff;
      }
      .qw-action-btn svg { flex-shrink: 0; }

      .qw-close {
        margin-left: auto;
        border: none;
        background: transparent;
        padding: 5px 8px;
      }
      .qw-close:hover { background: #fee2e2; color: #dc2626; border-color: transparent; }

      /* ── Limit / Error ── */
      .qw-limit, .qw-error {
        padding: 20px;
        text-align: center;
      }
      .qw-limit strong, .qw-error strong {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
      }
      .qw-limit p, .qw-error p {
        color: #6b7280;
        margin-bottom: 12px;
      }
      .qw-error { color: #dc2626; }
      .qw-error strong { color: #dc2626; }

      .qw-upgrade-btn, .qw-settings-link {
        display: inline-block;
        padding: 8px 24px;
        border: none;
        border-radius: 8px;
        background: #4f46e5;
        color: #fff;
        font-size: 13px;
        font-family: inherit;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .qw-upgrade-btn:hover, .qw-settings-link:hover {
        background: #4338ca;
      }

      /* ── Promo Banner (Share / Review) ── */
      .qw-promo-banner {
        position: absolute;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        pointer-events: auto;
        max-width: 420px;
        min-width: 280px;
        background: linear-gradient(135deg, #1e1b3a 0%, #2d2655 50%, #1e1b3a 100%);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.25), 0 0 12px rgba(139, 92, 246, 0.15);
        animation: qw-fade-in 0.2s ease-out;
        overflow: hidden;
      }

      .qw-promo-content {
        padding: 16px 20px;
        text-align: center;
      }

      .qw-promo-text {
        color: #f0eeff;
        font-size: 13.5px;
        margin-bottom: 14px;
        line-height: 1.5;
      }

      .qw-promo-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .qw-promo-action {
        display: inline-flex;
        align-items: center;
        padding: 7px 20px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: #fff;
        font-size: 12.5px;
        font-family: inherit;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .qw-promo-action:hover {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        box-shadow: 0 2px 10px rgba(124, 58, 237, 0.4);
      }

      .qw-promo-dismiss {
        display: inline-flex;
        align-items: center;
        padding: 7px 16px;
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 8px;
        background: transparent;
        color: #a5a0c8;
        font-size: 12.5px;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.15s;
      }
      .qw-promo-dismiss:hover {
        background: rgba(139, 92, 246, 0.1);
        color: #d4d0f0;
        border-color: rgba(139, 92, 246, 0.5);
      }

      /* ── Animations ── */
      @keyframes qw-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes qw-spin {
        to { transform: rotate(360deg); }
      }
    `;
  }
})();
