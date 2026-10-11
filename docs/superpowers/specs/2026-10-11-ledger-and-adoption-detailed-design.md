# Docita: refined ledger workspaces and adoption landing

Date: 11 October 2026. Status: approved Today and internal facility-review slices implemented locally in light and dark mode; landing is deferred for further design review. User direction: **keep displayed option 3 for app and internal, refine it, include dark mode, and design landing separately for adoption**.

## 1. Selected direction and scope

The selected source is Day ledger, `exec-3ec95546-6143-4cb9-9bd9-ecdaae5669b1.png`, displayed third in [the previous exploration](2026-10-11-three-surface-uiux-design-v2.md). Selection resolves to that image, not the third result of any later generation.

App and internal share its composition: a broad aligned worklist, one selected-record region, restrained separators, and a stable product shell. They retain their different navigation, permissions, terminology, and task density. Landing shares Docita's brand and token system but gets an independent editorial composition and adoption journey.

The visual deliverables are six desktop boards: Today light/dark, internal facility review light/dark, and landing light/dark. These are paired designs, not six competing directions. Mobile behavior, additional screens, states, component sourcing, and acceptance criteria are specified below. Raster boards are not responsive prototypes or verified interactions.

This document supersedes the visual-selection stage of the previous exploration. The [original specification](2026-10-11-three-surface-uiux-design.md) remains the route-family and clinical safety inventory. No redesign resets clinic-associated users to onboarding or changes an existing access policy.

## 2. Shared product design rules

Authority: [UI/UX standard](../../ui/UI_UX_STANDARD_2026.md), [single source of truth](../../architecture/SINGLE_SOURCE_OF_TRUTH.md), and `packages/ui/src/styles/globals.css`. No app-local token files or alternate theme palettes.

| Element | Refined decision |
| --- | --- |
| Product shell | Viewport height, stable topbar, independently scrollable sidebar navigation; footer remains reachable |
| Record layout | One continuous table/list plus a contextual selected-record region; omit the region if it has no relevant task |
| Page title | Fraunces, existing `--fs-4xl`; section headings `--fs-2xl`; use Inter for modal titles |
| Data and identity | Inter throughout; patient/facility identity is a data anchor, not a serif display heading |
| Essential text | `--fs-base` to `--fs-lg`; `--fs-sm` for secondary metadata; micro-labels only where they add orientation |
| Separation | Alignment and spacing, then dividers, then a subtle surface distinction; no per-row cards or nested card grids |
| Actions | One filled primary action per active task; peer rows use quiet View/Review controls |
| State | Label plus semantic treatment; selection, waiting, in-room, denied, and stale must not depend on color alone |
| Branding | Existing `DocitaLogo`/`DocitaWordmark` and original image, intrinsic aspect ratio; no generic replacement cross or typed logo |
| Motion | Existing policy: explicit loading spinner and 150ms color feedback; no auto-rotating demonstrations or decorative entry effects |

Desktop measurements are layout targets, not permission to hardcode a parallel spacing scale. Map them to the existing shared tokens and breakpoints during implementation: product sidebar about224px; topbar about56px; page inset24px; desktop selected region about320px; comfortable app rows64px and compact internal rows56px. Do not shrink essential text to fit additional columns.

### Dark mode is a first-class design

Keep layout, action placement, ordering, and content identical between light and dark. Change semantic token roles rather than inverting the image or assigning raw colors.

| Role | Light source | Dark source | Usage |
| --- | --- | --- | --- |
| Base/ink | `--background`, `--foreground` | Same variables resolved under `.dark` | Page and essential text |
| Bounded surfaces | `--card`, `--surface-1/2/3` | Opaque navy elevation ramp | Dialog, popover, meaningful grouped region |
| Secondary text | `--muted-foreground` | Dark token value | Helpful metadata, never sole patient identity |
| Rules/fields | `--border`, `--input` | Dark token value | Table rules, field boundary, separators |
| Primary action | `--primary`, `--primary-foreground` | Dark clinical-blue fill and paired label | Continue/edit/setup action |
| State | Existing info/success/warning/destructive and paired foreground tokens | Dark semantic tokens | Status text and icon/dot; test the actual badge variant |
| Live token board | `--brand-ink`, `--brand-cyan` | Corresponding dark values | Only an existing `NowServingBoard` where useful, not general chrome |
| AI | Existing accent roles | Corresponding dark values | Shared scoped AI affordance only |

The dark primary token has a documented text-contrast tradeoff in `globals.css`: it supports the filled CTA but is not an acceptable default for small text links. Dark text links use readable foreground with an underline or a clear link control. Do not lighten all CTA fills or introduce a second arbitrary blue palette to solve that text role. Verify text, icons, input boundaries, selected rows, focus rings, and disabled controls on their actual backgrounds.

Theme behavior preserves existing preferences: app uses `useAppearanceStore` with light/dark/system, color accent, and compact mode; internal uses its light/dark/system provider and legacy preference fallback. No new preference store. Landing keeps light/dark choice and stored dark preference; new visitors receive the proposed light marketing default. Resolve that default once for both head initialization and toggle handling, with guarded storage access. Current landing head defaults dark while its toggle defaults light; the implementation must eliminate that conflict and visible theme flash. Changing landing's default is part of this proposal, not a claim about current behavior.

Respect existing enforced enterprise appearance settings when resolving user choices; a light/dark control cannot override a locked theme. Test system changes, persisted dark mode, legacy internal preference, inaccessible storage, existing accents and compact mode. App English/Hindi labels must retain their existing localization and fit without merging links; internal remains English-only. This design does not invent a landing localization flow.

## 3. App: Today ledger

### Desktop composition

Keep `TRACK` and `SERVICES` and all real destinations from `apps/app/src/components/navigation/nav-config-sections.tsx`. The palette follows the same registry and access targets. In particular, WhatsApp and Inbox are separate; Analytics and Reports are separate; footer Settings, Help, Theme, Plan and pinned Ask AI are not a combined link. Existing dynamic specialty and role/tier rules remain.

The minimal topbar keeps clinic identity, palette/search, quick-add, notifications, settings and account controls. Page content starts with Today, clinic-local date, a short queue summary and quiet contextual Ask AI/refresh actions. Avoid a second dominant Open queue CTA beside the active consultation action.

The ledger occupies the broad main region. Initial columns: token, patient, arrival, status, and View. Patient is the strongest table text. The current visit is a tinted row with a leading indicator and an explicit In room label; selection and visit status are separate concepts. Dates, identities, counts and labels derive from current canonical helpers and schemas.

The contextual region initially shows the current visit: patient identity, token where supplied, arrival, current status, and one **Continue consultation** button targeting the actual active encounter. Its optional **View patient** link is secondary. A table View control selects/previews a row; it must not silently change the active encounter or start the next patient.

When previewing a waiting/expected row, distinguish **Selected appointment** from **Current visit**. Keep the current visit accessible as a compact return control. Any Start next action uses the existing permission, pending-mutation, navigation and error flow; it does not inherit permission from row selection. The current `useStartConsultationWithToast` hook starts the appointment and navigates on the authoritative response; it does not itself show a confirmation. Preserve that behavior and its stable accessible name in the first composition slice. A new dirty-encounter confirmation or handoff policy requires its own reviewed behavior change and regression tests.

Retain the existing one-click Start next operation as a quiet secondary action associated with the next eligible patient; record preview is optional, not a new mandatory step. One filled primary action defines visual priority and does not remove an existing clinician operation. On phone, Continue owns the primary slot while Start next remains a distinct secondary action when currently allowed, using the existing bottom-bar contract.

Show only context the relevant contract provides. If detail has not been fetched, say Not loaded; after a successful response with absent data, say Not recorded. A partial detail failure retains the usable queue and provides scoped retry. Do not treat an absent draft response as a saved empty draft or show an invented saved timestamp. Avoid fetching a full patient graph merely to decorate Today.

Below the ledger, a compact due-work list links to existing follow-up destinations and shows real tasks. Do not fill an empty strip with explanatory prose or fabricate tasks. Empty Today and empty due work are distinct states.

### Phone and tablet

- At `xl` and above: broad worklist plus selected region. Below `xl`: current visit becomes a compact block before the ledger, keeping identity/status/action together; record previews use a shared Sheet rather than squeezing a rail beside narrow data.
- Below `md`: existing sidebar Sheet, readable topbar controls, current visit first, then queue, then due work. Queue uses `DataTable` mobile rendering with `ListRow`/`ListRowGroup`; low-priority columns become metadata, not tiny columns.
- Use `BottomActionBar` for the one primary current-visit action while its inline copy is replaced, not duplicated. Respect safe-area inset and reserve content padding so the last row/focused field remains visible.
- Long names wrap or truncate with the shared tooltip; full identity remains accessible in the record preview. Do not let a token, badge, or timestamp take the patient's width.
- Keep comfortable default and exercise existing compact mode. No density control in internal is implied by app's appearance store.

### App screen family details

| Screen | Ledger-derived composition | Main action and state boundary |
| --- | --- | --- |
| Today | Queue plus current/selected visit | Continue active encounter; start-next retains handoff behavior |
| Patient summary | Visit/document timeline plus selected record | Open encounter/document; partial history failure is isolated |
| Consultation | Notes/work area plus relevant patient context | Existing save/complete flow; explicit dirty, saving, failed, saved states |
| Prescription/lab handoff | Existing structured output form plus patient/encounter context | Reviewed output only; preserve validation and clinical identity |
| Appointments | Existing calendar/list modes, compact selected appointment | Create/reschedule under canonical timezone/status rules |
| Payment desk/invoice | Aligned line items plus actual invoice/payment context | Server-confirmed collection; pending/failure never shown as paid |
| Follow-ups/WhatsApp | Worklist/conversations plus selected task/thread | Existing reply/delivery or follow-up action and permission |

These are design extensions, not simultaneous route rewrites. First implement Today composition and its state/mobile tests; then patient/consultation continuity before broad secondary families.

## 4. Internal: facility review ledger

### Desktop composition

Preserve the internal shell's Overview, Management, Finance, Operations and Partners groups from `apps/internal/src/components/layout/protected-layout.tsx`. Facilities remain a section of **Dashboard at `/dashboard`**; do not invent a Facilities sidebar route. Theme and Sign out stay in its existing footer. Do not copy clinician Ask AI or clinical navigation into internal.

Use Dashboard as the page heading and Facilities as the section heading. Keep authoritative platform summary available as a compact secondary section; do not delete it to mimic the clinical view or let metric cards dominate facility work.

The main table starts with facility name, type, **Access tier**, active status, and Review. Contact and `_count` values can move into the selected region when useful. Do not label `clinic.tier` as subscription plan. The list contract supplies a required string `subscriptionStatus`; show the returned value as a separate subscription status, not as the current paid plan. Unknown/empty values need an explicit display fallback rather than an invented active/paid value. Detailed billing belongs to the existing Billing destination and its own source.

Row Review selects a facility by ID and shows a single record region on the right. The region displays name, status, type, access tier, supplied contact and users/patients counts, and one primary **Edit facility** using the existing controlled dialog. A quiet Add facility action remains available in the page header. Do not expose direct tier/status switches on table rows.

Search remains explicitly **Search facilities on this page**, with a label that explains its scope before entering text. Internal's header identifies the console and operator; it does not imply a clinician clinic switcher or global facility search. Preserve cursor pagination and current page-change search reset. Previous is disabled at the first cursor, Next follows `hasMore`/`nextCursor`, and pagination state is never inferred from a decorative page label. Selection clears when its record leaves the loaded page; after successful edit, invalidate through the existing handler and return focus to the initiating control. If a selected row disappears after refresh, close its preview with a clear update message rather than keeping stale editable values.

This preview composes fields from `InternalClinicListEntry`; it does not add an API response field or a new facility-detail cache. Global search, complete billing snapshots, saved views and unified exception queues are separately scoped features requiring canonical contracts.

### Editing and narrow screens

The existing edit dialog keeps field validation, tenant/role checks and audit behavior. Show current values before proposed changes and preserve dirty form input after request failure. Confirmation and operational reasons use existing contracts; adding a mandatory audit reason or conflict/version field requires schema/API/client work rather than a cosmetic UI field that is discarded.

On narrow desktop/tablet, Review opens a Sheet. On phones, rows become `ListRow` groups with identity, status, access tier and one Review control. The Sheet opens with the facility identity and full essential values; Edit launches the shared dialog/wizard flow. Closing restores focus. Do not stack an unbounded table next to a 320px rail on a 390px viewport.

| Internal family | Main/selected composition | Key distinction |
| --- | --- | --- |
| Dashboard/facilities | Facility table and selected record | Access tier, active state and subscription status stay separate |
| Users/doctors/admins | People worklist and relevant account detail | Real role/clinic scope; no privileged action implied by selection |
| Billing/payments | Invoice/transaction list and reconciliation detail | Actual plan/payment sources, pending and failure retained |
| Support/feedback | Conversation/task list and selected thread | Dirty reply, failed send and delivery evidence remain local to action |
| Audits/logs/performance | Evidence list and selected event/sample | Redaction, sample/window coverage and permission remain explicit |
| Leads/referrals/contracts | Existing pipeline/list and selected partner record | Existing fields and status semantics; no fabricated scoring |

## 5. Landing: a separate adoption journey

### Positioning and first view

The homepage answers three questions quickly: what Docita does, how it fits today's clinic workflow, and how to start. The audience is a clinician or clinic owner evaluating with their front desk; it does not assume they understand the full product navigation.

Design a wide editorial page without product sidebar chrome. At desktop, use a roughly1200px content width on a1440px canvas, generous section spacing, a concise header and a bold typographic hero. A large readable product view supplies evidence, not a decorative blank dashboard panel.

Proposed hero:

> **Your clinic day, in one clear view.**
>
> Appointments, patient records, prescriptions and billing—connected for your clinic team.

Primary **Start clinic setup** resolves through `getAppBaseUrl()` to `/onboarding`; secondary **Book guided demo** resolves to the real contact form. Existing-user **Sign in** stays prominent and routes to `/login`. Add restrained **See how it works** navigation to the product evidence section rather than promising an unimplemented live sandbox or video.

Header: Product, Getting started, Pricing, Trust, theme control, Sign in and a quieter setup entry. On mobile, keep logo, menu, theme and Sign in reachable; the hero owns the main setup button. Do not show a horizontal wall of eight equally weighted nav links or two fixed CTA bars.

Map the new labels to actual page sections and retain existing public anchor contracts or aliases when consolidating sections, including product screenshots, clinic types, rhythm, rollout and pricing. Update header/footer together; existing bookmarked links must not become dangling targets. No renamed public prescription, invoice or payment URL is part of this marketing design.

The product view uses the approved ledger as a synthetic design illustration in these boards. Production marketing must use a verified, de-identified real capture of the shipped UI or explicitly label a future concept. Never publish historical patient names or a generated screen as proof of a shipped feature.

### Full homepage sequence

| Section | Content and composition | Adoption purpose |
| --- | --- | --- |
| Hero + product evidence | Outcome, one short paragraph, setup/demo paths, legible Today view | Explain value and make the next step clear |
| A clinic day, connected | Arrival → active encounter → reviewed outputs; one manually selected product view | Show continuity instead of a feature inventory |
| Start with your first workflow | Reception, clinical practice and clinic team needs as concise editorial columns | Help evaluators recognize their use case |
| Getting started | Choose first workflow, scope configuration/import, train the team, expand when ready | Address changeover concerns without promising unverified duration |
| Pricing | Catalog-driven mode/tier/currency; software and guided setup separately labeled | Make cost structure understandable before inquiry |
| Trust and practical questions | Existing policies, access controls/data handling links, migration/help answers | Offer verifiable evidence and resolve objections |
| Final invitation + footer | Setup primary, guided demo secondary, Sign in/support/legal links | End with a clear low-friction decision |

Avoid an equal-card grid for every section. Alternate a wide product view, narrow explanatory prose, short numbered steps, and a focused comparison. Use existing Inter/Fraunces hierarchy and palette; the difference from the apps is composition and narrative, not a second design system. No stock-clinician photo, fabricated testimonial/logo wall, conversion count, countdown, free-trial promise, or invented setup timing.

### Light/dark and mobile

Light marketing: warm paper, strong ink headline, clinical-blue setup action, generous breathing room and editorial dividers. Dark marketing: the same section sequence and CTA hierarchy on the existing deep navy tokens; product view has a clear opaque boundary and readable internal data. No neon gradients, luminous buttons, or dark-mode changes to pricing/claims. Brand bitmap retains its original intrinsic ratio in both.

At390px: header compresses, headline uses existing responsive display scale, copy is a readable line length, setup/demo controls become stacked, and the product image follows the copy. Show a meaningful crop focused on the active visit and a few rows; retain a labeled Open full product preview control for a larger accessible view. Do not shrink the entire desktop app screenshot until all text becomes illegible. A crop is a marketing image treatment, not the app's mobile layout.

If a sticky mobile CTA is retained, show it only after the hero action leaves view; suspend it while the inquiry form or an overlay is active, account for safe areas and focus, and reserve footer space. It must not compete with an inline form submit.

### Inquiry and measurement

Preserve the currently supported inquiry fields: name, email, facility name and message. Do not add a required phone/specialty field without updating the shared inquiry schema and API. Offer workflow guidance in surrounding copy or initial inquiry intent, not an unpersisted hidden backend field. Error identifies the field; request failure retains all values; pending prevents duplicate submissions; success appears only after server acknowledgement and does not promise a scheduled appointment.

`/contact#book-demo` is currently used by hero/FAQ links, but the contact page has no matching anchor. Place an accessible `book-demo` target around the actual form, preserving the existing route and form submission behavior. New adoption design must fix this before calling the demo path complete.

Adoption improvement is a hypothesis to measure, not a guaranteed result. Define a baseline before experiments: eligible homepage sessions, setup CTA visits, demo-form starts, successful inquiry acknowledgements, and actual setup completion where existing server reporting supports it. Read activation from authoritative workflow events only after its definition and source are agreed; account registration alone is not clinical activation.

Instrumentation must use existing approved telemetry/consent boundaries and same-origin routes. No patient data, inquiry message, email, phone, clinical free text, protected token, full URL query or account identifier in public analytics. Record denominators, observation windows and unavailable coverage. Do not claim a conversion lift from raster review or add another analytics store merely for this design.

## 6. State and interaction contract

| State | Required design behavior |
| --- | --- |
| First load | Visible page heading and main landmark; page-level `DataState`; stable shell and non-animated skeletons |
| Empty | Distinguish no data, no current-page matches, and no current visit; one relevant allowed recovery action |
| Error | Page-level retry for required data; scoped retry for optional detail; never replace absent facts with zeros |
| Denied | No protected data or mutation; standard role/tier state rather than a cosmetically disabled button alone |
| Selected | Visible text/indicator and correct focus; row selection does not mutate active visit/facility values |
| Refresh/stale | Preserve usable records where existing cache behavior allows, show real freshness, prevent unsupported stale writes |
| Dirty/pending | Keep unsaved input and patient/facility identity; prevent duplicate submissions without trapping focus |
| Failed write | Preserve draft, explain failure beside action, offer retry; no optimistic clinical completion or paid state |
| Confirmed write | Use authoritative response and existing invalidation; announce success and restore meaningful focus |
| Overlay | Shared Dialog/Sheet/AskAiOverlay, readable Inter title, Escape/focus return and mobile-safe content |

Clinical AI remains the existing scoped overlay with the disclaimer **AI suggestions are not medical advice.** Disabled processing remains a local informational preview and sends no patient data. Raster controls do not establish a working AI feature.

## 7. Component and data mapping

| Need | Existing source to reuse |
| --- | --- |
| Shell/page/layout | `@workspace/ui/components/layout/{app-shell,app-page-scaffold,page-header,page-container,section,top-bar}` plus current app/internal shell |
| Tables/phone rows | `@workspace/ui/components/data-display/{data-table,table,list-row}`; existing sorting/pagination contracts |
| Selection/context | Feature-level composition of shared Section/layout primitives; one semantic record region, not a new card primitive |
| States | `@workspace/ui/components/data-display/data-state` and existing Today state shells |
| Form/actions | Shared Button, Input, SearchInput, Select, Badge and RHF/Zod patterns |
| Overlays/hover | Shared Dialog/Sheet/AlertDialog and Tooltip/SymbolTooltip; no browser confirm/title substitutes |
| Primary phone action | `@workspace/ui/components/layout/bottom-action-bar` |
| Brand/theme | `@workspace/ui/components/indicators/docita-logo`, shared ThemeToggle, current appearance providers |
| App Today data | Existing dashboard logic, date/name/status helpers, start-next hook, current encounter route contract |
| Internal records | `internalClinicListEntrySchema`, existing `useDashboardData`, list normalization and update invalidation |
| Landing URLs/pricing | `getAppBaseUrl`, existing tier/mode/catalog helpers and shared inquiry schema |

App composition changes belong in Today/dashboard features; internal selected review belongs in dashboard features. Promote a primitive only when an actual missing behavior or cross-app use is established. Neither product gets a duplicate selection data store, billing truth, patient formatter, timezone derivation, or theme palette.

## 8. Delivery and verification

1. Review these refinements and paired themes. Correct raster deviations using the binding specification before treating an image as a faithful implementation target.
2. Execute A1 Today ledger and I1 facility review plans first, following the user's clarification. Revisit and plan L1 adoption homepage afterward; no global route rewrite.
3. Implement using current sources and shared primitives; add behavior tests for selection, active-visit handoff, pagination/edit invalidation, inquiry error recovery and theme preference continuity.
4. Capture runnable screens at320/390/768/1024/1440px in light/dark; exercise app comfortable/compact modes and existing accent preferences. Test long names, unavailable detail, keyboard focus/overlays, loading/error/empty/denied and failed writes.
5. Run relevant lint/typechecks/tests/builds and `audit:app`, `audit:internal`, `audit:landing`; theme-token changes additionally require `check:colors`. Broad production changes require repository standards/hygiene/Knip checks and the affected Cloudflare build. No new raster generation counts as those checks.
6. Review brand fidelity, type hierarchy, real first viewport, alignment, control labels, focus and text/non-text contrast. Keep clinical identity and server-confirmed outcomes visible.
7. Record evidence per surface and expand patient/consultation, operations and secondary marketing families. Adoption experiments follow measured baseline and separately scoped instrumentation work.

This design work changes documentation and preview images only. It does not deploy, publish, send inquiries, update a facility or encounter, change clinical data, or create an editable Figma file.

## 9. Visual board record

The six final boards below refine the selected direction rather than replace it with another option set. Original images remain in the local Image Gen directory for chat `01a11799-0f96-7852-adc2-54091a88d93a` and are preview-only material, not runtime marketing assets.

| Surface | Light board | Dark board |
| --- | --- | --- |
| App Today | `exec-7e002e56-9469-4c85-8158-486251aa1715.png` | `exec-8d7b90a0-2bac-4e62-972a-2e007000a339.png` |
| Internal facility review | `exec-ee147095-2d4c-4c54-8a28-2b71f59cdaf0.png` | `exec-169da2a9-e27d-4b92-ab15-19cee93a161a.png` |
| Adoption landing | `exec-16ad5a6f-c697-4fd8-a603-d0f0e0e18e36.png` | `exec-2331954b-3b9b-434b-ad9d-17442f92699b.png` |

Built-in Image Gen received the selected Day ledger image and original brand asset; later theme/correction calls received their preceding generated board. No personal clinical content was supplied. Three earlier drafts remain as refinement history: app light `exec-311eeb14-c2c2-42cc-aa8f-94a11f678a2f.png`, app dark `exec-481e4949-046f-44eb-b4e1-e9537428cd41.png`, and internal light `exec-6bc1b02c-3c09-4266-8fc7-f6913806b2d9.png`.

Visual review corrected the app's serif patient identity, duplicate continuation actions from the original selected image, and the internal light board's misleading clinic switcher/global search. Both internal themes now identify the operator console and retain scoped page search.

Remaining raster limitations are explicit: generated logos approximate the supplied wordmark; CTA color/texture and type/spacing are not measured token fidelity; landing's embedded app image retains the earlier serif patient label. The written original-brand, sans-serif identity, flat clinical-blue action and semantic theme rules remain binding. Refresh marketing product evidence from the corrected, shipped de-identified screen during implementation. Internal board pagination is illustrative; actual disabled states come from cursor response fields. These images do not establish working controls, contrast scores, response contracts, adoption gains, or production readiness.


## Implementation decisions and acceptance (11 October 2026)

The user clarified: **App and internal now; revisit landing afterward.** The Today and facility-review plans are implemented. Other screen-family rows remain design guidance for subsequent composition slices; they are not claimed as implemented by this change.

Today uses Scheduled because the canonical list supplies startTime, not arrival time or a queue token. In Room labels the canonical in-progress appointment, while other rows retain their actual status. The current encounter stays independent of selected preview. Existing app navigation, resizing, theme preferences and topbar composition remain; pinned and topbar Ask AI now open the existing preview shell. Additional global clinic/search/account affordances are a subsequent shell slice, rather than fabricated controls in this ledger change.

Internal lists become ListRow groups below lg so the existing sidebar cannot compress five table columns at tablet width. Facility detail renders all supplied contact fields individually, separate subscription status and real zero counts. Original branding assets are included in internal's static bundle. Billing remains available through the existing navigation.

See [design QA](../../../design-qa.md) for source/capture comparisons, resolved findings, verification evidence and remaining scope. Landing code and its proposed default theme remain deferred; no adoption redesign is included here.
