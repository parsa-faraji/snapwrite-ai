# Contributing To SnapWrite AI

Thanks for helping improve SnapWrite AI. This project is intentionally small: a Chrome extension, a Node.js proxy, a static website, and Playwright tests.

## Useful First Contributions

- Fix toolbar positioning or selection edge cases on real websites.
- Improve options/popup error messages.
- Add tests around context menus, keyboard shortcuts, or replacement behavior.
- Improve privacy, security, or deployment documentation.
- Add a new AI provider behind the existing provider interface.

## Local Setup

```bash
npm install
npx playwright install chromium
```

Load the extension locally:

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the `extension/` directory.

Run the backend proxy:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Tests

```bash
npm test
```

The Playwright suite launches Chromium with the extension loaded. Extension tests need a headed browser context, so they are best run on a local machine with a desktop session.

## Pull Request Checklist

- Keep the change scoped to one behavior or documentation area.
- Update the README or launch docs when user-facing setup changes.
- Add or update tests for behavior changes when practical.
- Do not commit API keys, extension secrets, generated zips, or local browser profiles.
- For privacy/security changes, describe the data path clearly in the PR.

## Code Style

- Prefer plain JavaScript and browser APIs already used in the repo.
- Keep extension UI isolated from host pages.
- Avoid new dependencies unless they remove real complexity.
- Keep errors user-actionable: say what failed and what the user can do next.
