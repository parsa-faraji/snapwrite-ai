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

const BACKEND_URL = "https://snap-write-ai-production.up.railway.app";

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

  // ── License Key elements ──
  const licenseKeyInput = document.getElementById("license-key");
  const activateBtn = document.getElementById("activate-btn");
  const licenseStatus = document.getElementById("license-status");
  const manageSub = document.getElementById("manage-sub");
  const manageSubLink = document.getElementById("manage-sub-link");

  // ── Load saved settings ──
  const data = await chrome.storage.sync.get(["provider", "apiKey", "licenseKey"]);

  if (data.provider) {
    document.querySelector(`input[value="${data.provider}"]`).checked = true;
    updateProviderUI(data.provider);
  }

  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
    setBannerOk();
  }

  if (data.licenseKey) {
    licenseKeyInput.value = data.licenseKey;
    // Silently validate on page load
    validateLicense(data.licenseKey, true);
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

  // ── License Key ──

  async function validateLicense(key, silent) {
    try {
      const res = await fetch(BACKEND_URL + "/api/validate-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: key }),
      });
      const result = await res.json();

      if (result.valid) {
        await chrome.storage.sync.set({
          pro: true,
          licenseKey: key,
          lastValidated: new Date().toISOString(),
        });
        if (!silent) {
          showLicenseStatus("License activated — you're on Pro!", "success");
        }
        manageSub.classList.remove("hidden");
      } else {
        await chrome.storage.sync.set({ pro: false });
        if (!silent) {
          showLicenseStatus(result.error || "Invalid license key. Please check and try again.", "error");
        }
      }
    } catch {
      if (!silent) {
        showLicenseStatus("Could not reach the server. Please try again later.", "error");
      }
    }
  }

  function showLicenseStatus(message, type) {
    licenseStatus.textContent = message;
    licenseStatus.className = "license-status " + type;
    licenseStatus.classList.remove("hidden");
  }

  activateBtn.addEventListener("click", async () => {
    const key = licenseKeyInput.value.trim().toUpperCase();
    if (!key) return;

    if (!/^SW-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
      showLicenseStatus("Invalid format. Expected: SW-XXXX-XXXX-XXXX-XXXX", "error");
      return;
    }

    activateBtn.disabled = true;
    activateBtn.textContent = "Activating...";

    await validateLicense(key, false);

    activateBtn.disabled = false;
    activateBtn.textContent = "Activate License";
  });

  manageSubLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const key = licenseKeyInput.value.trim().toUpperCase();
    if (!key) return;

    try {
      const res = await fetch(
        BACKEND_URL + "/api/stripe-portal?license_key=" + encodeURIComponent(key)
      );
      const result = await res.json();
      if (result.url) {
        chrome.tabs.create({ url: result.url });
      }
    } catch {
      showLicenseStatus("Could not open subscription portal. Please try again.", "error");
    }
  });
});
