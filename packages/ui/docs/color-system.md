# Color System Guide

Use semantic tokens and utility classes instead of hardcoded Tailwind palette colors.

## Principles

- Prefer semantic classes (`text-success`, `bg-info`, `border-warning`) over palette classes (`text-green-600`, `bg-blue-500`, etc.).
- Prefer shared badge/tier utilities (`badge-success`, `tier-pro`) for status labels.
- Keep status meaning stable across light and dark themes by using semantic tokens.
- Pair semantic colors with the shared layout and typography primitives documented in [`consistency-system.md`](./consistency-system.md).

## Common Replacements

| Hardcoded pattern                 | Preferred replacement      |
| --------------------------------- | -------------------------- |
| `bg-green-100 text-green-700`     | `badge-success`            |
| `bg-red-100 text-red-800`         | `badge-danger`             |
| `bg-yellow-100 text-yellow-800`   | `badge-warning`            |
| `bg-blue-100 text-blue-800`       | `badge-info`               |
| `text-green-600`                  | `text-success`             |
| `text-red-600`                    | `text-destructive`         |
| `text-blue-600`                   | `text-info`                |
| `border-red-500/30`               | `border-destructive/30`    |
| `bg-purple-500` (tier indicators) | `bg-primary` or `tier-pro` |

## Available Semantic Utilities

Defined in [`packages/ui/src/styles/globals.css`](../src/styles/globals.css):

- Badges: `badge-info`, `badge-success`, `badge-warning`, `badge-danger`, `badge-muted`
- Status badges: `badge-pending`, `badge-processing`, `badge-completed`, `badge-cancelled`, `badge-active`, `badge-inactive`
- Tier badges: `tier-capture`, `tier-core`, `tier-plus`, `tier-pro`, `tier-enterprise`, `tier-intelligence`
- Surface styles: `surface-info`, `surface-success`, `surface-warning`, `surface-danger`

## Enforcement

`pnpm check:colors` scans TypeScript/JavaScript files for hardcoded Tailwind color palette classes and fails when violations are found.
