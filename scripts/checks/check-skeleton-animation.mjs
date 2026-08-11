#!/usr/bin/env node
//
// check-skeleton-animation.mjs
//
// The UI_UX_STANDARD_2026 (motion section) bans skeleton animation on
// chrome — `animation="wave"` and `animation="pulse"` are not allowed
// on the Skeleton primitive. The Skeleton component itself deprecates
// the prop (line 12 in packages/ui/src/components/feedback/skeleton.tsx
// reads: "@deprecated Skeleton no longer animates. The prop is retained
// for backward compatibility but produces no motion."). The contract
// test in packages/ui/src/test/design-tokens.contract.test.tsx already
// asserts this for direct usage; this check covers call sites in
// apps/ that might still pass the prop down to the Skeleton.
//
// We do not fail the build for raw Tailwind `animate-pulse` utility
// classes — those have legitimate uses (e.g. live status dots). Only
// the Skeleton `animation` prop is banned.
//

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from '../lib/check-runner.mjs';

const SKELETON_ANIMATION_PROP = /<[A-Z][A-Za-z0-9]*\s[^>]*\banimation\s*=\s*["'](?:wave|pulse)["'][^>]*>/g;

const files = gitLsSourceFiles(['apps/app', 'apps/internal', 'apps/landing', 'packages/ui'], {
  extensions: ['.ts', '.tsx', '.astro'],
  exclude: [
    /\.(spec|test)\.[tj]sx?$/,
    /\/__tests__\//,
    /\/e2e\//,
  ],
});

const violations = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(SKELETON_ANIMATION_PROP)) {
    const line = text.slice(0, match.index ?? 0).split('\n').length;
    violations.push(
      `${relative(process.cwd(), file)}:${line}: Skeleton animation="${match[1]}" is banned by UI_UX_STANDARD_2026 motion policy. Remove the prop.`,
    );
  }
}

reportFindingsAndExit('Skeleton animation check', violations, {
  extraMessage:
    'Remove `animation="wave"` / `animation="pulse"` from any <Skeleton> / <SkeletonList> / <SkeletonCard>. UI/UX 2026 motion policy bans skeleton animation.',
});
