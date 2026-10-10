# Consultation route and semantic recovery plan

Date: 10 October 2026. This follows the approved roadmap's clinician journey phase and the [accessibility gate plan](2026-10-10-clinician-a11y-plan.md).

## Reproduced problem and approach

The consultation detail route resolves a lazy route to another lazy component, so React renders the error boundary instead of the workspace. Load the existing detail content directly through one route boundary. Pin the real route registration with a failing render regression, then require the real patient's heading in authenticated browser audits so an accessible error shell cannot pass as a working journey.

The restored browser surface exposes a generic header name while its sidebar has the patient, low-contrast history labels and dark-mode initials, invalid compact step-list children and nested main landmarks. Reuse the same canonical patient query/cache as the workspace for the header; retain permissions and appointment contracts. Use existing foreground/muted tokens, shared Button steps inside an ordered list, and a named keyboard-reachable section inside the protected main. Add a StepProgress semantics/callback regression. No clinical write policy or API/database change is included.

Also resolve the audit's minor blank patient-avatar column heading with the existing translated Patient label and Help's skipped heading level. Keep each translation namespace in its own component so the key registry can verify it.

## Tasks and verification

- [x] Reproduce the double-lazy route and the patient/header/Help semantics before correcting source.
- [x] Restore the route, canonical patient heading, token contrast, step list and workspace landmark through existing primitives.
- [x] Verify actual consultation headings and strict axe results across mobile/desktop and light/dark fixtures; rerun the whole authenticated clinician audit.
- [x] Run unit, type, lint, standards, Knip, color/hygiene and affected builds; update companion evidence and commit through normal hooks.

These local synthetic read-only workspace fixtures do not prove clinical autosave, prescription/lab completion, completed-visit write policy, provider delivery or every role/tier. Those journeys remain separate roadmap work.

Visual review also shows that the mobile toolbar squeezes the patient heading to a few characters despite the correct accessible name. Before the final audit, reproduce this with the heading's scroll/client width, then wrap header identity/actions into separate rows below `sm`. Allow patient names to wrap using token typography and preserve desktop placement. Consultation browser cases must reject a clipped fixture heading as well as require its name.
