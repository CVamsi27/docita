import { type NextRequest, NextResponse } from "next/server";
import {
  extractApiV1PathSegments,
  proxyUpstreamApiRequest,
} from "@workspace/utils/http/upstream-api-proxy";
import {
  resolveInternalApiProxyBaseUrl,
  shouldProxyInternalApiRequest,
} from "./shared/lib/internal-api-proxy";
import { isPortalPath } from "./shared/lib/internal-portal-routes";
import {
  applyInternalSecurityHeaders,
  buildInternalContentSecurityPolicy,
} from "./shared/lib/security/security-headers";

/**
 * Per-request CSP nonce. Next.js will pick up the `x-nonce` request
 * header and apply it to its own inline boot scripts, which is what
 * lets us drop `'unsafe-inline'` from `script-src` in production
 * without breaking the framework.
 *
 * This middleware deliberately does NOTHING extra in development to
 * keep hot-reload functional (HMR uses inline scripts we cannot sign).
 */
const isProduction = process.env.NODE_ENV === "production";

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Apply security headers + (in production) a nonce-bound CSP to a
 * response. Returns a new response when a render-bound nonce must be
 * propagated via the request headers; otherwise returns the original.
 */
function applyHeadersWithNonce(
  request: NextRequest,
  response: NextResponse,
  options: { render?: boolean } = {},
): NextResponse {
  if (!isProduction) return applyInternalSecurityHeaders(response);

  const nonce = generateNonce();
  const csp = buildInternalContentSecurityPolicy({
    nonce,
    isProduction: true,
  });

  let outgoing = response;
  if (options.render) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    outgoing = NextResponse.next({ request: { headers: requestHeaders } });
  }

  applyInternalSecurityHeaders(outgoing);
  outgoing.headers.set("Content-Security-Policy", csp);
  return outgoing;
}

const STATIC_EXT =
  /\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff2?|ttf|txt|xml|json|webmanifest)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathSegments = extractApiV1PathSegments(pathname);
  if (
    pathSegments !== null &&
    shouldProxyInternalApiRequest(request.nextUrl.hostname)
  ) {
    return proxyUpstreamApiRequest(
      request,
      pathSegments,
      resolveInternalApiProxyBaseUrl(request.nextUrl.hostname),
    );
  }

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/branding/") ||
    pathname.startsWith("/fonts/") ||
    STATIC_EXT.test(pathname)
  ) {
    return applyHeadersWithNonce(request, NextResponse.next(), {
      render: pathname.startsWith("/api/"),
    });
  }

  if (pathname === "/robots.txt")
    return applyHeadersWithNonce(request, NextResponse.next());

  if (pathname === "/") {
    return applyHeadersWithNonce(request, NextResponse.next(), {
      render: true,
    });
  }

  if (pathname.startsWith("/clinic")) {
    return applyHeadersWithNonce(
      request,
      NextResponse.redirect(new URL("/dashboard", request.url)),
    );
  }

  if (pathname === "/dashboard/doctors")
    return applyHeadersWithNonce(
      request,
      NextResponse.redirect(new URL("/doctors", request.url)),
    );

  if (isPortalPath(pathname)) {
    return applyHeadersWithNonce(request, NextResponse.next(), {
      render: true,
    });
  }

  return applyHeadersWithNonce(
    request,
    NextResponse.redirect(new URL("/dashboard", request.url)),
  );
}

export const config = {
  matcher: [
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
