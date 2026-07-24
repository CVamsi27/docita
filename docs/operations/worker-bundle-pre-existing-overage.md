# Cloudflare worker bundle — pre-existing overage

## Status (2026-07-15)

**Bundle size: 3121.1 KB gzip / 19273.5 KB raw**
**Cloudflare cap: 3072.0 KB gzip (3 MiB)**
**Over by: 49.1 KB gzip**

## When was this discovered?

A Cloudflare build was triggered after the 6.1 (next-intl scaffold) and 6.3 (chrome conversion) commits. The build's `check-worker-size` step failed with the over-budget message.

A follow-up build was run against commit `27149d7a5` (the commit **before** any 6.1/6.3 work) to isolate the cause. Same overage — **3121.1 KB gzip**. The pre-existing worker bundle is already 49 KB over the cap.

## Impact on the planned 6.1 / 6.3 work

* The 6.1 next-intl install would have made the overage worse (server runtime + ICU support adds weight even with tree-shaking).
* The 5 i18n commits (6.1 + 4 × 6.3) were reverted. The `git revert` history is the audit trail:
  - `4a3e0caa0` Revert 6.1
  - `2092a40c0` Revert 6.3 first slice (route-meta)
  - `62c166ace` Revert 6.3 second slice (sidebar)
  - `d2e6a194d` Revert 6.3 third slice (forgot-password)
  - `0f2fd5cd6` Revert 6.3 fourth slice (auth)
* The JSX literal density ratchet (6.2 / commit `a517d8c61`) is **kept** — it has no runtime impact and gates any future chrome conversion that lands in the worker.

## Analyzer breakdown (Node.js server bundle = 1.6 MB gzip → worker = 3.1 MB gzip)

The Cloudflare worker is ~2x the Node.js server bundle because of `workerd` + `opennext` + the SSR function wrapping.

### Top contributors to the Node.js server bundle (1.6 MB gzip)

| gzip  | parsed | chunk | source |
|-------|--------|-------|--------|
| 162 KB | 575 KB | `5641.js` | one big shared chunk, mostly `next@16.2.6` runtime (81 KB) + `he@1.2.0` (29.5 KB, transitive via hastscript/unified) + `zod` (12.7 KB) + `tailwind-merge` (7.6 KB) + `date-fns` (11.2 KB) |
| 109 KB | 421 KB | `3522.js` | shared workspace packages — `packages/types/dist/index.js` (27 KB Zod schemas) + `packages/data-access/dist` (13 KB) + `app/shared` (44 KB) |
| 86 KB  | 286 KB | `2365.js` | node_modules sub-chunk |
| 56 KB  | 215 KB | `7745.js` | features sub-chunk |
| 45 KB  | 163 KB | `5611.js` | node_modules sub-chunk |
| 37 KB  | 137 KB | `app/book/[referralCode]/page.js` | public-booking page |
| 36 KB  | 135 KB | `app/(protected)/consultation/[id]/page.js` | consultation room |

### By top-level path

* **`app/` first-party: 971.6 KB gzip** ← biggest, but mostly the route surface (every protected route ships server bundle for SSR)
* Anonymous shared chunks: ~650 KB gzip
* `packages/` workspace: ~96 KB gzip (types 35 KB + data-access 13 KB + ui 7 KB + rest)
* Cloudflare runtime wrapping: ~1.5 MB gzip on top of the 1.6 MB server bundle → 3.1 MB total

### Why we can't trivially fix this

* `next@16.2.6` itself contributes ~81 KB gzip. Upgrading or downgrading Next is a major version decision and not in scope.
* `he@1.2.0` (29.5 KB) is transitive via `hastscript@9.0.1` (unified/remark/rehype). Likely used by the markdown rendering pipeline (legal docs, AI summaries, prescription rendering). Dropping it means replacing the markdown pipeline.
* `packages/types/dist/index.js` (27 KB) is the Zod schema bundle. It's used by every feature for runtime validation. Hard to trim without losing validation.
* The first-party `app/` chunk is the largest single contributor (971 KB gzip). Most of it is route-specific code that the worker needs to SSR every protected page. Code-splitting by route would help client bundles but the worker needs to be able to SSR any route on demand.

## What could realistically save 49 KB

In rough order of cost / risk:

1. **Drop `he` (29.5 KB)** — replace `hastscript` + `unified` markdown rendering with a smaller alternative (`marked` is ~10 KB, or hand-rolled escaping for the limited set of HTML features we actually need). **Estimated savings: 19 KB gzip** after accounting for the replacement.
2. **Audit `date-fns` usage** (11.2 KB) — the project uses `date-fns@4.1.0` and `date-fns-tz@3.2.0`. If most usages are `format`/`parse`/`addDays`, switching to a custom tiny wrapper or the built-in `Intl.DateTimeFormat` could save most of it. **Estimated savings: 8 KB gzip.**
3. **Audit first-party `app/shared`** (44 KB) — check for unused exports, dead code, accidental barrel imports. **Estimated savings: 5-10 KB gzip.**
4. **`zod` subset (12.7 KB)** — zod 3 is widely used. Plan said defer zod 4. **Skip for now.**
5. **Tailwind-merge (7.6 KB)** — used by every `cn(...)` call. **Skip — too invasive to remove.**

Combined potential: **~30-40 KB gzip** if all four are addressed. That's just enough to land under the 3 MiB cap with a 5% headroom. None of these are quick wins — each is a 1-2 day piece of work.

## Files this finding touches

* `docs/operations/worker-bundle-pre-existing-overage.md` — this file.
* `scripts/checks/check-worker-size.mjs` — the check that caught this (already exists).
* `pnpm check:worker-size` — wire into the CI gate so the overage is visible on every PR, not just Cloudflare builds.

## Verification path forward

1. ~~`pnpm --filter @docita/app run build:analyze` (ANALYZE=true)~~ — **done.** Findings in the table above.
2. Pick the lowest-risk trim from the candidates above (`he` replacement is the best $/KB win).
3. Re-verify: Cloudflare build, target `< 3072 KB gzip` with a 5% headroom.
4. Re-attempt the 6.1 install (next-intl scaffold) and re-verify budget.
5. Land 6.3 chrome conversion incrementally, with the ratchet as the per-PR gate.

## Why the JSX literal density ratchet (6.2) is kept

Even if next-intl turns out to be the wrong tool for the worker budget, any future i18n approach (next-intl, lingui, hand-rolled) needs the same "no new un-translated literals" guarantee. The ratchet is the durable safety net, not the i18n implementation.
