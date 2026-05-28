# @workspace/types

Manual changelog. Add an entry at the **top** of the file when a change
removes, renames, or changes the runtime shape of an exported schema or
type, or when a new domain barrel is added.

Skip entries for: pure type-only widenings, internal refactors that
preserve the exported surface, doc-only edits.

## Format

```
## YYYY-MM-DD — <one-line summary>
- breaking: <list>
- added: <list>
- deprecated: <list>
- internal: <skip unless surface impact>
```

## Unreleased

- internal: introduced per-package CHANGELOG hygiene (no behavioural change). See SYSTEM_DESIGN_AND_PATTERNS.md §56 item 52.
- noted: per-domain barrels exist at `src/<domain>/index.ts` (access, ai,
  api, admin, billing, clinical, contracts, forms, leave, medical-documents,
  operations, patient, pdf, shared, whatsapp). To enable
  `@workspace/types/<domain>` deep imports (smaller rebuild surface
  per `SYSTEM_DESIGN_AND_PATTERNS.md` §28.2 item 17), add the matching
  `exports` entries in `package.json` and switch tsup to a multi-entry
  build. Deferred: not safe without testing all consumers.
