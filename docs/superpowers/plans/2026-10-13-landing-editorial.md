# Landing Editorial Implementation Plan

> Execute inline using the executing-plans workflow. The user approved the final Option A preview and explicitly requested implementation.

**Goal:** Deliver the approved compact editorial homepage without generated imagery.

**Architecture:** Astro owns routing and metadata; server-rendered React sections compose shared UI primitives. The existing detailed product sections and pricing controls remain available on dedicated routes. Demo panels are labeled illustrations and never load patient data.

**Tech Stack:** Astro, React, shared UI, pnpm, Vitest and Playwright.

## Global constraints

- Node >=22.22.0; pnpm only.
- Shared Fraunces/Inter typography and existing color/spacing tokens.
- Shared Button, Card, MicroLabel, PageContainer, CategoryAvatar and Section primitives.
- No generated imagery, patient API calls, decorative motion or new dependencies.
- Preserve configured app URL, contact form, pricing modes and legal routes.

## Task 1: Navigation and homepage contract

Files: `apps/landing/e2e/critical-flows.spec.ts`, `apps/landing/e2e/accessibility.spec.ts`.

- [x] Update the homepage expectation to `A calmer clinic day.` and demo CTA to `Book a demo`.
- [x] Add assertions for `/product`, `/pricing`, the three visit stages, default light theme, saved dark preference and no overflow at 320px.
- [x] Run `pnpm --filter @docita/landing exec playwright test e2e/critical-flows.spec.ts --grep 'homepage' --project chromium --reporter line`; confirm the old homepage fails the new heading requirement.

## Task 2: Approved composition

Files: `src/components/sections/editorial-homepage.tsx`, `src/components/sections/visit-preview.tsx`, `src/components/sections/practice-preview.tsx`, `src/pages/index.astro`, `src/styles/global.css` under `apps/landing`.

Interfaces: `EditorialHomepage({ appUrl: string })`; `PracticePreview()`; `VisitPreview({ stage: 'check-in' | 'consult' | 'close' })`.

- [x] Compose the split hero and labeled illustrative Today panel, four capabilities, connected visit panels, pricing link and closing setup/demo CTA.
- [x] Render static sections without hydration. Keep demo panels non-interactive, with no fake actionable controls.
- [x] Scope editorial layout rules and reference existing tokens; stack content on mobile.

## Task 3: Preserve detailed flows

Files: `src/pages/product/index.astro`, `src/pages/pricing/index.astro`, `src/components/site-header.astro`, `src/components/site-footer.astro`, `src/layouts/main-layout.astro`, `src/pages/sitemap.xml.ts` under `apps/landing`.

- [x] Move detailed product sections to `/product`; retain FAQ and canonical FAQ structured data there.
- [x] Render the existing `PricingSection` on `/pricing`, preserving mode/period controls and plan picker.
- [x] Simplify shared navigation and give the homepage a compact footer and no sticky CTA.
- [x] Preserve former section anchors through homepage fragment redirects to the appropriate detailed page.
- [x] Default to light before first paint while honoring stored preferences and unavailable localStorage.
- [x] Update E2E coverage to visit dedicated routes for retained interactions.

## Task 4: Verification and documentation

- [x] Run landing lint, types, Vitest, Playwright critical flows and accessibility.
- [x] Run Cloudflare build, `pnpm check:colors`, `pnpm check:hygiene`, `pnpm verify:standard`, `pnpm knip` and root lint; record unrelated baseline failures precisely.
- [x] Review desktop/mobile captures in both themes. Check CTA URLs and disabled-JavaScript homepage content.
- [x] Update UI documentation with the final section order, demo content semantics and routing decisions.
- [x] Leave changes reviewable on `fix/landing-editorial-redesign`; commit and push after the final refinement checks; no deployment was requested.

## Verification result (2026-10-13)

- Landing Astro check: 0 errors, warnings or hints.
- Landing Vitest: 10 files, 44 tests passed.
- Critical flows: 27 passed across Chromium desktop, mobile and tablet.
- Accessibility smoke/keyboard flows: 21 passed across the same three projects, including FAQ expansion and screenshot focus restoration. This is browser smoke coverage, not a full WCAG certification.
- Root lint, Knip, circular dependency enforcement, ARIA naming, color/contrast and repository hygiene passed.
- `verify:standard` completed successfully. Its API latency gate skipped because `artifacts/api-latency-baseline.json` is absent; its Web Vitals check uses the existing August 2026 baseline. These checks do not establish fresh production performance evidence.
- Landing Cloudflare build passed.
- Reviewed desktop/mobile layouts and both themes; 320px overflow, saved themes, unavailable storage and JavaScript-disabled homepage covered by browser checks.
- Changes are on `fix/landing-editorial-redesign`. The user requested commit and push after a final refinement pass; no deployment was requested.

## Final refinement

- Added shared PageHeader headings to `/product` and `/pricing` and a keyboard skip link to main content across marketing pages.
- Removed unused prototype header/footer rules and replaced small demo text sizes with shared typography tokens (minimum 11px).
- Strengthened plan-picker focus coverage so absent option groups fail instead of silently passing.
- Kept the approved homepage composition and preserved synthetic demo data semantics.
- Rechecked widths 320, 390, 650, 768, 1024 and 1440px; no document overflow and no paragraph text below 11px.
- Corrected new demo CTAs to `/contact`; the contact page does not expose a `book-demo` anchor.
- Corrected consultation, prescription and invoice gallery captions to describe the existing captures accurately.
