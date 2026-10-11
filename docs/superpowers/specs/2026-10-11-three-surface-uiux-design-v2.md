# Docita UI/UX revision: composition before implementation

Date: 11 October 2026. Status: the user selected displayed option 3 for app/internal and requested separate adoption-oriented landing and dark-mode refinements; see [the detailed selected-direction design](2026-10-11-ledger-and-adoption-detailed-design.md). The exploration below records the selection context. Priority remains **landing, app, and internal together**.

## What changes from the first proposal

The user rejected the previous appearance. Its automated checks establish usable controls and readable text, not an acceptable visual direction. Keep the workflow, safety, route, and state requirements from [the first specification](2026-10-11-three-surface-uiux-design.md); replace its visual composition and prototype as the implementation target.

The reviewed evidence is the previous landing/app/internal desktop previews, the stored Today product capture in `apps/landing/src/assets/product/today.png`, the actual Docita brand image, and the canonical design tokens. The stored capture is a historical design reference, not evidence of the current authenticated production screen. The new generated concepts use synthetic patient labels only.

### Visible problems in the rejected previews

| Evidence | Problem | Revision |
| --- | --- | --- |
| Landing preview | Oversized copy beside a mostly empty product panel; little product evidence; same treatment as the dashboards | Lead with a specific clinic workflow and a larger, legible product view; use editorial page sections |
| App preview | Sidebar determines an unnecessarily tall page; active task occupies a small area; right rail repeats general explanations | Fit the shell to a real viewport, keep footer/AI reachable, and make current visit plus queue the main composition |
| Internal preview | Facility cards inside a containing card; serif facility names; sparse records and instructional side panels | Use a compact facility table with a selected-record review surface and contextual operational facts |
| All previews | Repeated pale rounded rectangles, similar rhythm, excessive micro-labels, generic helper copy | Use alignment and spacing first; dividers second; bounded surfaces only when they represent a real task or object |
| Branding | Generic cross plus text substituted for the existing wordmark | Use existing branding assets at a readable intrinsic aspect ratio |

Do not interpret this as permission to weaken accessibility, invent operational statistics, alter access policy, or replace the canonical component library.

## Visual foundation

- Keep the authoritative [UI/UX standard](../../ui/UI_UX_STANDARD_2026.md) and `packages/ui/src/styles/globals.css`. This revision changes composition, not the token source.
- Retain warm paper backgrounds, clinical blue primary actions, semantic status colors, and opaque surfaces. Use the existing brand-ink/cyan pairing only for the live queue/token board on a dark surface. AI alone uses the accent treatment.
- Inter carries navigation, patient identity, facility names, forms, tables, and status. Fraunces carries restrained page/section/marketing headings; it does not turn every data label into a headline.
- Desktop marketing hero: existing `--fs-6xl` scale; tablet `--fs-5xl`; phone existing heading scale suited to line length. App/internal page headings use `--fs-4xl`, section headings `--fs-2xl`, essential body/data `--fs-base` or `--fs-lg` as appropriate.
- Use existing space-2/3/4/6/8 and radius tokens. Less page furniture comes from removing unnecessary containers, not introducing inconsistent radius/color variants.
- Product shells fill their viewport. App/internal retain the existing shell's scroll ownership: navigation may scroll independently when necessary; footer and primary chrome stay reachable. Do not stretch the whole page to fit every navigation item.
- Default density differs by job: landing spacious and editorial; app comfortable clinical rows; internal compact records. Each preserves readable text, focus, and touch targets.
- No decorative motion, arbitrary gradients, glow effects on product chrome, new fonts, fictitious charts, or marketing KPI counters. Preserve the actual branding asset rather than redrawing its effects.

## Three visual directions to compare

Explore the same Today screen at a 1440 × 1024 desktop target so layout differences are meaningful. Each concept has one clear action and one or two supporting areas. Do not combine multiple concepts or multiple product screens in one generated image.

| Direction | Today composition | Tradeoff |
| --- | --- | --- |
| Visit desk | Broad current-visit band, compact waiting queue directly below, small brand-ink token board and due-work strip | Strong immediate orientation; must avoid duplicating counts across token board and queue |
| Encounter workspace | Current patient's active workspace dominates; queue becomes a narrow secondary lane; history and draft context stay beside the visit | Best continuity during consultation; reception's queue needs a clear independent destination |
| Day ledger | An aligned worklist dominates the page; current visit is an explicit highlighted row plus a modest persistent context panel | High scan efficiency; primary active task must remain distinct from peer rows |

These are alternative foundations, not three product surfaces to choose between. All three surfaces remain in scope. A selected foundation informs shared hierarchy and surface discipline; landing and internal still receive their own composition reviews.

Recommendation to test: Visit desk, because it makes the current patient and next queue decision clear while preserving the clinician's Today entry. Selection remains with the user after the three images are displayed. Generated images are visual hypotheses, not interactive UI or tested clinical behavior.

### Generated concept record

The three independent results appeared in this order in the chat on 11 October 2026. Selection numbers refer to that displayed order.

| Displayed selection | Direction | Generated image filename |
| --- | --- | --- |
| 1 | Visit desk | `exec-3254671e-2ed5-4ab1-966f-76c04b40a0da.png` |
| 2 | Encounter workspace | `exec-9c9c3cf0-e25a-4832-9972-b69d51d9d9fb.png` |
| 3 | Day ledger | `exec-3ec95546-6143-4cb9-9bd9-ecdaae5669b1.png` |

Original outputs remain in the local Image Gen directory for chat `01a11799-0f96-7852-adc2-54091a88d93a`; they are not production assets or committed application screenshots.

Visual inspection found generation deviations that must be corrected in the selected direction's next design pass: approximated wordmarks rather than the original asset, combined navigation/footer labels in some images, an unsupported identity-confirmation label in Visit desk, ambiguous waiting/expected counts in Encounter workspace, and a serif patient heading plus duplicate continuation buttons in Day ledger. The planned canonical identity, navigation, status sources, fonts and single primary action remain binding. Selection chooses a composition; it does not accept these deviations or establish functional readiness.

## Landing: an editorial product story

### Main composition

At desktop, use a clear headline and one short paragraph alongside a large product demonstration, with the visual given enough room to read. The headline states the outcome: **“Run your clinic day from one workspace.”** Keep Start setup primary, Book guided demo secondary, and Sign in visible for existing users. Resolve every destination from existing URL helpers/routes.

The product view should demonstrate a real transition: arrival → current visit → reviewed outputs. Use current verified product captures when implementation begins. A manually selected state may change the view; do not rotate automatically. Product imagery may use a contrasting brand-ink frame where the existing tokens permit it; keep the marketing page itself on the shared background.

Follow with a short, alternating evidence rhythm rather than equal feature cards:

1. A wide Today/queue evidence section: what reception and the clinician see.
2. A consultation/patient-context section: continuity and explicit draft/final boundaries.
3. A smaller setup/trust section with genuine policies and import assistance links.
4. Existing catalog-driven pricing, FAQ, and a final setup action.

Move detailed breadth to the existing workflow/content routes. Remove repeated homepage paragraphs that merely list the same features. Publish actual setup timing, testimonials, usage counts, and capability claims only when their source is verified.

### Required design boards before code

- Homepage first two sections, desktop and 390px phone; existing-user entry included.
- Pricing comparison, selected currency/mode and unavailable-data state; canonical catalog used.
- Demo inquiry, filled/error/pending/success, preserving inputs after failure.

Legal, public prescription/invoice/payment links, and protected token behavior retain the first spec's independent safety scope.

## App: a clinical workspace

### Today and the shell

Keep the TRACK/SERVICES structure, exact current destinations, command-palette parity, footer controls, and pinned Ask AI. Do not merge multiple navigation destinations into one text label. At 1440 × 1024, show current visit, the first waiting rows, and the main continuation action together in the first view. On smaller screens, preserve active visit → queue → due work ordering.

Patient identity is an Inter data anchor. The active task has a distinct status and a single Continue consultation action. A compact live token board can supply orientation using existing brand-ink/cyan tokens, without becoming a second dashboard. Counts and queue rows derive from the same canonical data.

Show due work as actionable compact rows. Remove the previous explanatory “patient context” panel: it repeats what the workspace already shows. When no contextual information is useful, omit the rail instead of filling it with prose.

### Consultation and patient context

Build a coherent encounter workspace: patient identity and unresolved critical context at the top, existing notes/tabs in the main region, relevant history alongside it, and clear draft/save state. Keep the current encounter visible through prescriptions and investigations. Preserve existing Zod schemas, validation, consent, tenant/role checks, and safe draft recovery.

Missing allergy/history data stays explicitly missing. AI remains scoped and reviewable, with its standard disclaimer and unavailable/local-preview distinctions. Changes to clinical output, completion, or collection require authoritative server confirmation.

### Required design boards before code

- Selected Today composition, normal/empty/error/denied and 390px phone.
- Patient summary with meaningful history density and partial timeline loading.
- Consultation with unsaved draft, failed save, prescription handoff, and clear patient identity.
- Appointment list/calendar and collection flow as a separate second design batch; no invented scheduling or payment states.

The family inventory from the first spec remains the rollout checklist, including clinical outputs, worklists, reporting, account entry, subscription, and settings.

## Internal: an operator console

### Facility directory and selected record

Keep the current internal groups and routes. Use a table for facilities: name, active status, access tier, and one Review action. Essential values use Inter and aligned columns; no per-facility decorative card. Optional contacts/counts belong in the selected record when relevant.

Selecting a row opens a contextual review region on desktop and a shared sheet/dialog on phone. It shows actual current values, data freshness where supported, and available actions for the operator's permissions. Omit a default rail containing general instructions. Access tier and subscription remain separately sourced and labeled; unavailable facts are not invented.

The first slice labels search as current-page search. A genuinely global search is a separate API/schema/client task with cursor reset and server-filtered results. Do not hide this limitation in an apparently global search box.

### Support and sensitive changes

Support uses an efficient conversation list and one selected conversation. Draft and delivery feedback stay with the reply action. Sensitive facility/account changes show current versus proposed value, reason, permission constraints, and final confirmation. Assignment, escalation, saved views, and a unified exception queue remain separate proposals until their contracts are specified.

### Required design boards before code

- Facility table plus selected review, desktop and 390px phone.
- Sensitive change confirmation, denied role, conflict and failure recovery.
- Support conversation/draft/send failure and billing/payment review using existing contract fields.

Retain all existing management, finance, operations, and partner route families in the phased rollout; no simultaneous route rewrite.

## Revised delivery process

| Stage | Result | Exit condition |
| --- | --- | --- |
| Visual selection | Exactly three independent Today direction images using the rejected synthetic preview and actual brand as references | User selects or refines one direction; no code scaffolding yet |
| Three-surface boards | Landing, app, internal desktop/phone designs described above | Review composition, branding, density, key actions and state hierarchy for every surface |
| Pattern and state specification | Exact shared primitives, state flows, role/tier matrix, and source fields for selected designs | No unsupported capability claims; shared component sourcing documented |
| Separate executable plans | L1 homepage, A1 Today/encounter, I1 facility review plans with real file paths and regression tests | Each plan is independently implementable and reviewed |
| First balanced implementation cycle | One approved slice from each surface | All three meet their own functional, responsive, accessibility and build checks |
| Family rollout | Remaining route families from the first spec | Evidence recorded per route/role/tier, not a blanket claim from representative screens |

Visual selection is the next decision, not approval to deploy or send messages. Keep existing paying users in their clinic workspace; introduce only targeted setting prompts where needed.

## Review standards

Visual review and functional verification are separate gates.

- Compare desktop and phone compositions directly. Check whether the active task, identity, status, and primary action are immediately legible.
- Check actual brand asset use, font family/weight, page and data hierarchy, alignment, spacing, border/radius consistency, and repeated/empty furniture.
- On app/internal desktop, review real first-viewport composition; sidebar length cannot manufacture a tall screenshot full of empty main space.
- Use one primary action per task area. Do not rely on color or hover to communicate important status/actions.
- Review allowed and denied access, loading/error/empty, stale/reconnecting, dirty/failed-save, and write-confirmation states. Never hide protected actions only cosmetically.
- Generated raster concepts do not prove responsive layouts, focus, contrast, data correctness, or interactions. Validate those after the chosen design becomes a runnable prototype.
- Run the same applicable production commands and critical journeys defined in the first spec only when implementation starts. Existing successful checks do not validate a new design automatically.

## Tool and evidence boundaries

Product Design provides the ideation workflow; built-in Image Gen generates three independent concept images. Saved Product Design context was absent, so the repository and this conversation supply the brief. No personal clinical content is included in generation inputs: only the rejected synthetic app preview and the brand asset.

No production source, design tokens, navigation registry, or runtime dependency changes are part of this revision. The previous prototype is retained as rejected reference material; it must not be treated as the selected target. No live deployment, Figma file, or interactive acceptance is claimed for the generated concepts.
