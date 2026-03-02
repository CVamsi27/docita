# Engineering Rules

## Scope
- Keep changes focused on requested behavior only.
- Prefer updating existing modules over creating new patterns.
- Avoid cross-cutting refactors unless explicitly requested.

## Imports and Boundaries
- Use alias imports for app code (`@/`) instead of parent-relative paths.
- Keep domain boundaries intact between API domains and shared modules.
- Do not import UI concerns into backend layers.

## Frontend
- Use shared primitives from `@workspace/ui` when available.
- Use React Query for server-state fetching/caching.
- Use React Hook Form + Zod for form validation.
- Handle loading, error, and empty states in all data views.
- Use internal navigation via Next.js `Link`/router APIs.

## Backend
- Keep controllers thin and delegate business logic to services/use-cases.
- Enforce tenant and role constraints on all protected operations.
- Validate inputs and sanitize outputs at boundaries.
- Never log PHI/secrets in plaintext.

## Security and Compliance
- Never hardcode credentials, tokens, or API keys.
- Preserve auth, tenant isolation, and audit middleware.
- Apply DPDP-aware handling for patient data retention and consent flows.
- Keep encryption and key handling centralized and configurable.

## Code Hygiene
- Remove dead code, debug logging, and stale files.
- Avoid introducing `any`; use explicit types.
- Prefer small, descriptive functions and clear naming.
- Keep comments minimal; only keep comments that explain non-obvious decisions.

## Testing and Validation
- Update tests when behavior changes.
- Run targeted checks first, then broader lint/type/test where practical.
- Do not fix unrelated failing tests unless requested.

## Documentation and Config
- Keep `.env.example` limited to required runtime keys.
- Update docs only when behavior/config/architecture changes.
- Keep script inventory minimal and aligned with package scripts.

## PR Readiness Checklist
- Build/lint/typecheck pass for changed surfaces.
- No secrets, debug artifacts, or generated noise committed.
- User impact and rollout risk are described clearly.
