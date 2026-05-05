import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "./lib/security-headers";

/**
 * Per-request CSP nonce. Next.js will pick up the `x-nonce` request
 * header and apply it to its own inline boot scripts, which is what
 * lets us drop `'unsafe-inline'` from `script-src` in production
 * without breaking the framework.
 *
 * This middleware deliberately does NOTHING in development to keep
 * hot-reload functional (HMR uses inline scripts that we cannot
 * sign without invasive changes).
 */

const isProduction = process.env.NODE_ENV === "production";

const generateNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export function middleware(request: NextRequest): NextResponse {
  if (!isProduction) return NextResponse.next();

  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy({ nonce, isProduction: true });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    /**
     * Match every path except:
     * - Next.js asset & image pipelines (already integrity-checked)
     * - Static files (svg/png/etc) served from /public
     * - The Next.js `_next` static asset path
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|branding|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
