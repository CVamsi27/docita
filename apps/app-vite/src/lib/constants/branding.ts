/**
 * Brand color constants for third-party SDKs that demand a hex string
 * (e.g. Razorpay checkout) and cannot consume the runtime CSS oklch tokens
 * declared in `packages/ui/src/styles/globals.css`.
 *
 * Keep these visually aligned with `--primary` / `--foreground` in the
 * design system. Any change to the brand ramp should be reflected here.
 */

/** Hex twin of `--primary` (clinical blue). Used as the Razorpay accent. */
export const BRAND_PRIMARY_HEX = "#2563EB";

/** Hex twin of the deep slate `--foreground` for dark-on-light surfaces. */
export const BRAND_FOREGROUND_HEX = "#0F172A";

/**
 * Resolves a CSS variable to its computed value at runtime, falling back to
 * the supplied default when the variable is not defined or the document is
 * unavailable (SSR).
 */