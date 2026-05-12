import { type NextRequest, NextResponse } from "next/server";

const STATIC_EXT =
  /\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff2?|ttf|txt|xml|json|webmanifest)$/i;

/** Routes served by the Internal Console (see `app/(protected)`). */
const PORTAL_ROUTE_PREFIXES = [
  "/dashboard",
  "/users",
  "/admins",
  "/payment-processing",
  "/billing",
  "/pricing",
  "/analytics",
  "/system-monitoring",
  "/feedback",
  "/support",
  "/broadcasts",
  "/logs",
  "/audits",
  "/performance",
  "/doctors",
] as const;

function isPortalPath(pathname: string): boolean {
  return PORTAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/branding/") ||
    pathname.startsWith("/fonts/") ||
    STATIC_EXT.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/robots.txt") {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/clinic")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/dashboard/doctors") {
    return NextResponse.redirect(new URL("/doctors", request.url));
  }

  if (isPortalPath(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
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
