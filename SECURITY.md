# Security Policy

## Supported Versions

The current `main` branch is the supported development version.

## Data Handling Model

SnapWrite AI processes selected text only after the user invokes an action from the toolbar, context menu, popup, or keyboard shortcut.

- Selected text is truncated before provider calls.
- The extension does not collect browsing history.
- User settings and usage counters are stored with Chrome storage APIs.
- Bring-your-own API keys are stored in Chrome sync storage.
- The backend proxy forwards requests to the selected AI provider and does not require a database.

## Reporting A Vulnerability

Please open a private report through GitHub Security Advisories if available, or email `parsafaraji@berkeley.edu` with:

- Affected file, endpoint, or extension surface.
- Steps to reproduce.
- Expected impact.
- Suggested fix, if you have one.

Do not include live API keys, private user data, or unrelated sensitive content in the report.

## Areas We Treat As Security-Sensitive

- API key storage and display.
- Text selected from webpages.
- Backend proxy request logging.
- Cross-origin access and extension permissions.
- Content-script isolation from host-page CSS and JavaScript.
- Payment or license checks, if added later.
