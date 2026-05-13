# SnapWrite AI

[![CI](https://github.com/parsa-faraji/snapwrite-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/parsa-faraji/snapwrite-ai/actions/workflows/ci.yml)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/snapwrite-ai/bpclponaiaeckhcpgfmojbkhkkgnlifg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](extension/manifest.json)
[![Tests](https://img.shields.io/badge/Tests-Playwright-2ea44f)](tests/extension.spec.js)
[![Good first issues](https://img.shields.io/github/issues/parsa-faraji/snapwrite-ai/good%20first%20issue?label=good%20first%20issues)](https://github.com/parsa-faraji/snapwrite-ai/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

AI writing help on any website. Select text, choose an action, and SnapWrite can improve, rewrite, reply, summarize, fix grammar, translate, or compose without making you copy-paste into a separate chat tab.

## Why This Exists

Most AI writing workflows are too slow:

1. Select text.
2. Copy it.
3. Open another tab.
4. Paste into a chatbot.
5. Copy the result back.

SnapWrite keeps that loop inside the page you are already using. It is built as a Chrome Extension Manifest V3 project with isolated UI, context-menu actions, keyboard shortcuts, optional bring-your-own-key mode, and a small backend proxy for hosted deployments.

## Features

- Improve writing for clarity and polish
- Fix grammar, spelling, and punctuation
- Rewrite as professional, casual, shorter, or longer
- Generate contextual replies
- Summarize long selected text
- Translate to Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Arabic, or English
- Compose from scratch in the popup
- Trigger from the floating toolbar, right-click context menu, or `Alt+Q`
- Use a hosted backend proxy or direct OpenAI/Anthropic API keys

## Demo Flow

1. Select text on any webpage.
2. Pick an action from the SnapWrite toolbar.
3. Copy or replace the result.

The extension UI is injected through Shadow DOM so page styles do not leak into the toolbar.

## Quick Start

### Run The Extension Locally

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the [`extension`](extension/) directory.
5. Open the extension settings and add an API key, or configure `BACKEND_URL` in [`extension/background.js`](extension/background.js).

### Run The Backend Proxy

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend starts at `http://localhost:3001` and accepts requests at `POST /api/generate`.

Required environment:

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | One provider key required | OpenAI API key |
| `ANTHROPIC_API_KEY` | One provider key required | Anthropic API key |
| `AI_PROVIDER` | No | Default provider: `openai` or `anthropic` |
| `PORT` | No | Server port, default `3001` |
| `ALLOWED_ORIGINS` | No | Comma-separated origins, default `*` |

## Project Structure

```text
snapwrite-ai/
  extension/          Chrome extension source
  backend/            Node.js API proxy
  website/            Landing page and privacy policy
  tests/              Playwright extension tests
```

## Testing

```bash
npm install
npx playwright install chromium
npm test
```

The test suite launches Chromium with the extension loaded. Browser extensions require a headed browser context, so this may need a local desktop session.

## Privacy And Security

- Selected text is sent only when the user invokes an AI action.
- The extension does not collect browsing history.
- Usage limits and settings are stored locally with Chrome storage APIs.
- Direct API keys are stored in browser sync storage.
- The backend proxy forwards text to the configured AI provider and does not require a database.

See [`SECURITY.md`](SECURITY.md) and [`website/privacy.html`](website/privacy.html) for details.

## Contributing

Contributions are welcome. Good first areas:

- Browser compatibility and edge-case fixes
- Additional tests for selection, replacement, and options flows
- Documentation improvements
- Provider support and better error states
- Privacy/security hardening

Read [`CONTRIBUTING.md`](CONTRIBUTING.md), then check [open issues](https://github.com/parsa-faraji/snapwrite-ai/issues).

## Roadmap

- Firefox and Edge compatibility pass
- Custom user-defined actions
- Safer enterprise/team configuration
- Better local-only mode for users who always bring their own API keys
- More visual examples in the README and website

## License

MIT License. See [`LICENSE`](LICENSE).
