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

## What's actually bloating the bundle

Not yet diagnosed. The overage is **49 KB gzip** which is roughly the size of one of:
* A large runtime dep landing in the SSR worker (Sentry, @sentry-instrumentation, Lucide tree-shake gap, etc.)
* A polyfill that's now redundant
* An import that was added but never used

The next investigation step is `pnpm --filter @docita/app run build:analyze` (ANALYZE=true opennext build) to get a per-bundle breakdown. Trimming the existing bundle is a **separate task** from the i18n work — it has to land before any i18n install can succeed.

## Future i18n strategy

The plan's preferred path (next-intl with `localePrefix: "never"`) doesn't fit the worker budget. Alternatives to evaluate when the bundle is back under cap:

1. **next-intl with dynamic import** — load the next-intl server runtime lazily per route. Tricky to get right with SSR; risk of hydration mismatches.
2. **Lighter i18n lib** — e.g. `lingui` or a hand-rolled `messages[key] ?? key` lookup. Trades the structured next-intl API for a smaller footprint.
3. **Server-only i18n** — keep messages on the server, ship only the resolved strings in the SSR HTML. Doesn't help if any client component needs t().
4. **Defer i18n entirely** — wait until the bundle is trimmed (separate task), then re-evaluate.

The JSX literal ratchet (6.2) is the durable artifact from the 6.x work: even if next-intl is the wrong tool, any future i18n approach will need the same "no new un-translated literals" guarantee. The ratchet stays.

## Files this finding touches

* `docs/operations/worker-bundle-pre-existing-overage.md` — this file.
* `scripts/checks/check-worker-size.mjs` — the check that caught this (already exists).
* `pnpm check:worker-size` — wire into the CI gate so the overage is visible on every PR, not just Cloudflare builds.

## Verification path forward

1. `pnpm --filter @docita/app run build:analyze` (needs ANALYZE=true) — get the per-bundle breakdown.
2. Identify the top 3 contributors to the overage.
3. Trim, rebuild, re-run `check-worker-size` — target is < 3072 KB gzip with a 5% headroom.
4. Re-attempt the 6.1 install (next-intl scaffold) and re-verify budget.
5. Land 6.3 chrome conversion incrementally, with the ratchet as the per-PR gate.
