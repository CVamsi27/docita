# Docita: landing, clinician app, and internal UI/UX design

Date: 11 October 2026. Status: reviewable design proposal; production implementation has not started. User priority: **all three surfaces**.

## Purpose and boundaries

Use one recognizable Docita design system to help visitors understand the product, clinicians complete a visit, and operators resolve a facility issue. Ship independently reviewable improvements to all three surfaces in the first delivery cycle, followed by deeper workflows. Keep existing URLs, role/tenant boundaries, and saved clinic work intact.

This document contains the design, screen coverage, feature decisions, and delivery sequence. It is not an approved code-level implementation plan. After design review, write separate executable plans for landing, app, and internal using the file boundaries and acceptance cases below. Do not bundle three independently deployable apps into one rewrite.

The interactive companion uses invented demonstration facilities and patients. It makes local presentation changes only; it does not authenticate, submit inquiries, save records, charge money, or run an AI service. Its controls illustrate interactions; production controls must use `@workspace/ui`. Representative screens are detailed below; the complete screen families are planned, not all visually prototyped.

## Evidence and source of truth

- [UI/UX standard](../../ui/UI_UX_STANDARD_2026.md): authoritative typography, primitives, navigation, AI, motion, and state contract.
- [Single source of truth](../../architecture/SINGLE_SOURCE_OF_TRUTH.md): clinic, identity, subscription, permission tier, prices, formatting, and URLs.
- [Screen audit matrix](../../ui/UI_UX_ALL_SCREENS_AUDIT_MATRIX.md): existing inventory and route acceptance.
- [Current local acceptance](../../operations/releases/2026-10-10-clinician-e2e-validation.md): current app verification and release limitations.
- `packages/ui/src/styles/globals.css`: canonical Inter/Fraunces fonts, warm paper surfaces, clinical blue, semantic colors, spacing, and light/dark values.
- `apps/landing/src/pages/index.astro`: current homepage has twelve section components; review repetition and handoffs rather than add more sections.
- `apps/landing/src/components/sections/hero-section.tsx`: current rotating preview and entrance motion need reconciliation with the authoritative fixed motion policy.
- `apps/app/src/components/navigation/nav-config-sections.tsx`: current route inventory includes Coding Queue, Reports, and Plan & Billing; preserve these alongside the standard's earlier inventory.
- `apps/internal/src/components/layout/protected-layout.tsx`: current internal groups are Overview, Management, Finance, Operations, and Partners. Preserve this operator-specific IA; do not copy the clinician sidebar into internal.
- `apps/internal/src/features/dashboard/pages/dashboard-page.tsx`: search filters the loaded cursor page, not all facilities. The design must label that scope until server search exists.
- `apps/internal/src/features/support/pages/support-page.tsx`: support is a WhatsApp conversation view today. Assignment, case statuses, and a unified exception queue are proposed capabilities, not existing contract fields.

The August audit is historical: current dashboard/support code already uses React Query-backed hooks. Do not schedule a blanket React Query migration from the old report. No new prices, clinic counts, safety guarantees, certifications, or operational service levels are inferred from a prototype.

## Direction and alternatives

| Approach | Benefit | Cost / tradeoff | Decision |
| --- | --- | --- | --- |
| Shared system, task-focused surfaces | Familiar routes; clearer next actions; improvements can ship independently | Requires workflow and state work alongside visual polish | Recommended |
| Cosmetic refresh | Small initial change; consistent typography and spacing | Leaves search scope, handoffs, and recovery friction intact | Use only as part of the recommended approach |
| Full IA and dashboard replacement | Broad freedom to reorganize | Retraining, link compatibility, larger role/tier regression surface | Defer unless measured usage demonstrates a need |

Signature pattern: a calm work surface with a clear active task and a useful contextual rail. Landing explains the same visit rhythm that Today and consultation use. Internal uses the same visual grammar for facility context, without exposing clinical content by default.

## Shared contract

- Inter for controls, body, dialog, validation, and state messages. Fraunces for page/section/hero headings. Use existing font scale tokens; no arbitrary small-text classes.
- Existing warm background, opaque cards, clinical-blue primary action, and semantic status tokens. Reserve the existing accent treatment for AI. All production values derive from shared global styles.
- One primary action per task area; secondary actions remain visible or in an existing overflow primitive. Status always has text, never color alone.
- `AppPageScaffold`, `PageHeader`, `PageTabs`, `Card`, `DataState`, shared form and overlay primitives. Tables use the existing responsive data pattern rather than app-specific copies.
- No automatic preview rotation, entrance effects, skeleton waves, pulsing chrome, or `transition-all`. Only explicit loading spin and hover/focus color transitions permitted by the standard.
- Comfortable default density; optional compact clinical/operator lists retain readable text and touch targets. Do not make a density preference change clinical semantics.
- App and landing support EN/हिंदी where the current localization system permits. Internal remains English. Dates follow clinic timezone; patient names, ages, money, and tier labels use canonical helpers.
- Desktop: contextual rail after the main work region in DOM order. Tablet: rail below task. Phone: one header, labeled menu/search/actions, stacked rows, reachable primary action; no clipped desktop sidebar.
- Keyboard: visible focus, logical order, labeled controls, correct tab semantics, Escape and focus return for overlays, focus moved to page heading after navigation where existing routing policy supports it.
- Sensitive writes retain tenant/role enforcement, server-authoritative validation, audit evidence, and conflict handling. Clinical AI never silently replaces authored notes or triggers a clinical write.

## Landing design

### Homepage and conversion

Audience: clinic owner, clinician, and reception lead. Their first questions are what Docita does, how it fits a clinic day, what access costs, and how setup works.

Hero: **“Your clinic day, connected.”** Supporting copy names queue, records, prescriptions, billing, and follow-ups. Primary **Start setup** uses `getAppBaseUrl()` and the existing onboarding entry. Secondary **Book guided demo** uses `/contact#book-demo`. Existing-user **Sign in** remains distinct. Use a manually controlled Reception → Consultation → Checkout product preview with synthetic content clearly marked; stop the existing automatic rotation.

Page sequence:

1. Hero and inspectable workflow preview.
2. Clinic-day rhythm: arrive, consult, prescribe, collect, follow up; each stage links to one actual product surface.
3. Real product evidence using the existing Today/consultation/prescription/appointments/invoices captures; verify they match current UI before publishing. Responsive optimized media, useful alt text, and lazy loading below the fold.
4. Audience fit for solo clinic and larger facility; avoid promising unsupported multi-branch behavior.
5. Setup and trust: explain import/assistance, link `/paper-to-cloud`, `/trust`, and privacy policy. Publish only verified capabilities and timing claims.
6. Pricing with the existing catalog/mode/currency source; make inclusions and gating clear. Omit unavailable operational statistics.
7. FAQ and one final conversion action. Merge repetitive breadth/comparison sections if they answer the same question; preserve useful content on its dedicated route.

### Remaining landing families

| Family | Existing entry | Designed behavior |
| --- | --- | --- |
| Workflow content | `/paper-to-cloud`, `/whatsapp-workflows`, `[slug]` | Product evidence, specific workflow, limitations, consistent next step |
| Contact / demo | `/contact` | Floating labels, explicit consent, inline validation, pending/success/retry; retain values after failure; never claim a booking before confirmation |
| Trust / legal | `/trust`, `/privacy`, `/terms`, `/cookies`, `/refund-policy` | Readable headings, anchor navigation, current policy content; no invented compliance badges |
| Public patient/financial links | `/rx/[token]`, `/inv/[token]`, `/pay/[token]` | Preserve token access rules; expired/not-found/retry states; clear document/payment status; sensitive content kept out of analytics |
| Discovery / recovery | `/404`, robots and sitemap | Helpful recovery and canonical links; no marketing chrome that obstructs a document/payment task |

Public token and payment pages form a separate high-risk delivery slice; keep them stable during the homepage redesign.

## Clinician app design

### Today

Keep `/today` as the clinician starting point. Page heading, clinic-local date, refresh status, and permission-aware **Add patient** are visible. Show queue state with labeled waiting/in-room/completed counts derived from the same server state as rows. The active visit gets patient identity, explicit status, and **Continue consultation**. Waiting rows have one primary action; starting a new visit reuses the existing `use-start-next-patient` behavior and must respect an already active visit.

Contextual rail: due follow-ups and current operational reminders, not an unrelated KPI wall. Retain only cards with a relevant next action. Mobile ordering is active visit → waiting queue → follow-ups; “Start next” must not push the current patient into the background.

### Patient and consultation

Patient summary keeps canonical identity, allergies, consent state, and relevant history visible. Use the existing timeline API contract; loading one source must not hide the entire patient context. Missing data is described as missing, never normal/negative by default.

Consultation has persistent patient context, existing section tabs, notes, and visible draft status. The mockup shows the intended hierarchy, not a replacement clinical schema. Keep prescription, lab, and document handoffs connected to the current encounter. Never imply a prescription is sent, a visit completed, or an invoice paid before the authoritative result. Dirty drafts survive failed submissions; leaving with unsaved edits follows the existing dialog pattern.

Ask AI stays pinned and contextual. Preview/disabled states distinguish unavailable processing from a clinical result. The overlay carries a scope chip and **“AI suggestions are not medical advice”** footer. Suggestions require explicit review before adoption, with unchanged consent and provider policy.

### Complete app coverage

| Screen family | Existing route scope | Design requirements |
| --- | --- | --- |
| Daily work | `/today`, `/consultation`, `/appointments` | Current visit first; queue/calendar parity; conflict-aware reschedule; clinic-local times |
| Patient context | `/patients` and patient detail, `/documents`, `/import` | Identity/consent/timeline; duplicate feedback; upload progress and recovery; import preview before commit |
| Clinical outputs | `/prescriptions`, `/lab-tests`, `/coding-queue` | Draft/final distinction; explicit encounter/patient association; review before submission |
| Collection and reconciliation | `/desk/collect-payment`, `/invoices`, `/daybook`, `/insurance-claims` | Server totals, payment pending/failed/success, receipt access, auditable corrections; no repeated charges on retry |
| Service worklists | `/whatsapp`, `/inbox`, `/inventory`, `/follow-ups` | Meaningful filters; no bulk action without selection and applicable confirmation; delivery/stock/status semantics preserved |
| Reporting | `/analytics`, `/reports` | Clinic-local date scope, data freshness, true zero versus unavailable, permission-aware export |
| Workspace settings | `/settings` and existing tabs | Targeted prompts for new requirements; no full re-onboarding of clinic-associated users |
| Subscription | canonical subscription settings path, `/upgrade` compatibility | Current plan from subscription; access tier separately labeled; transparent gates and accessible upgrade action |
| Entry and recovery | login, account recovery, onboarding, mobile upload and existing specialized routes in `App.tsx` | Existing-account workspace compatibility, field recovery, secure link expiration, same shared states |

Navigation stays single-sourced in `nav-config-sections.tsx` and command palette. TRACK retains Today, Consultation, Appointments, Patients, Payment desk, Invoices, Daybook, Insurance Claims, Coding Queue, Prescriptions, Lab Tests, Documents. SERVICES retains Plan & Billing, WhatsApp, Inbox, Inventory, Follow-ups, Analytics, Reports, Import Data. Existing dynamic specialty entries and footer Settings/Help/Theme/Plan remain. The companion shows the principal journeys; it is not a new navigation registry.

## Internal design

### Dashboard and facility context

Keep `/dashboard`, current group names, and all existing routes. Lead with facilities and a specific next action. Platform volume metrics remain secondary and link to the existing analytics view. A facility row prioritizes name, active status, access tier, and **Review facility**; contacts and counts move into the contextual review surface where needed. Access tier must not be presented as the subscription's current paid plan.

First delivery: responsive facility review using current contracts. Search explicitly says **Search facilities on this page** until the API supports server-side query + cursor filtering. A later global search capability resets cursor on query changes, returns a server-filtered page, and provides honest result scope. Do not simulate a platform-wide match using client filtering.

Review separates reading facility context from changing it. A sensitive change presents current value → proposed value, required reason, applicable authorization, and final confirmation. On success show the authoritative value; on failure retain the proposed change and reason. Review-audit linkage requires actual backend support before a “recorded” claim.

### Operator journeys and complete coverage

| Current group / route family | Designed job |
| --- | --- |
| Overview: `/dashboard`, `/analytics`, `/performance` | Find a facility; inspect platform trends without mistaking unavailable data for zero |
| Management: `/users`, `/doctors`, `/admins` | Search, review role/identity, explicit controlled access changes; medical-license decisions retain existing policy |
| Finance: `/billing`, `/pricing`, `/payment-processing` | Subscription versus access clarity, current/proposed price review, reconciliation and explicit failed/pending states |
| Operations: `/audits`, `/logs`, `/broadcasts`, `/support`, `/feedback` | Audit filters, sanitized diagnostics, recipient preview and explicit sending, conversation draft recovery |
| Partners: `/referrals`, `/leads`, `/enterprise-contracts`, `/system-monitoring` | Status-driven lists and detail, traceable changes, accurate incident scope and freshness |

Support: conversation list → selected conversation → draft → explicit reply result. No sending from the design companion. Make search scope and message delivery status clear. Assignment, triage ownership, escalation state, and cross-feature exceptions require canonical Zod contracts and audit policy before implementation.

Mobile internal: a labeled menu with current groups, facility rows stacked as `ListRow`, selected record before actions, confirmations as shared dialogs. Preserve access to urgent support/review tasks. Do not turn every management action into a one-tap phone control.

## State matrix and acceptance examples

Every family uses the same state vocabulary; screen-specific recovery stays close to its task.

| State | Landing | App | Internal |
| --- | --- | --- | --- |
| Loading | Static hero remains available; form submit disables duplicate send | Heading remains; page `DataState`; preserve known patient context | Heading remains; page `DataState`; label freshness on retained data |
| Empty | Unavailable proof metrics omitted | No appointments: Add appointment if allowed; no patient results: clear query | No facilities versus no matches separated; cursor scope visible |
| Error | Preserve inquiry fields; explicit retry | Preserve draft; unavailable is not an empty queue; conflict requires refresh/review | Preserve draft/change reason; retry reads without repeating writes |
| Denied / expired | Invalid public token reveals no patient content | Shared locked page retains H1; no protected action or PHI | Forbidden page retains H1; no hidden actionable write controls |
| Success | Confirm actual inquiry/setup outcome | Display authoritative saved/completed/payment status | Display authoritative record and audit confirmation only if returned |
| Stale / reconnecting | No synthetic live proof | Visible refresh context; don't silently reorder an in-progress task | Timestamp and scoped retry; sensitive writes need current context |

Acceptance examples: a clinician with an active visit can continue it without starting another; empty search does not create a patient accidentally; a pre-change clinic user with stale onboarding state still opens the workspace; a denied role cannot reach protected actions by palette or direct URL; internal search on page one cannot suggest it searched page two; a failed support send preserves draft; unavailable pricing or stats do not render invented numbers.

## Feature decisions

| Priority | Feature / improvement | Dependency and decision |
| --- | --- | --- |
| First cycle, all surfaces | Manual landing workflow preview, clear CTAs, simpler evidence sequence | Current sections/routes/catalog; remove automatic motion |
| First cycle, all surfaces | Today active visit + queue hierarchy; patient/consultation handoff | Existing encounter/queue contracts and permission policy |
| First cycle, all surfaces | Internal responsive facility review and truthful search scope | Existing facility read/edit contracts; no new global-search claim |
| Next cycle | Shared pattern adoption across family inventory | Reuse existing primitives before adding any package component |
| Next cycle | Internal global facility search and support draft/result resilience | Search schema/client/API parity; query cursors; send failure tests |
| Later, separate specification | Unified operator exceptions, saved views, assignment | Canonical domain source, tenant/role scope, retention and audit design |
| Later, separate specification | Richer external clinical AI assistance | Consent/provider review, scoped data minimization, explicit clinical review |

Do not add speculative command centers, engagement scores, new treatment recommendations, extra required onboarding, or new billing states to achieve a visual redesign.

## Delivery roadmap and file boundaries

Each row is an independently reviewable design-to-implementation slice, with its own plan, tests, and commit. The first cycle includes L1, A1, and I1; none is omitted because another surface is the priority.

| Slice | Existing boundaries | Deliverable and acceptance |
| --- | --- | --- |
| L1: homepage | `apps/landing/src/pages/index.astro`; `components/sections/hero-section.tsx`; `components/site-header.astro`; existing section components | Manual preview; CTA destinations unchanged; EN/HI and keyboard; static first paint; 320/360/768/1440 light/dark |
| A1: Today | `apps/app/src/features/dashboard/components/today/today-page-content.tsx`, `today-main-widgets.tsx`; `components/advisor/today-advisor-rail.tsx`; existing dashboard header and start-next hook | Active visit visible; waiting list/action correctness; no start-next conflict; mobile reflow; all state variants |
| I1: facilities | `apps/internal/src/components/layout/protected-layout.tsx`; `features/dashboard/pages/dashboard-page.tsx`; `components/clinic-list.tsx`, `edit-clinic-dialog.tsx` | Mobile menu and stack; facility review; explicit page-search scope; role/tenant tests; no inferred subscription plan |
| L2: evidence / conversion | existing screenshots, pricing, contact, trust, and workflow sections | Truthful copy, current captures, media sizing, form failure recovery; no changes to public token/payment flows in this slice |
| A2: encounter handoff | existing `features/patients`, `features/consultation`, `features/prescriptions`, `features/lab-tests` | Patient identity persists; drafts preserved; real prescription/lab handoffs and explicit outcomes |
| I2: search / support | `features/dashboard/hooks/use-dashboard-data.ts`; `features/support/pages/support-page.tsx`; matching `packages/types`, `packages/data-access/internal`, API internal routes | Define query/reply response schemas first; full-search pagination parity; failed send/retry and no duplicate send |
| Cross-surface family sweep | screen inventory above; existing `docs/ui/UI_UX_ALL_SCREENS_AUDIT_MATRIX.md` | State, navigation, typography, and responsive parity recorded per route/role/tier; no unchecked blanket completion claim |

If a pattern is absent, add it to the correct group in `packages/ui/src/components` with documented ownership; no parallel component library. Do not create new databases/stores for plan, identity, queue, or facility context.

## Verification and release gates

Design-companion verification checks responsive layout, theme rendering, keyboard/control interactions, and no API activity. It is distinct from production accessibility acceptance.

Implementation plans must carry these commands and scenario-specific tests:

- Node >=22.22.0; pnpm 10.30.3 only. `pnpm lint`, relevant `check-types`, relevant unit tests, `pnpm verify:standard`, `pnpm check:hygiene`, `pnpm knip` for app/package/script changes.
- L slices: `pnpm --filter @docita/landing run check-types`, `test`, `build`; `pnpm audit:landing`; relevant landing critical flows; matching Cloudflare build before push.
- A slices: `pnpm --filter @docita/app run check-types`, `test`, `build:cloudflare:production`; `pnpm audit:app`; existing critical/patient/doctor journeys plus the changed Today/consultation scenario.
- I slices: `pnpm --filter @docita/internal run check-types`, `test`, `build:cloudflare`; `pnpm audit:internal`; internal role, facility, support, and cursor tests relevant to the slice.
- Shared token changes additionally require `pnpm check:colors`; schema/client/API changes require contract tests, relevant API tests/E2E, Prisma boundary checks when relevant, and no new cycles.
- Check widths 320, 360, 768, and 1440; light/dark; keyboard and touch; new and existing accounts; relevant allowed and denied roles/tiers. Normal/dense modes retain text and actions. Update screenshots only after behavioral checks pass.
- Compare landing performance to existing budgets, not invented Lighthouse goals. Record proof in the audit matrix and release evidence. Do not push or deploy merely because a mockup looks complete; the outstanding dependency advisories in current release evidence still apply.

## Design companion and review

Companion: `docita-three-surface-design.html` in this chat's durable visualization directory, shown inline. Use the Landing / Clinician app / Internal tabs. Landing stages, Today-to-consultation, patient summary, AI preview, facility search/review, and display controls are local interactions.

All palette values in the companion are a presentation snapshot of the canonical light/dark tokens; production must read shared CSS variables. The companion does not introduce a new token source. Labels for synthetic data remain visible.

Review the direction, page hierarchy, next-action placement, mobile ordering, and the proposed features' boundaries. Approval of this design starts the separate executable plans; it does not authorize sending messages, deploying, changing provider policy, or bypassing release gates.

### Companion verification, 11 October

- Visualize plugin: interactive companion created and reviewed; theme, list density, contextual rail, and Ready/Loading/Empty/Error/Denied display controls are available through the host's design controls.
- Figma plugin: account check returned `USER_NOT_LOGGED_IN` / not connected. No editable Figma file was created. Sign-in is needed before transferring the approved direction to Figma; it does not block reviewing this companion.
- 30 layout cases: Landing/App/Internal × 320/360/768/1024/1440 × light/dark; one visible page H1 per surface and no element overflow.
- 10 interaction matrices: surface-switch keyboard arrows/Home/End, manual landing stages, demo dialog close, consultation draft state, waiting-patient context, Escape on AI preview, mobile app menu, all four non-ready states, facility search/no-match/reset/review, and density/rail/theme changes. No runtime errors.
- 12 settled accessibility scans: three surfaces × 360/1024 × light/dark, WCAG 2 A/AA and 2.1 A/AA axe tags; zero violations and zero unresolved checks. These are companion checks, not production accessibility acceptance. Initial dialog positioning, narrow stage labels, selector contrast, and unlabeled group semantics were corrected before the final runs.
- Spec links/source paths resolve; no unfinished placeholders. Repository hygiene, lint, and diff whitespace checks passed for this documentation change.
- Companion SHA-256: `0919572f068c0a1583ef270ebd6e2d90f29da5b02992ff6079168a35341a084e`. Source stays in the chat's durable visualization directory; browser diagnostics and temporary rendering wrappers are outside Git. No development server or disposable database was needed.
