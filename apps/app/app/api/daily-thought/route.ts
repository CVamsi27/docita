// Powers the rotating thought-of-the-day on the login screen.
// Consumer: apps/app/app/(auth)/login/page.tsx (and similar auth pages).
// Same-origin route so the browser never calls an external API directly.
// Falls back to a static quote when ZenQuotes is unreachable.
// Removing this route will break the auth-page header strip.
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { z } from "zod";
const ZENQUOTES_TODAY = "https://zenquotes.io/api/today";

const zenQuotesTodaySchema = z.array(
  z.object({
    q: z.string(),
    a: z.string(),
  }),
);

const FALLBACK_DAILY_THOUGHT = {
  quote:
    "The best way to find out if you can trust somebody is to trust them.",
  author: "Ernest Hemingway",
} as const;

type DailyThoughtPayload = {
  quote: string;
  author: string;
};

function utcCalendarDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchZenQuotesToday(): Promise<DailyThoughtPayload> {
  const response = await fetch(ZENQUOTES_TODAY, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`ZenQuotes responded with ${response.status}`);
  }

  const raw: unknown = await response.json();
  const parsed = zenQuotesTodaySchema.safeParse(raw);
  const first = parsed.success ? parsed.data[0] : undefined;
  if (!first?.q?.trim() || !first?.a?.trim()) {
    throw new Error("ZenQuotes payload missing quote or author");
  }

  return { quote: first.q.trim(), author: first.a.trim() };
}

const CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=86400";

export async function GET() {
  const dayKey = utcCalendarDayKey();
  const thought = await unstable_cache(
    async (): Promise<DailyThoughtPayload> => {
      try {
        return await fetchZenQuotesToday();
      } catch {
        return { ...FALLBACK_DAILY_THOUGHT };
      }
    },
    ["daily-thought", dayKey],
    { revalidate: 86_400 },
  )();

  return NextResponse.json(thought, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
