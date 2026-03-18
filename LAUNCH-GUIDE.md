# SnapWrite AI — Complete Launch Guide

## What You've Got

A complete, production-ready Chrome extension that:
- Adds an AI-powered floating toolbar when users select text on ANY website
- Offers 6 actions: Improve, Reply, Rewrite (Professional/Casual/Shorter/Longer), Summarize, Fix Grammar, Translate (9 languages)
- Right-click context menu with 4 quick actions (Improve, Fix Grammar, Summarize, Reply)
- Keyboard shortcut (Alt+Q) to trigger the toolbar
- Compose-from-scratch in the popup
- 7-day free trial for new installs (unlimited usage)
- Freemium model: 5 free uses/day, unlimited for Pro ($9.99/mo)
- Backend proxy server so users don't need their own API keys
- Privacy policy page (required by Chrome Web Store)
- Marketing landing page with pricing
- 22 passing Playwright end-to-end tests

---

## Step 1: Test It Locally (5 minutes)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension` folder inside `quickwrite-ai`
5. The extension icon appears in your toolbar — click it
6. Go to Settings and add your API key:
   - **OpenAI**: Get one at https://platform.openai.com/api-keys
   - **Anthropic**: Get one at https://console.anthropic.com/settings/keys
7. Go to any website, select text, and the toolbar appears!
8. Try right-clicking selected text for context menu actions
9. Try Alt+Q to trigger the toolbar via keyboard

---

## Step 2: Deploy the Backend Proxy (Optional but Recommended)

Deploy the backend so users don't need their own API keys:

### Using Railway (Easiest)
1. Push the `backend/` folder to a GitHub repo
2. Go to https://railway.app and connect your repo
3. Add environment variable: `OPENAI_API_KEY=sk-your-key`
4. Railway auto-deploys from the Dockerfile
5. Copy the deployed URL (e.g., `https://snapwrite-api-production.up.railway.app`)
6. Update `BACKEND_URL` in `extension/background.js` with this URL

### Using Docker (Any Host)
```bash
cd backend
docker build -t snapwrite-api .
docker run -p 3001:3001 -e OPENAI_API_KEY=sk-your-key snapwrite-api
```

When `BACKEND_URL` is set, users don't need to configure API keys at all — the extension works immediately after install.

---

## Step 3: Set Up Payments with Stripe (30 minutes)

### Option A: Stripe Payment Links (Simplest)

1. Create a Stripe account at https://stripe.com
2. Go to **Products** → **Add product**
   - Name: "SnapWrite AI Pro"
   - Price: $9.99/month, recurring
3. Go to **Payment Links** → create one for this product
4. Copy the payment link URL
5. Update these files with your payment link:
   - `popup.js` — the payment URL
   - `website/index.html` — the "Start 7-Day Free Trial" href

### Option B: ExtensionPay (Built for Chrome Extensions)

1. Go to https://extensionpay.com
2. Sign up and create a new extension
3. Follow their SDK integration guide
4. Handles Stripe, license keys, and Chrome extension integration

---

## Step 4: Publish to Chrome Web Store (1-3 days for review)

### Register as Developer
1. Go to https://chrome.google.com/webstore/devconsole
2. Pay one-time $5 developer fee
3. Verify your identity

### Prepare Store Listing
You'll need:
- **Screenshots** (1280x800 or 640x400): Take 3-5 showing the toolbar in action
- **Promotional images**: 440x280 small tile, 920x680 large tile (optional)
- **Privacy policy URL**: Host `website/privacy.html` and link to it
- **Description**:

```
SnapWrite AI — Your AI writing assistant, everywhere on the web.

Select any text on any website to instantly:
- Improve — make your writing clearer and more engaging
- Reply — generate smart, contextual responses
- Rewrite — change tone to professional, casual, shorter, or longer
- Summarize — condense long text into key points
- Fix Grammar — catch spelling and punctuation errors
- Translate — convert between 9 languages

Also available via right-click menu and keyboard shortcut (Alt+Q).

Works on Gmail, LinkedIn, Twitter, Slack, Google Docs, and every other website.

Free: 5 AI actions per day (7-day unlimited trial for new users)
Pro: Unlimited for $9.99/month

No signup required. Just install and start writing better.
```

### Submit
1. Zip the `extension` folder
2. Upload to Chrome Web Store Developer Console
3. Fill in listing details, screenshots, privacy policy URL
4. Submit for review (typically 1-3 business days)

---

## Step 5: Host the Website (10 minutes)

### Vercel (Free)
1. Push the `website/` folder to GitHub
2. Go to https://vercel.com and import the repo
3. Set root directory to `website`
4. Deploy — you get a free URL instantly
5. Add a custom domain (snapwrite.io) if purchased

### Netlify (Free)
1. Drag and drop the `website/` folder at https://app.netlify.com/drop
2. Done! Get a free URL or add a custom domain

---

## Step 6: Launch & Get Users (Week 1)

### Free Marketing Channels

**Product Hunt**
- Create an account at producthunt.com
- Schedule a launch (Tuesday-Thursday mornings are best)
- Tagline: "AI writing assistant that works on every website"
- Prepare a 1-minute demo GIF/video

**Reddit**
Post in these subreddits (follow each sub's rules):
- r/SideProject — "I built an AI Chrome extension that helps you write better on any website"
- r/productivity — "Tool that saves me hours of writing every week"
- r/chrome — share as useful extension
- r/EntrepreneurRideAlong — your building journey

**Twitter/X**
- Post a demo video/GIF
- Use hashtags: #buildinpublic #indiehacker #chromeextension

**Hacker News**
- Submit as "Show HN: SnapWrite AI – AI writing assistant Chrome extension"
- Post on weekday mornings (US time)

**LinkedIn**
- Write a post about building this with AI
- Great irony angle: using an AI writing tool to write about your AI writing tool

---

## Step 7: Scale Revenue

### Growth Targets
- Month 1: 100 installs, 5 Pro ($50/mo)
- Month 3: 1,000 installs, 50 Pro ($500/mo)
- Month 6: 5,000 installs, 250 Pro ($2,500/mo)
- Month 12: 20,000 installs, 1,000 Pro ($10,000/mo)

### Expansion Ideas
- **Team/Business plan**: $29.99/month for 5 users
- **Custom AI prompts**: Let users create their own actions
- **Firefox/Safari/Edge** ports
- **Mobile keyboard** (iOS/Android)

---

## Cost Structure

- Chrome Web Store fee: $5 (one-time)
- OpenAI API (gpt-4o-mini): ~$0.01-0.05 per user per day
- Railway/hosting: Free tier → $5/mo at scale
- Stripe: 2.9% + $0.30 per transaction
- Domain (optional): ~$12/year
- **Break-even**: ~3-5 Pro subscribers covers all infrastructure

---

## Key Metrics to Track

- **Install rate**: Chrome Web Store impressions → installs
- **Activation rate**: Installs → first AI action used
- **Trial conversion**: Trial → Pro upgrade rate
- **Retention**: % of users active after 7 days, 30 days
- **MRR**: Monthly recurring revenue
- **Churn**: % of Pro users who cancel monthly

---

## Your Launch Checklist

- [x] Build and test extension locally
- [x] Add extension icons
- [x] Create privacy policy
- [x] Create marketing landing page
- [x] Set up backend proxy server
- [x] Add 7-day free trial
- [x] Add context menu + keyboard shortcut
- [x] Run all 22 Playwright tests (all passing)
- [ ] Deploy backend to Railway
- [ ] Set `BACKEND_URL` in background.js
- [ ] Set up Stripe payments
- [ ] Register Chrome Web Store developer account ($5)
- [ ] Take screenshots for store listing
- [ ] Submit to Chrome Web Store
- [ ] Host website on Vercel/Netlify
- [ ] Launch on Product Hunt, Reddit, Twitter, LinkedIn

---

**Estimated time to first revenue: 1-2 weeks**
**Estimated cost to launch: $5 (Chrome Web Store fee)**

The product is built, tested, and ready to ship.
