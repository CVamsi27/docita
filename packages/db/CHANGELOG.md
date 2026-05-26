# @workspace/db

Manual changelog. Add an entry at the **top** when:
- A Prisma model is added, removed, or renamed.
- A migration is shipped.
- An index is added or dropped on a hot table.

## Unreleased

- internal: added canonical SOURCE-OF-TRUTH header to
  `prisma/schema.prisma`; added README to `prisma/schema/` clarifying it is
  documentation-only. See SYSTEM_DESIGN_AND_PATTERNS.md §56 item 43.
- internal: introduced per-package CHANGELOG hygiene. See SYSTEM_DESIGN_AND_PATTERNS.md §56 item 52.
