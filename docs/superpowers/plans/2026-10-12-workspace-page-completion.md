# Workspace page completion

> Execute inline using the approved ledger specification and existing final-pass plan. The user requested completion across all app/internal pages and already authorized commit and push; landing stays deferred.

**Goal:** Close remaining navigation, page-state and record-page gaps without changing clinical workflows or access rules.

**Architecture:** Reuse shared UI primitives in existing route shells. Internal route labels remain sourced from the console navigation; local tab behavior stays in PageTabs. Protected clinician surfaces retain the approved continuous ledger and current forms, permissions and save guards.

**Tech stack:** Node >=22.22.0, pnpm 10.30.3, React Router, React Query, Vitest and Playwright.

- [x] Inventory the current route trees, including record detail/edit routes and compatibility shells. Review existing page composition and test coverage; record findings in `design-qa.md`.
- [x] Add failing behavior regressions for internal navigation links and changing browser titles, disabled tab activation, and Analytics retry when its billing query fails.
- [x] Replace console navigation buttons with Button-asChild React Router Links; keep current styles and active state, close the mobile sheet on ordinary navigation, and add shared rail tooltips when collapsed. Derive PageMeta from the same navigation items.
- [x] Set the actual disabled state on PageTabs buttons. Use shared DataState for route loading with bounded height inside the shell, preserving existing loading copy.
- [x] Include both Analytics queries in the failure/retry state so unavailable billing figures cannot look like empty data. Keep independent errors visible and rerun both reads on Retry.
- [x] Review populated patient/consultation/invoice/prescription/claim details and forms at phone and desktop widths in light/dark. Correct reproducible clipping using shared layout primitives; preserve patient identity and clinical save semantics.
- [x] Run focused units, relevant typechecks, lint, app/internal browser and accessibility checks, Cloudflare builds, standard/hygiene/Knip/colors checks. Capture updated evidence and distinguish verified data/state combinations from untested lifecycles.
- [x] Deliver the verified page-completion changes through a normal commit and push on the existing feature branch, with repository hooks enabled. Verify the remote commit and clean working tree, then remove only owned local runtime resources.

Additional final-pass findings: replace the obsolete Upgrade stub with the canonical subscription route; retain record page identity and Retry; guard the pending invoice update; widen contained invoice columns; name populated editor controls; correct text contrast; subscribe the data-access bridge to canonical permission updates so cold queries refresh without changing access rules. Each behavioral defect has a red/green regression or real browser failure.
