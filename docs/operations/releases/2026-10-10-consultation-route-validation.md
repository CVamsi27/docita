# Consultation route and mobile identity — local acceptance

Date: 10 October 2026. Scope: the approved [roadmap](../2026-10-07-improvement-roadmap.md) and [consultation plan](../2026-10-10-consultation-route-plan.md). Local rendering/accessibility repairs are verified; this record is not release approval.

## Reproduced defects and resulting behavior

The registered consultation detail route resolved to another lazy component. React rejected the element and displayed the error boundary. A regression rendering the actual registered route reproduced this before correction. The route now loads the existing default content through one lazy boundary; the redundant feature-page lazy export is removed.

The restored workspace's header displayed a generic Patient name while its sidebar had the real patient. The header now consumes the same canonical patient query/cache as the workspace and uses the existing full-name helper. No API payload, patient store, permission or clinical write rule changes.

Real dark/mobile scans then exposed low-contrast history text and initials, invalid compact step-list children and nested main landmarks. Existing foreground/muted tokens repair the contrast. Shared StepProgress now places its existing actions inside ordered-list items using Button, retains the active step and callbacks, and exposes compact labels even when navigation is unavailable. Its focused regressions failed before correction. The workspace's inner scroll area is a named keyboard-reachable section inside the protected main.

Visual inspection found a further defect: at 390px, an 89-pixel fixture patient name had only 14 pixels of space; the 360px browser cases found the heading hidden entirely. The header now puts mobile actions on a second row and allows names to wrap, preserving desktop placement. The focused width assertion reproduces the failure then passes with 89 pixels available. Consultation audits require the actual fixture patient's heading and reject clipping, so a healthy error shell cannot pass as a working journey.

## Verification and limits

The final results are recorded with the [clinician audit acceptance](2026-10-10-clinician-a11y-validation.md). Earlier attempts passed six of eight theme/viewport consultation cases but failed both 360px cases on the hidden heading; those attempts are not final acceptance. The final strict audit passes all 160 cases with zero violations; the later theme run passes all eight consultation cases, including 360px patient-heading visibility and clipping checks. A local raw-cookie diagnostic also logged fixture refresh/health failures; official authenticated tests use the complete existing session helper and remain the acceptance boundary.

These synthetic local fixtures prove read-only workspace rendering and accessibility, not treatment autosave, completed-visit policy, prescription/lab completion, provider delivery, busy clinical lifecycle or every role/tier. Production credentials, staging latency, dependency advisories and provider/production-role/rollback evidence remain in the [release blockers](2026-10-08-stabilization-validation.md). No push, merge, deployment or production database write is performed.
