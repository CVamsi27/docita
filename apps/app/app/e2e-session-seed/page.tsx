import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Gated out of production. E2E runs use `next dev` (see `playwright.config.ts`),
 * so `NODE_ENV !== "production"` keeps the seed page available for tests while
 * removing it from production builds. An explicit opt-in flag mirrors the
 * `(tools)/layout.tsx` convention for the rare case of an e2e run against a
 * production-mode build.
 */
function e2eSeedEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_E2E_SEED === "true"
  );
}

/**
 * Empty same-origin page used by Playwright to run `page.evaluate` session
 * bootstrap for clinic selection before navigating to protected routes.
 */
export default function E2ESessionSeedPage() {
  if (!e2eSeedEnabled()) {
    notFound();
  }
  return <></>;
}
