import { type NextRequest, NextResponse } from "next/server";
import { isPortalPath } from "@/lib/internal-portal-routes";
import { applyInternalSecurityHeaders } from "./shared/lib/security/security-headers";

const STATIC_EXT =
  /\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff2?|ttf|txt|xml|json|webmanifest)$/i;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/branding/") ||
    pathname.startsWith("/fonts/") ||
    STATIC_EXT.test(pathname)
  ) {
    return applyInternalSecurityHeaders(NextResponse.next());
  }

  if (pathname === "/robots.txt") {
    return applyInternalSecurityHeaders(NextResponse.next());
  }

  if (pathname === "/") {
    return applyInternalSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/clinic")) {
    return applyInternalSecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.url)),
    );
  }

  if (pathname === "/dashboard/doctors") {
    return applyInternalSecurityHeaders(
      NextResponse.redirect(new URL("/doctors", request.url)),
    );
  }

  if (isPortalPath(pathname)) {
    return applyInternalSecurityHeaders(NextResponse.next());
  }

  return applyInternalSecurityHeaders(
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

