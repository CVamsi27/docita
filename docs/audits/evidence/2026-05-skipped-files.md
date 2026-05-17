# 2026-05 Skipped Files

| Pattern | Reason |
|---|---|
| `node_modules/**` | Vendored dependencies; excluded from repository audit. |
| `.next/**` | Runtime/generated Next.js output. |
| `dist/**` | Build output from package and app builds. |
| `coverage/**` | Generated test coverage output. |
| `.turbo/**` | Turborepo cache output. |
| `playwright-report/**` | Generated Playwright report output. |
| `test-results/**` | Generated test artifacts. |
| Binary image/font assets | Reviewed by reference/use and repository hygiene rather than line-by-line source audit. |

No tracked runtime/security source file is intentionally skipped by this ledger.
