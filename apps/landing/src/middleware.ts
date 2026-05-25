import type { APIContext, MiddlewareNext } from "astro";
import { applyLandingSecurityHeaders } from "@/lib/security-headers";

const YEAR_IN_SECONDS = 31536000;
const HOUR_IN_SECONDS = 3600;
const FIVE_MINUTES_IN_SECONDS = 300;

function setCachingHeaders(
  response: Response,
  cacheControl: string,
  expiresAt: Date,
): void {
  response.headers.set("Cache-Control", cacheControl);
  response.headers.set("Expires", expiresAt.toUTCString());
}

function isStaticAssetPath(pathname: string): boolean {
  return /\.(?:avif|bmp|css|gif|ico|jpeg|jpg|js|json|mjs|png|svg|txt|webp|woff|woff2|xml)$/i.test(
    pathname,
  );
}

export async function onRequest(
  context: APIContext,
  next: MiddlewareNext,
): Promise<Response> {
  const response = await next();
  applyLandingSecurityHeaders(response);

  const pathname = new URL(context.request.url).pathname;

  if (response.headers.has("Cache-Control")) {
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return response;
  }

  const now = Date.now();
  if (isStaticAssetPath(pathname)) {
    setCachingHeaders(
      response,
      `public, max-age=${YEAR_IN_SECONDS}, immutable`,
      new Date(now + YEAR_IN_SECONDS * 1000),
    );
    return response;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    setCachingHeaders(
      response,
      `public, max-age=${FIVE_MINUTES_IN_SECONDS}, s-maxage=${HOUR_IN_SECONDS}, stale-while-revalidate=86400`,
      new Date(now + FIVE_MINUTES_IN_SECONDS * 1000),
    );
    return response;
  }

  setCachingHeaders(
    response,
    `public, max-age=${HOUR_IN_SECONDS}`,
    new Date(now + HOUR_IN_SECONDS * 1000),
  );
  return response;
}
