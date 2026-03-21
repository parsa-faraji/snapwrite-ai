document.addEventListener("DOMContentLoaded", async () => {
  // ── Load usage ──
  try {
    const resp = await chrome.runtime.sendMessage({ type: "GET_USAGE" });
    const usageCount = document.getElementById("usage-count");
    const usageBar = document.getElementById("usage-bar");
    const usageHint = document.getElementById("usage-hint");
    const usageCard = document.querySelector(".usage-card");
    const proBadge = document.getElementById("pro-badge");

    if (resp.pro && resp.trialDays > 0) {
      // In free trial
      usageCard.classList.add("hidden");
      proBadge.classList.remove("hidden");
      proBadge.innerHTML = `<span class="pro-icon">&#9733;</span> Free Trial — ${resp.trialDays} day${resp.trialDays === 1 ? "" : "s"} left`;
    } else if (resp.pro) {
      usageCard.classList.add("hidden");
      proBadge.classList.remove("hidden");
    } else {
      const remaining = resp.limit - resp.usage;
      usageCount.textContent = `${resp.usage} / ${resp.limit}`;
      usageBar.style.width = `${Math.min((resp.usage / resp.limit) * 100, 100)}%`;

      if (remaining <= 0) {
        usageBar.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
        usageHint.textContent = "Limit reached — upgrade for unlimited";
        usageHint.style.color = "#ef4444";
      } else if (remaining <= 2) {
        usageHint.textContent = `${remaining} free use${remaining === 1 ? "" : "s"} left today`;
        usageHint.style.color = "#f59e0b";
      } else {
        usageHint.textContent = `${remaining} free uses remaining today`;
      }
    }
  } catch {
    // Extension might not be ready
  }

  // ── Quick actions ──
  document.querySelectorAll(".action").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const hint = {
        improve: "Select text on any page, then click Improve",
        fix: "Select text on any page, then click Fix Grammar",
        summarize: "Select text on any page, then click Summarize",
        translate: "Select text on any page, then click Translate",
      };
      const orig = btn.innerHTML;
      btn.innerHTML = `<span class="action-icon">&#10003;</span> ${hint[action] || "Select text to use"}`;
      btn.style.fontSize = "11px";
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.fontSize = "";
      }, 2500);
    });
  });

  // ── Compose from scratch ──
  const composeInput = document.getElementById("compose-input");
  const composeBtn = document.getElementById("compose-btn");
  const composeResult = document.getElementById("compose-result");
  const composeText = document.getElementById("compose-text");
  const composeCopy = document.getElementById("compose-copy");

  composeBtn.addEventListener("click", async () => {
    const prompt = composeInput.value.trim();
    if (!prompt) return;

    composeBtn.disabled = true;
    composeBtn.textContent = "...";
    composeResult.classList.add("hidden");

    try {
      const resp = await chrome.runtime.sendMessage({
        type: "AI_REQUEST",
        action: "compose",
        text: prompt,
      });

      if (resp.error === "LIMIT_REACHED") {
        composeText.textContent =
          "Daily free limit reached. Upgrade to Pro for unlimited.";
      } else if (resp.error === "NO_API_KEY") {
        composeText.textContent =
          "Please set up your API key in Settings first.";
      } else if (resp.error) {
        composeText.textContent = "Error: " + resp.error;
      } else {
        composeText.textContent = resp.result;
      }

      composeResult.classList.remove("hidden");
    } catch (err) {
      composeText.textContent =
        "Error: " + (err.message || "Something went wrong");
      composeResult.classList.remove("hidden");
    }

    composeBtn.disabled = false;
    composeBtn.textContent = "Generate";
  });

  composeCopy.addEventListener("click", () => {
    navigator.clipboard.writeText(composeText.textContent).then(() => {
      composeCopy.textContent = "Copied!";
      setTimeout(() => (composeCopy.textContent = "Copy"), 1500);
    });
  });

  // ── Footer links ──
  document.getElementById("settings-link").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("upgrade-link").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: "https://snapwrite.io/#pricing" });
  });
});
