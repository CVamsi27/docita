import { NextResponse, type NextRequest } from "next/server";
import {
  extractApiV1PathSegments,
  proxyUpstreamApiRequest,
} from "@workspace/utils/http/upstream-api-proxy";
import {
  SECURITY_HEADERS,
  buildContentSecurityPolicy,
} from "./shared/lib/security/security-headers";

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
const isCloudflareBuild = process.env["DOCITA_CLOUDFLARE"] === "1";
const APP_ROUTE_REDIRECTS = new Map([
  ["/dashboard", "/today"],
  ["/upgrade", "/settings?tab=subscription"],
]);

const generateNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export async function middleware(request: NextRequest) {
  const redirectPath = APP_ROUTE_REDIRECTS.get(request.nextUrl.pathname);
  if (redirectPath) return NextResponse.redirect(new URL(redirectPath, request.url));

  if (isCloudflareBuild) {
    const pathSegments = extractApiV1PathSegments(request.nextUrl.pathname);
    if (pathSegments !== null) return proxyUpstreamApiRequest(request, pathSegments);
  }

  if (!isProduction) return NextResponse.next();

  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isProduction: true,
    upgradeInsecureRequests: request.nextUrl.protocol === "https:",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const { key, value } of SECURITY_HEADERS) {
    if (key !== "Content-Security-Policy") {
      response.headers.set(key, value);
    }
  }
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
