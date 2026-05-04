"use client";

import { useEffect, useRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

const TURNSTILE_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

interface TurnstileWidgetProps {
  siteKey: string | undefined;
  onToken: (token: string) => void;
  onExpire: () => void;
  className?: string;
}

export function TurnstileWidget({
  siteKey,
  onToken,
  onExpire,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": onExpire,
      });
    };

    const existing = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT}"]`,
    ) as HTMLScriptElement | null;

    if (window.turnstile) {
      renderWidget();
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile?.remove) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }

    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener("load", renderWidget, { once: true });

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderWidget);
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, onToken, onExpire]);

  if (!siteKey) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("min-h-[65px]", className)}
    />
  );
}
