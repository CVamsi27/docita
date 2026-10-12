"use client";

import { Button } from "@workspace/ui/components/form/button";
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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-md px-3 pt-2 text-foreground shadow-lg sm:px-4 sm:pt-3"
      style={{
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold sm:text-base">
              Get your clinic workflow live.
            </div>
            <div className="truncate text-xs leading-5 text-muted-foreground sm:text-sm">
              <span className="sm:hidden">Start guided setup.</span>
              <span className="hidden sm:inline">
                Start guided setup for appointments, EMR, billing, and follow-ups.
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <Button
            asChild
            variant="default"
            size="sm"
            className="h-9 gap-1.5 whitespace-nowrap px-3 font-semibold shadow-xs sm:h-10 sm:gap-2 sm:px-4"
          >
            <a href={`${appUrl}/onboarding`}>
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Start setup</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
