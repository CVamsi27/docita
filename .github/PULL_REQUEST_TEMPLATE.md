## Summary

- What changed?
- Why is this change needed?

## Scope

- [ ] Focused change (no unrelated refactors)
- [ ] Breaking changes documented

## UI/UX

- [ ] Loading state handled
- [ ] Error state handled
- [ ] Empty state handled
- [ ] Dark mode verified
- [ ] Responsive at mobile/tablet/desktop
- [ ] Uses shared components/tokens (no ad-hoc styling)

## Backend/API

- [ ] Endpoint auth posture explicit (`@Public`/`@Roles`)
- [ ] Validation added/updated
- [ ] Errors handled safely (no sensitive leakage)
- [ ] Tenant isolation preserved

## Security & Compliance

- [ ] No secrets hardcoded
- [ ] No PHI logged in plaintext
- [ ] Access control reviewed

## Tests

- [ ] Unit/integration tests added or updated
- [ ] E2E updated (if user flow changed)
- [ ] `pnpm test` passes locally

## Quality Gates

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] Accessibility checks run for changed surfaces

## Cleanup

- [ ] Removed debug logs/commented code
- [ ] No generated artifacts committed
- [ ] Docs updated where needed

## Rollout & Risk

- Risk level: Low / Medium / High
- Rollback plan:
- Monitoring signals to watch:
