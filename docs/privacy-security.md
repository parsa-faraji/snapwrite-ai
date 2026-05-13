# Privacy And Security Model

SnapWrite AI is a browser extension that sends user-selected text to an AI provider only after the user explicitly invokes an action. This document describes the concrete data flow for the extension, hosted backend, license checks, and local settings.

## Short Version

- SnapWrite does not read page text until the user selects text and invokes an AI action.
- AI actions send at most the first 5,000 characters of selected text.
- Highlight actions run locally and do not call the backend or an AI provider.
- The extension does not collect browsing history or track visited URLs.
- Bring-your-own API keys are stored with Chrome storage APIs and sent directly to the selected provider.
- Hosted mode sends selected text through the SnapWrite backend, which forwards it to OpenAI or Anthropic and does not store it in a database.
- License checks send license keys to the SnapWrite backend and Stripe. They do not include selected page text.

## Data Flow By Mode

### Hosted Backend Mode

This is the default mode when `BACKEND_URL` is configured in `extension/background.js`.

1. The user selects text on a webpage.
2. The user clicks a toolbar action, context-menu action, popup action, or keyboard shortcut.
3. The extension truncates the selected text to 5,000 characters.
4. The extension sends `{ action, text }` to `POST /api/generate` on the backend.
5. The backend builds the provider prompt and forwards it to OpenAI or Anthropic.
6. The backend returns only the generated result to the extension.

The backend stores no selected text in application storage and does not require a database for generation requests. The current implementation keeps only an in-memory hourly request count by IP address for rate limiting.

### Bring-Your-Own-Key Mode

If the user saves an API key in the extension settings:

1. The extension stores `provider` and `apiKey` with `chrome.storage.sync`.
2. The extension builds the AI prompt locally.
3. The extension sends the prompt directly from the browser to OpenAI or Anthropic.
4. The hosted backend is bypassed for generation requests.

This mode means SnapWrite's hosted backend does not see selected text or the user's provider API key during AI generation.

### Local-Only Actions

Highlight actions are handled inside the content script. They do not call the backend, OpenAI, Anthropic, or Stripe.

## What The Extension Stores

The extension uses Chrome storage APIs:

| Storage | Keys | Purpose |
| --- | --- | --- |
| `chrome.storage.sync` | `provider`, `apiKey` | User-selected AI provider and optional bring-your-own API key |
| `chrome.storage.sync` | `licenseKey`, `pro`, `lastValidated`, `installedAt` | Pro license state and trial timing |
| `chrome.storage.local` | `usage_YYYY-MM-DD` | Daily free-plan action count |
| `chrome.storage.local` | `snapwrite_lifetime_uses`, `snapwrite_share_shown`, `snapwrite_review_shown` | Local prompts for sharing/review milestones |

Chrome sync storage may sync across browsers where the user is signed into Chrome. Users who do not want that behavior should avoid saving provider API keys in the extension and use hosted mode instead.

## What The Backend Receives

### `POST /api/generate`

Receives:

- `action`
- selected text truncated to 5,000 characters
- optional provider preference
- network metadata normally available to the server platform, such as IP address and request headers

Does not receive:

- browsing history
- a full-page DOM snapshot
- the current page URL from the extension request body
- license keys
- user provider API keys

### License And Billing Endpoints

License endpoints receive license keys and Stripe checkout session IDs. Stripe stores customer/subscription metadata needed for license status. These endpoints do not receive selected page text.

## Provider Data Handling

When AI generation runs, selected text is sent to the configured AI provider:

- OpenAI: https://openai.com/privacy
- Anthropic: https://www.anthropic.com/privacy

Provider retention and training policies are controlled by the provider and account settings, not by the extension.

## Browser Permissions

| Permission | Why it is used |
| --- | --- |
| `storage` | Save settings, usage counters, trial state, and license state |
| `activeTab` | Access selected text on the current tab after user action |
| `contextMenus` | Add right-click actions for selected text |
| Host permissions for OpenAI/Anthropic | Support direct bring-your-own-key calls from the extension |
| Hosted backend host permission | Support hosted generation, license checks, and billing portal links |

The content script is declared for all URLs so the toolbar can appear on pages where the user selects text. AI generation still requires an explicit user action.

## Security-Sensitive Areas

- API key storage and display
- selected text handling
- backend request logging
- provider prompt construction
- extension permissions and host permissions
- Stripe webhook validation and license metadata
- CORS configuration for hosted deployments

## User Controls

Users can:

- remove the extension to delete extension-local data from the browser profile
- clear the API key from the options page
- use hosted mode instead of bring-your-own-key mode
- avoid invoking AI actions on sensitive selected text
- use highlight actions when they want local-only behavior

## Known Tradeoffs

- `chrome.storage.sync` is convenient but not a dedicated secrets manager.
- Hosted backend mode makes onboarding easier, but selected text passes through the backend before reaching the AI provider.
- Direct Anthropic browser access requires Anthropic's browser-access header and may not be suitable for all deployment policies.
- Server infrastructure or hosting platforms may keep operational access logs outside application-level storage.
