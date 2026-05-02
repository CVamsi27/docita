"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { logger } from "@/lib/logger";

type DailyThoughtPayload = {
  quote: string;
  author: string;
};

export function LoginDailyThought() {
  const [data, setData] = useState<DailyThoughtPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/daily-thought", {
          method: "GET",
          cache: "force-cache",
        });
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        const body: unknown = await response.json();
        if (
          !cancelled &&
          body &&
          typeof body === "object" &&
          "quote" in body &&
          "author" in body &&
          typeof (body as DailyThoughtPayload).quote === "string" &&
          typeof (body as DailyThoughtPayload).author === "string"
        ) {
          setData({
            quote: (body as DailyThoughtPayload).quote,
            author: (body as DailyThoughtPayload).author,
          });
        }
      } catch (error) {
        logger.error("LoginDailyThought fetch failed", { error });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
          <p className="text-sm leading-relaxed text-foreground">{data.quote}</p>
          <footer className="text-xs text-muted-foreground">— {data.author}</footer>
        </blockquote>
      ) : null}
    </section>
  );
}
