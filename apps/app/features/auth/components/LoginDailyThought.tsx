"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { dailyThoughtResponseSchema } from "@workspace/types";
import type { DailyThoughtResponse } from "@workspace/types";
import { browserJson } from "@/lib/auth/browser-request";
import { logger } from "@/lib/monitoring/logger";

export function LoginDailyThought() {
  const [data, setData] = useState<DailyThoughtResponse | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const dayKey = new Date().toISOString().slice(0, 10);
        const body = await browserJson<unknown>(
          `/api/v1/public/daily-thought?day=${dayKey}`,
          { method: "GET" },
        );
        const parsed = dailyThoughtResponseSchema.safeParse(body);
        if (!cancelled && parsed.success) {
          setData(parsed.data);
        }
      } catch (error) {
        logger.error("LoginDailyThought fetch failed", { error });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <section
      className="space-y-3 border-t border-border/60 pt-4"
      aria-labelledby="login-daily-thought-heading"
    >
      <h3
        id="login-daily-thought-heading"
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Thought for today
      </h3>
      {loading ? (
        <div
          className="space-y-2"
          aria-busy="true"
          role="status"
          aria-live="polite"
          aria-label="Loading daily thought"
        >
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-3 w-32" />
        </div>
      ) : data ? (
        <blockquote className="space-y-2 border-l-2 border-primary/40 pl-3">
          <p className="text-sm leading-relaxed text-foreground">
            {data.quote}
          </p>
          <footer className="text-xs text-muted-foreground">
            — {data.author}
          </footer>
        </blockquote>
      ) : null}
    </section>
  );
}
