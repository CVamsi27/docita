# Audits

> **The 2026-08-11/12 audit cycle is consolidated into 2 docs:**
>
> 1. **[`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md)**
>    — Every backend finding, fix, and follow-up.
> 2. **[`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md)**
>    — Every frontend finding, fix, and follow-up.
>
> See [`INDEX.md`](INDEX.md) for the full history + open findings by severity.

Quality gates live in `pnpm verify:standard` (see root `package.json`).
This folder keeps the audit coverage ledger required by
`check:audit-coverage` (`docs/audits/evidence/2026-05-audit-coverage.md`).

## Layout

```
docs/audits/
├── BACKEND_FINAL_AUDIT_2026-08-11.md      # consolidated backend final pass (17 sections)
├── FRONTEND_FINAL_AUDIT_2026-08-11.md     # consolidated frontend final pass (38 sections)
├── INDEX.md                              # history index + open-findings ranking
├── README.md                             # this file
└── evidence/
    └── 2026-05-audit-coverage.md         # ledger required by check:audit-coverage
```

The `evidence/` directory intentionally keeps only the single file
required by `check:audit-coverage.mjs`. Prior structure-audit and
runtime-validation reports (6 files, ~870 KB) were stale output
artifacts; regenerate them on demand with `pnpm audit:structure
--write` (the README previously inlined links to them, but the
links were broken after the 2026-08-12 doc-prune commit
`b6d51c4d8` removed the upstream audits).
