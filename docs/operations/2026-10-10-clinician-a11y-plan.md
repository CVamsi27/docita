# Clinician accessibility gate and recovered findings plan

This is the next inline slice of the approved roadmap's Phase 3. The full clinician audit, now running with actual authenticated fixtures, records axe findings but never asserts that serious/critical findings are absent. Its first completed project reproduced four actionable failures: invalid `aria-sort` on patient sort buttons, unnamed inventory filters, unnamed subscription usage progress bars and a scrollable Settings main region that is not keyboard reachable.

## Scope and approach

Reuse existing primitives and labels; preserve sorting callbacks, filter values, usage calculations, permissions and routing. Patient sort state belongs on the shared DataTable column header, with a typed optional ARIA sort property for externally controlled sorting. Remove it from the button. Name inventory Select triggers with their existing translated field labels, and usage Progress with the same visible meter label. Make the existing protected main scroll region keyboard reachable with a focus ring and remove its decorative entrance animation. No dependency, API, database or commercial-policy changes.

Make the audit fail on actual serious/critical findings after collecting them. Preserve diagnostic reports; include the project and audit case in report keys and project filenames so different viewport results cannot overwrite each other. Navigation and scanner errors already propagate; keep them as failures. Retain explicit public-only skips. Do not count these reports as production or complete role/tier coverage.

## Tasks and verification

- [ ] Pin patient header semantics/sort actions, inventory accessible names and both usage surfaces with focused render regressions; record red assertions before corrections.
- [ ] Repair the four findings through existing primitives/tokens and keyboard behavior. Add a real browser gate regression proving a healthy fixture passes and an unlabelled input fails the same assertion used by the audit.
- [ ] Run the strict full `pnpm audit:app` with the owned PostgreSQL/API fixture, all configured projects; inspect every finding rather than suppressing it. Recheck Today keyboard/recovery if its shared shell changes.
- [ ] Run relevant unit tests, typecheck, lint, standards, Knip, color/hygiene and Cloudflare build. Update the matrix, roadmap, backlog and dated acceptance record; commit through normal hooks. Clean up only owned fixture processes/container once both slices finish.
