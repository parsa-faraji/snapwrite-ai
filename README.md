# SnapWrite AI

[![CI](https://github.com/parsa-faraji/snapwrite-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/parsa-faraji/snapwrite-ai/actions/workflows/ci.yml)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/snapwrite-ai/bpclponaiaeckhcpgfmojbkhkkgnlifg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](extension/manifest.json)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](backend/package.json)

**Your AI writing assistant, everywhere on the web.** Select any text on any website to instantly improve, rewrite, reply, summarize, fix grammar, or translate -- powered by OpenAI and Anthropic.

---

## Features

- **Improve Writing** -- Make text clearer, more engaging, and polished
- **Fix Grammar** -- Correct spelling, punctuation, and grammar errors
- **Rewrite** -- Professional, casual, shorter, or longer variants
- **Reply** -- Generate thoughtful replies matching the original tone
- **Summarize** -- Condense content into 2-3 key sentences
- **Translate** -- Translate to 9 languages (Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Arabic, English)
- **Compose** -- Write from scratch via the popup

## How It Works

1. **Select** any text on any webpage
2. **Choose** an action from the floating toolbar
3. **Copy or replace** the AI-generated result instantly

## Project Structure

```
snapwrite-ai/
  extension/          # Chrome extension (Manifest V3)
    manifest.json     # Extension manifest
    background.js     # Service worker (API calls, usage tracking)
    content.js        # Content script (toolbar UI via Shadow DOM)
    popup.html/js/css # Extension popup
    options.html/js/css # Settings page
    icons/            # Extension icons
  backend/            # Node.js API proxy server
    server.js         # HTTP server (OpenAI + Anthropic)
    Dockerfile        # Container config
    railway.json      # Railway deployment config
  website/            # Landing page & privacy policy
    index.html        # Marketing landing page
    privacy.html      # Privacy policy
  tests/              # Playwright E2E tests
    extension.spec.js # Extension integration tests
    test-page.html    # Test fixture page
```

## Getting Started

### Chrome Extension (Local Development)

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `extension/` directory
4. The extension icon appears in your toolbar

### Backend API Proxy

The backend server proxies AI requests so end-users don't need their own API keys.

```bash
cd backend
cp .env.example .env
# Edit .env with your API key(s)
npm install
npm run dev
```

The server starts on `http://localhost:3001` by default.

#### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | One of these | -- | OpenAI API key |
| `ANTHROPIC_API_KEY` | required | -- | Anthropic API key |
| `AI_PROVIDER` | No | `openai` | Default provider (`openai` or `anthropic`) |
| `PORT` | No | `3001` | Server port |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated allowed origins |

### Direct API Key Mode

If no backend URL is configured, users can provide their own API key in the extension settings page (supports OpenAI and Anthropic).

## Running Tests

End-to-end tests use [Playwright](https://playwright.dev/) with a real Chrome instance:

```bash
npm install
npx playwright install chromium
npx playwright test
```

> Note: Tests require headed mode (extensions cannot run in headless Chrome).

## Deployment

### Backend (Railway)

The backend includes a `Dockerfile` and `railway.json` for one-click deployment on [Railway](https://railway.app/):

1. Push the `backend/` directory to a Railway project
2. Set environment variables (`OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`)
3. Railway auto-deploys from the Dockerfile

### Chrome Web Store

1. Zip the `extension/` directory
2. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

## Tech Stack

- **Extension**: Vanilla JavaScript, Shadow DOM, Chrome Extension Manifest V3
- **Backend**: Node.js (native `http` module), OpenAI SDK, Anthropic REST API
- **Testing**: Playwright
- **Deployment**: Railway (Docker), Chrome Web Store

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
