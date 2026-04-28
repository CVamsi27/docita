"use client";

import { Button } from "@workspace/ui/components/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StickyCtaProps {
  appUrl: string;
}

export function StickyCta({ appUrl }: StickyCtaProps) {
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 700) {
        setShowStickyCTA(true);
      } else {
        setShowStickyCTA(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const applyBodyOffset = () => {
      if (!showStickyCTA || !ctaRef.current) {
        document.body.style.paddingBottom = "";
        return;
      }

      const ctaHeight = ctaRef.current.getBoundingClientRect().height;
      document.body.style.paddingBottom = `${Math.ceil(ctaHeight) + 12}px`;
    };

    applyBodyOffset();
    window.addEventListener("resize", applyBodyOffset);

    return () => {
      window.removeEventListener("resize", applyBodyOffset);
      document.body.style.paddingBottom = "";
    };
  }, [showStickyCTA]);

  if (!showStickyCTA) return null;

  return (
    <div
      ref={ctaRef}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/95 px-4 py-3 text-foreground shadow-[0_-18px_50px_rgba(15,23,42,0.14)] backdrop-blur supports-[backdrop-filter]:bg-background/85 animate-in slide-in-from-bottom duration-300"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold sm:text-base">
              14-day free trial is back.
            </div>
            <div className="text-xs leading-5 text-muted-foreground sm:text-sm">
              Start Essential at ₹0 today, no credit card required.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <Button
            asChild
            variant="default"
            size="sm"
            className="h-10 w-full gap-2 whitespace-nowrap px-4 sm:w-auto"
          >
            <a href={`${appUrl}/onboarding`}>
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
