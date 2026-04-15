# Handover Checklist — Park+ Fuel Finder Demo

Repo: `mohsinfd/park-` (Vercel)

## 1) Deployment checklist (Vercel)

- **Env var required**
  - `BANKKARO_API_KEY` (Production + Preview)
  - After setting/changing env vars: **Redeploy** (don’t rely on an existing build)

- **SPA routing**
  - `vercel.json` ensures React Router routes don’t 404 and `/api/*` still works

- **Health checks**
  - **Routes load**: `/`, `/calculator`, `/results`, `/fuel?fuel=8000&pincode=110001&inhandIncome=50000&empStatus=salaried`
  - **API proxy works**:
    - `POST /api/partner/token` should **not** return `502`

## 2) Current API architecture (no Supabase required)

### Goal
Avoid Supabase paid dependency and avoid shipping BankKaro keys to the browser.

### How it works
- Frontend calls same-origin endpoints:
  - `POST /api/partner/token`
  - `POST /api/partner/cardgenius/calculate`
  - `POST /api/partner/cardgenius/cards`
- Vercel serverless functions proxy requests to:
  - `https://platform.bankkaro.com/partner/...`

### Files
- `api/partner/token.ts`
- `api/partner/cardgenius/calculate.ts`
- `api/partner/cardgenius/cards.ts`
- `src/services/cardsApi.ts` (now uses the proxy routes; Supabase path removed)

## 3) UI changes made

### Loader / gauge needle
- **Problem**: needle animation flew off the dial on mobile/web due to SVG + CSS transform inconsistencies.
- **Fix**: needle uses SVG-native animation (`<animateTransform>`).
- **File**: `src/pages/Index.tsx`

### Logos
- **Problem**: white SVG wordmarks disappeared on light backgrounds; brightness filters produced garbled-looking output.
- **Fix**: added dark variants and used them in Results header.
- **Files**
  - `src/assets/park-plus-logo-dark.svg`
  - `src/assets/great-cards-logo-dark.svg`
  - `src/pages/FuelResults.tsx`

### Mobile layout tuning
- **Change**: constrain mobile containers to `max-w-md` while keeping `md:max-w-5xl` for desktop.
- **Files**
  - `src/pages/FuelResults.tsx`
  - `src/pages/Results.tsx`

### Card image fit
- **Problem**: images didn’t fill the hero container.
- **Fix**: card hero uses full-bleed image:
  - `absolute inset-0 w-full h-full object-cover`
- **File**: `src/components/CardList.tsx`
- **Tradeoff**: `object-cover` can crop card faces; consider switching to a framed `object-contain` treatment if cropping is unacceptable.

### Eligibility badge logic
- **Problem**: “Eligible” shown even for “no eligibility” scenarios.
- **Fix**: `personalized={Boolean(pincode && inhandIncome)}` (now only shows when eligibility inputs exist).
- **File**: `src/pages/FuelResults.tsx`

## 4) Supabase status

### Why it broke
Vercel had no `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, so Supabase client init threw: **“supabaseUrl is required.”**

### What was changed
- Supabase client made **optional** so missing env vars won’t crash the app at startup.
- **File**: `src/integrations/supabase/client.ts`

### Demo stance
- Demo no longer depends on Supabase to fetch cards (proxy routes instead).

## 5) Known issues / next improvements (high priority)

### UI still feels “template / pedestrian”
High-impact areas to polish:
- **Card hero**: decide whether cropping is acceptable; improve framing and background treatment.
- **Typography + spacing**: unify type scale and tighten vertical rhythm on mobile.
- **Header**: apply Park+ visual language (spacing, sizing, safe-area, alignment).
- **Badges/chips**: reduce visual clutter and improve hierarchy.
- **Shadows/borders**: normalize to a consistent elevation system.

### Eligibility correctness
Current “Eligible” is inferred from input presence.
Better approach:
- Have API response carry `meta.has_eligibility` (already modeled in `EligibleCardsApiResponse.meta`)
- Pass that through and render “Eligible” based on server-confirmed eligibility.

### Storage warnings in restricted contexts
Some WebViews/iframes show:
- “Access to storage is not allowed from this context.”
Not blocking for web demo; will matter later for embedded Park+ WebView.
See `src/main.tsx` where one unhandled rejection pattern is suppressed.

## 6) Summary of changes (by file)

### Infra / API
- `vercel.json`
- `api/partner/token.ts`
- `api/partner/cardgenius/calculate.ts`
- `api/partner/cardgenius/cards.ts`
- `src/services/cardsApi.ts`
- `src/integrations/supabase/client.ts`
- `.gitignore` (ignore `.env`)
- `.env.example`
- `package.json` (added `@vercel/node`)

### UI / assets
- `src/pages/Index.tsx`
- `src/pages/FuelResults.tsx`
- `src/pages/Results.tsx`
- `src/components/CardList.tsx`
- `src/assets/park-plus-logo.svg`
- `src/assets/great-cards-logo.svg`
- `src/assets/challan-banner.svg`
- `src/assets/park-plus-logo-dark.svg`
- `src/assets/great-cards-logo-dark.svg`

