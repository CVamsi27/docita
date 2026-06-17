export const dynamic = "force-dynamic";

/**
 * Empty same-origin page used by Playwright to run `page.evaluate` session
 * bootstrap for clinic selection before navigating to protected routes.
 */
export default function E2ESessionSeedPage() {
  return <></>;
}
