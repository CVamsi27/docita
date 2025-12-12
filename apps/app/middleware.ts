import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const token =
    request.cookies.get("docita_token")?.value ||
    request.headers.get("Authorization")?.split(" ")[1];

  // Check for token in localStorage via client-side check is not possible in middleware
  // So we rely on cookies or we have to accept that middleware might not catch everything
  // if we only use localStorage.
  // However, for a "prod ready" app, we should use cookies.
  // Since the current auth implementation uses localStorage, middleware can't access it directly.
  // We will skip strict middleware checks for now and rely on client-side auth protection
  // OR we can try to check for a cookie if we decide to migrate to cookies.

  // BUT, the user asked for "prompt for login if login doesnt exist".
  // The best way in Next.js App Router with localStorage is a client-side wrapper.
  // But let's see if we can add a basic check for public paths.

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");
  const isPublicPath =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/static") ||
    request.nextUrl.pathname === "/favicon.ico";

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Since we are using localStorage in AuthContext, we can't verify in middleware easily without cookies.
  // We will rely on the AuthContext to redirect.
  // However, to make it "prod ready", we SHOULD use cookies.
  // For this task, I will implement a client-side check in a Layout wrapper or verify if AuthContext already does it.
  // AuthContext has `router.push('/login')` in logout, but not on initial load failure?
  // Let's check AuthContext again.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
