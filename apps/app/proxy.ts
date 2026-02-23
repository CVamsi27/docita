import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "access_token";

const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/patients",
  "/appointments",
  "/consultation",
  "/prescriptions",
  "/invoices",
  "/inventory",
  "/lab-tests",
  "/documents",
  "/analytics",
  "/ai-assistant",
  "/import",
  "/settings",
  "/whatsapp",
  "/hospital",
  "/coding-queue",
  "/profile",
  "/upgrade",
  "/specialty",
  "/patient-portal",
];

const AUTH_PAGES = ["/login"];

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }

  return diff === 0;
}

async function verifyJwtHs256(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: { alg?: string; typ?: string };
  let payload: { exp?: number };

  try {
    header = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedHeader)),
    );
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload)),
    );
  } catch {
    return false;
  }

  if (header.alg !== "HS256") {
    return false;
  }

  if (typeof payload.exp === "number") {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowInSeconds) {
      return false;
    }
  }

  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const expectedSignature = base64UrlDecode(encodedSignature);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const computedSignatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      data,
    );
    const computedSignature = new Uint8Array(computedSignatureBuffer);
    return constantTimeEquals(computedSignature, expectedSignature);
  } catch {
    return false;
  }
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PAGES.some(
    (authPath) => pathname === authPath || pathname.startsWith(`${authPath}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isProtectedRoute = isProtectedPath(pathname);

  if (!isProtectedRoute && !isAuthPath(pathname)) {
    return NextResponse.next();
  }

  let isValidToken = false;

  if (token) {
    const jwtSecret = process.env.JWT_SECRET;

    if (jwtSecret && jwtSecret.length > 0) {
      isValidToken = await verifyJwtHs256(token, jwtSecret);
    } else {
      isValidToken = true;
    }
  }

  if (isProtectedRoute && !isValidToken) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${search}`;
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath(pathname) && isValidToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
