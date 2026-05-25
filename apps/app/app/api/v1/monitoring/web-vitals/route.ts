import { NextResponse } from "next/server";
import { WebVitalSchema } from "@workspace/types";

const UPSTREAM_TIMEOUT_MS = 1500;

function resolveUpstreamWebVitalsUrl(): string | null {
  const apiUrl = process.env["API_URL"] || process.env["NEXT_PUBLIC_API_URL"];

  if (!apiUrl || apiUrl.startsWith("/")) {
    return null;
  }

  return `${apiUrl.replace(/\/$/, "")}/monitoring/web-vitals`;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const parsed = WebVitalSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const upstreamUrl = resolveUpstreamWebVitalsUrl();
  if (!upstreamUrl) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  try {
    await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // Web-vitals telemetry must never break the clinician app.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
