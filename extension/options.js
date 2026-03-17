const PROVIDER_KEY_HINTS = {
  openai: {
    placeholder: "sk-...",
    hint: 'Get your OpenAI API key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a>',
  },
  anthropic: {
    placeholder: "sk-ant-...",
    hint: 'Get your Anthropic API key at <a href="https://console.anthropic.com/settings/keys" target="_blank">console.anthropic.com/settings/keys</a>',
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  const providerRadios = document.querySelectorAll('input[name="provider"]');
  const apiKeyInput = document.getElementById("api-key");
  const keyHint = document.getElementById("key-hint");
  const saveBtn = document.getElementById("save-btn");
  const saveStatus = document.getElementById("save-status");
  const toggleKey = document.getElementById("toggle-key");
  const banner = document.getElementById("status-banner");
  const statusIcon = document.getElementById("status-icon");
  const statusText = document.getElementById("status-text");

  // ── Load saved settings ──
  const data = await chrome.storage.sync.get(["provider", "apiKey"]);

  if (data.provider) {
    document.querySelector(`input[value="${data.provider}"]`).checked = true;
    updateProviderUI(data.provider);
  }

  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
    setBannerOk();
  }

  // ── Provider change ──
  providerRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updateProviderUI(radio.value);
    });
  });

  function updateProviderUI(provider) {
    const info = PROVIDER_KEY_HINTS[provider];
    apiKeyInput.placeholder = info.placeholder;
    keyHint.innerHTML = info.hint;
  }

  // ── Toggle key visibility ──
  toggleKey.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleKey.textContent = isPassword ? "\u{1F648}" : "\u{1F441}";
  });

  // ── Save ──
  saveBtn.addEventListener("click", async () => {
    const provider = document.querySelector(
      'input[name="provider"]:checked'
    ).value;
    const apiKey = apiKeyInput.value.trim();

    await chrome.storage.sync.set({ provider, apiKey });

    if (apiKey) {
      setBannerOk();
    } else {
      setBannerWarning();
    }

    saveStatus.classList.remove("hidden");
    setTimeout(() => saveStatus.classList.add("hidden"), 2500);
  });

  function setBannerOk() {
    banner.classList.add("success");
    statusIcon.innerHTML = "&#10003;";
    statusText.textContent = "API key configured — you're ready to write!";
  }

  function setBannerWarning() {
    banner.classList.remove("success");
    statusIcon.innerHTML = "&#9888;";
    statusText.textContent = "API key not set — add one below to get started";
  }
});
