# Landing Page Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Refine the Docita landing page into a calmer, more cohesive, product-led marketing experience while preserving its content, routes, theme behavior, and CTA destinations.

**Architecture:** Keep the existing Astro page composition and React islands. Concentrate visual decisions in the landing stylesheet and existing landing components; do not introduce a new design system or duplicate UI primitives. Preserve the current live hero preview and section-level client directives, changing only presentation and focused accessibility states.

**Tech Stack:** Astro 7, React 19, Tailwind CSS 4, `@workspace/ui` tokens/primitives, Motion, Lucide, Playwright, Vitest.

## Global Constraints

- Preserve the existing Docita token palette and light/dark theme behavior.
- Reduce competing gradients, glows, and background treatments so the hero product preview carries the strongest visual emphasis.
- Use Fraunces only for the hero emphasis and Inter for supporting copy and interface text.
- Standardize repeated cards around a consistent radius, border treatment, and shallow shadow.
- Reserve status colors for meaningful operational states.
- Keep all colors token-based; do not add raw hex values outside the authoritative token file.
- Preserve current CTA destinations, accessible labels, routes, analytics behavior, and pricing logic.
- Do not overwrite unrelated existing working-tree changes.
- Respect the landing motion policy and `prefers-reduced-motion` behavior.

## File Map

- Modify `apps/landing/src/components/sections/hero-section.tsx` for hero spacing hooks, preview emphasis, and tab affordances.
- Modify `apps/landing/src/components/site-header.astro` for header proportions and navigation focus/active treatment.
- Modify `apps/landing/src/styles/global.css` for the landing visual system, band rhythm, card consistency, responsive spacing, and reduced-motion-safe polish.
- Modify focused section components only where their existing markup prevents consistent visual hierarchy: `clinic-rhythm-section.tsx`, `product-screenshots-section.tsx`, `workflow-compare-section.tsx`, `pricing-section.tsx`, and `faq-cta-section.tsx`.
- Extend `apps/landing/e2e/accessibility.spec.ts` and `apps/landing/e2e/responsive-sections.spec.ts` only for stable, user-visible invariants introduced by the refinement.

---

### Task 1: Establish visual-polish baselines

**Files:**
- Inspect: `apps/landing/src/pages/index.astro`
- Inspect: `apps/landing/src/components/sections/*.tsx`
- Inspect: `apps/landing/src/styles/global.css`
- Test: `apps/landing/e2e/accessibility.spec.ts`
- Test: `apps/landing/e2e/responsive-sections.spec.ts`

**Interfaces:**
- Consumes: current landing routes, section IDs, existing screenshot/product preview markup, and `@workspace/ui` theme tokens.
- Produces: a recorded baseline of existing assertions and the exact selectors/section classes to preserve.

- [ ] **Step 1: Run the existing landing checks before changing code.**

  Run:

  ```bash
  pnpm --filter @docita/landing lint
  pnpm --filter @docita/landing check-types
  pnpm --filter @docita/landing test
  ```

  Expected: all commands pass; if a command fails before implementation, record the exact failure and do not attribute it to this work.

- [ ] **Step 2: Inspect the current rendered page at mobile and desktop widths.**

  Run:

  ```bash
  pnpm --filter @docita/landing dev
  ```

  Use the local landing page at viewport widths 390px and 1440px. Note hero height, heading wrapping, product preview prominence, section transitions, and any horizontal overflow without changing the page.

- [ ] **Step 3: Add only stable assertions needed for the visual contract.**

  If the baseline reveals a missing invariant, add assertions for the existing hero heading, live preview region, section navigation, and no-overflow behavior. Do not add pixel snapshots or assertions tied to generated class names.

---

### Task 2: Refine the hero as the signature visual

**Files:**
- Modify: `apps/landing/src/components/sections/hero-section.tsx`
- Modify: `apps/landing/src/styles/global.css`
- Test: `apps/landing/e2e/accessibility.spec.ts`

**Interfaces:**
- Consumes: `HeroSection({ appUrl }: { appUrl: string })`, `HeroProductCard`, existing preview states (`waiting`, `consult`, `checkout`), and motion preference helpers.
- Produces: the same public hero component and CTA behavior with clearer visual hierarchy and stronger preview affordances.

- [ ] **Step 1: Add a focused accessibility check for the live preview controls.**

  In `apps/landing/e2e/accessibility.spec.ts`, assert that the preview region is visible, its tablist has three tabs, exactly one tab is selected, and the selected tab remains keyboard focusable. Keep the existing heading assertion unchanged.

- [ ] **Step 2: Refine hero markup without changing behavior.**

  Keep the existing text and links. Add semantic styling hooks only where needed to distinguish the hero copy, metric row, preview shell, and preview tab rail. Preserve `onMouseEnter`, `onMouseLeave`, focus pause behavior, the interval duration, reduced-motion handling, and all current hrefs.

- [ ] **Step 3: Implement the hero visual hierarchy in `global.css`.**

  Tune the hero shell so the copy has more breathing room and the product preview reads as the dominant object. Use token-derived backgrounds and shadows, a restrained atmosphere, a consistent radius, and a visible but quiet selected-tab state. Avoid new animation except existing behavior and honor `prefers-reduced-motion`.

- [ ] **Step 4: Run the focused checks.**

  Run:

  ```bash
  pnpm --filter @docita/landing lint
  pnpm --filter @docita/landing check-types
  pnpm --filter @docita/landing test
  ```

  Expected: PASS with the hero preview semantics intact.

---

### Task 3: Harmonize section rhythm and card surfaces

**Files:**
- Modify: `apps/landing/src/styles/global.css`
- Modify if required by markup: `apps/landing/src/components/sections/clinic-rhythm-section.tsx`
- Modify if required by markup: `apps/landing/src/components/sections/product-screenshots-section.tsx`
- Modify if required by markup: `apps/landing/src/components/sections/workflow-compare-section.tsx`
- Modify if required by markup: `apps/landing/src/components/pricing-section.tsx`
- Modify if required by markup: `apps/landing/src/components/sections/faq-cta-section.tsx`

**Interfaces:**
- Consumes: existing `r2-*`, `landing-*`, `ui-page-shell`, and section IDs/classes.
- Produces: consistent band transitions, card chrome, heading spacing, screenshot framing, and pricing/FAQ closure without changing section content or data.

- [ ] **Step 1: Define shared visual rules before local exceptions.**

  In `global.css`, establish one coherent treatment for landing cards and section shells using existing CSS variables: border color, radius, inset highlight, shallow shadow, and dark-mode counterpart. Keep selector specificity scoped to landing classes so shared workspace UI primitives are not altered.

- [ ] **Step 2: Tune the narrative bands.**

  Adjust proof, surface, depth, and commercial bands so only the story transitions receive a background treatment. Reduce overlapping radial gradients and glow intensity. Keep the grid/noise static and subtle, and ensure text remains readable in both themes.

- [ ] **Step 3: Tune section spacing and typography.**

  Increase vertical separation around section eyebrows, headings, and descriptions. Keep the established type hierarchy and use the existing display classes rather than adding arbitrary font sizes. Ensure screenshot captions, comparison cards, pricing cards, and FAQ rows align to the same content shell.

- [ ] **Step 4: Make markup changes only when CSS cannot express the hierarchy.**

  If a section lacks a stable wrapper for the shared treatment, add a small semantic class or wrapper in its existing component. Do not duplicate cards, rewrite section data, or change links. Preserve any existing uncommitted edits in these files and merge changes around them.

- [ ] **Step 5: Run landing unit and type checks.**

  Run:

  ```bash
  pnpm --filter @docita/landing lint
  pnpm --filter @docita/landing check-types
  pnpm --filter @docita/landing test
  ```

  Expected: PASS with no raw hex colors, console logging, or motion-policy violations introduced.

---

### Task 4: Refine header and responsive navigation

**Files:**
- Modify: `apps/landing/src/components/site-header.astro`
- Modify: `apps/landing/src/styles/global.css`
- Test: `apps/landing/e2e/responsive-sections.spec.ts`
- Test: `apps/landing/e2e/accessibility.spec.ts`

**Interfaces:**
- Consumes: existing header links, `ThemeToggle`, `DocitaWordmark`, `appUrl`, section IDs, and current mobile horizontal navigation.
- Produces: a balanced header with stronger focus/hover states and usable mobile navigation, preserving every destination.

- [ ] **Step 1: Add stable navigation assertions.**

  Assert that the desktop and mobile section links preserve the existing destinations, the banner remains visible, and the page has no horizontal overflow at the existing mobile/tablet presets.

- [ ] **Step 2: Refine header markup classes.**

  Keep the current links and login/setup hrefs. Add only classes or ARIA metadata needed for active-looking hover/focus treatment and consistent nav grouping. Do not introduce a new menu or client-side state.

- [ ] **Step 3: Implement responsive spacing and focus treatment.**

  Tune logo/action spacing, nav pill padding, mobile scroll-strip spacing, and header-to-main scroll offset. Use visible `focus-visible` rings and token-based borders/backgrounds. Verify that the setup CTA remains reachable at 390px without clipping.

- [ ] **Step 4: Run responsive and accessibility checks.**

  Run:

  ```bash
  pnpm --filter @docita/landing audit:accessibility
  pnpm --filter @docita/landing test:critical-flows
  ```

  Expected: PASS; no horizontal overflow and no lost navigation/CTA target.

---

### Task 5: Final visual QA and release gates

**Files:**
- Inspect: `apps/landing/src/styles/global.css`
- Inspect: `apps/landing/src/components/sections/hero-section.tsx`
- Inspect: `apps/landing/src/components/site-header.astro`
- Inspect: `git diff`

**Interfaces:**
- Consumes: completed landing visual refinements and existing user working-tree changes.
- Produces: verified landing page changes with no unrelated files staged or overwritten.

- [ ] **Step 1: Review the diff for scope and token compliance.**

  Run:

  ```bash
  git diff -- apps/landing docs/superpowers
  rg -n "#[0-9a-fA-F]{3,8}|console\.(log|error)|transition-all|animate-pulse|animate-in fade-in|TODO|FIXME|TBD" apps/landing/src
  ```

  Expected: no newly introduced raw hex values, prohibited logging/motion patterns, or placeholders. Confirm unrelated pre-existing edits are still present and not reformatted away.

- [ ] **Step 2: Run the full landing verification set.**

  Run:

  ```bash
  pnpm --filter @docita/landing lint
  pnpm --filter @docita/landing check-types
  pnpm --filter @docita/landing test
  pnpm --filter @docita/landing audit:accessibility
  pnpm --filter @docita/landing test:critical-flows
  pnpm --filter @docita/landing build
  ```

  Expected: all commands PASS. If Playwright needs the app server, use the repository's configured webServer behavior from `apps/landing/playwright.config.ts` rather than adding a new server script.

- [ ] **Step 3: Inspect desktop, tablet, mobile, dark, light, and reduced-motion states.**

  Confirm the hero heading does not collide with the preview, section headings retain hierarchy, product screenshots remain legible, setup CTA stays visible, and reduced motion disables decorative transitions while preserving usable controls.

- [ ] **Step 4: Report exact verification results and remaining blockers.**

  Summarize changed files, checks run, and any pre-existing failures separately from regressions introduced by the refinement.
