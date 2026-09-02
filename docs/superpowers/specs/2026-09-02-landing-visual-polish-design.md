# Landing Page Visual Polish Design

## Goal

Refine the Docita landing page so it feels more intentional, premium, and easy to scan without changing its content model, routes, or conversion destinations. The primary success criterion is stronger visual polish, not a broad information-architecture rewrite.

## Direction

Use a hybrid of quiet clinical editorial design and product theatre. The page should have a restrained canvas, disciplined typography, and a larger, more confident live product preview as its signature visual element. Premium quality should come from hierarchy, spacing, contrast, and consistency rather than additional decoration.

## Visual system

- Preserve the existing Docita token palette and light/dark theme behavior.
- Reduce competing gradients, glows, and background treatments so the hero product preview carries the strongest visual emphasis.
- Use Fraunces only for the hero emphasis and Inter for supporting copy and interface text.
- Standardize repeated cards around a consistent radius, border treatment, and shallow shadow.
- Reserve status colors for meaningful operational states such as live, waiting, completed, or success.
- Keep all colors token-based; do not add raw hex values outside the authoritative token file.

## Composition

Keep the existing homepage sections and routes, with this narrative hierarchy:

1. Header and hero: product promise plus live workflow preview.
2. Proof strip: compact credibility, visually quieter than the hero.
3. Clinic rhythm: the narrative centerpiece showing a day moving through Docita.
4. Product surfaces: real screenshots with consistent framing and captions.
5. Audience and workflow comparison: fast-scanning decision support.
6. Rollout and differentiators: practical confidence-building.
7. Pricing and FAQ: calm commercial close with one dominant CTA.

Across the page:

- Increase whitespace around major section headings.
- Use full-width bands only when they clarify a story transition.
- Align content to one consistent page shell.
- Reduce the number of visually loud panels competing at the same time.
- Make mobile sections stack predictably while keeping controls reachable.

## Interaction and accessibility

- Preserve the hero preview's automatic state cycle, hover/focus pause behavior, and reduced-motion handling.
- Strengthen selected and keyboard-focus states for preview tabs and navigation links.
- Preserve current CTA destinations and accessible labels.
- Keep mobile navigation horizontally usable and keyboard accessible.
- Use short, purposeful hover transitions; do not add decorative motion.

## Implementation boundaries

- Changes are limited to the landing app's visual components and styles, plus focused tests if verification exposes a regression.
- Do not change backend contracts, landing routes, analytics behavior, or pricing logic.
- Do not overwrite unrelated existing working-tree changes.

## Verification

Run the landing app's relevant lint, typecheck, unit tests, accessibility checks, and responsive/critical-flow checks. Inspect desktop and mobile output and confirm reduced-motion behavior remains valid.
