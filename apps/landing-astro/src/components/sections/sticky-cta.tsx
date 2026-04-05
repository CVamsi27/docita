"use client";

import { Button } from "@workspace/ui/components/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

interface StickyCtaProps {
  appUrl: string;
}

export function StickyCta({ appUrl }: StickyCtaProps) {
  const [showStickyCTA, setShowStickyCTA] = useState(false);

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

  if (!showStickyCTA) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-3 px-4 shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div>
          <div className="font-bold text-lg hidden sm:block">
            Start trial today
          </div>
          <div className="text-sm opacity-90 hidden sm:block">
            14-day free trial • No credit card required
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <span className="font-bold sm:hidden">Docita</span>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="gap-2 whitespace-nowrap"
          >
            <a href={`${appUrl}/onboarding`}>
              Start trial
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
