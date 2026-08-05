/**
 * True when the current runtime has a browser `window`.
 *
 * Lives in this framework-agnostic package on purpose: here `window` is not
 * declared by a DOM lib, so `typeof window` is a genuine runtime check that
 * lint rules (`@typescript-eslint/no-unnecessary-condition`) cannot prove
 * redundant. Use `inBrowser()` instead of inline `typeof window === "undefined"`
 * guards in app code (P5.6).
 */
export function inBrowser(): boolean {
  return typeof window !== "undefined";
}
