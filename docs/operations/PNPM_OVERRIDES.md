# pnpm overrides audit (DP2)

Root `package.json` `pnpm.overrides` pins transitive vulnerabilities and version skew (ajv, axios, hono, vite, etc.).

## Policy

- Add an override only when `pnpm audit --audit-level=high` or a CI failure documents a reachable CVE.
- Prefer bumping the direct dependency in the workspace package that imports it.
- Document new overrides in the PR description with the advisory ID.

## Verification

```bash
pnpm audit --audit-level=high
pnpm install
pnpm verify:standard
```

Last reviewed: 2026-05-23 (2026-05 comprehensive audit).
