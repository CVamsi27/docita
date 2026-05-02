"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowRight,
  CalendarCheck,
  Sparkles,
} from "lucide-react";

import { HeroWorkflowVisual } from "@/components/sections/hero-workflow-visual";
import {
  landingBrutalFrameVariants,
  landingFadeUpVariants,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface HeroSectionProps {
  appUrl: string;
}

export function HeroSection({ appUrl }: HeroSectionProps) {
  const reduce = useReducedMotion();
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    if (reduce === true) {
      return;
    }
    const id = requestAnimationFrame(() => {
      setMotionReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  const runHeroMotion = motionReady && reduce !== true;
  const item = landingFadeUpVariants(reduce ?? false);
  const container = landingStaggerContainer(reduce ?? false, 0.07, 0.04);
  const frameVariants = landingBrutalFrameVariants(reduce ?? false);
  const h1LineStagger =
    reduce === true
      ? {
          hidden: {},
          visible: { transition: { staggerChildren: 0, delayChildren: 0 } },
        }
      : {
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.055, delayChildren: 0 },
          },
        };

  return (
    <section className="landing-hero-origin landing-section-hero landing-hero-editorial relative overflow-hidden">
      <div className="landing-hero-mesh" aria-hidden />
      <div className="landing-hero-vignette" aria-hidden />

      <div className="ui-page-shell relative z-10">
        <motion.div
          key={runHeroMotion ? "hero-motion" : "hero-static"}
          className={cn(
            "mx-auto flex max-w-6xl flex-col gap-y-8 sm:gap-y-10",
            "lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-center lg:gap-x-12 lg:gap-y-6 xl:gap-x-16",
          )}
          variants={container}
          initial={runHeroMotion ? "hidden" : false}
          animate={runHeroMotion ? "visible" : false}
        >
          <motion.p
            variants={item}
            className="landing-hero-kicker max-w-fit self-center text-center font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-[11px] lg:col-start-1 lg:row-start-1 lg:self-start lg:text-left"
          >
            India · private clinics · OPD-first
          </motion.p>

          <motion.h1
            variants={h1LineStagger}
            className={cn(
              "max-w-[18ch] text-balance text-foreground lg:max-w-[22ch]",
              "landing-hero-display [font-family:var(--font-display),var(--font-inter),system-ui]",
              "text-center lg:col-start-1 lg:row-start-2 lg:text-left",
            )}
          >
            <motion.span variants={item} className="landing-hero-display-line1 block">
              One rhythm for your whole OPD floor.
            </motion.span>{" "}
            <motion.span
              variants={item}
              className="landing-hero-display-line2 mt-3 block max-w-[28ch] lg:mt-4"
            >
              Queue, chart, bill, follow up—without the shuffle.
            </motion.span>
          </motion.h1>

          <motion.p
            variants={item}
            className="landing-hero-lede mx-auto max-w-xl text-pretty text-center text-muted-foreground lg:col-start-1 lg:row-start-3 lg:mx-0 lg:text-left"
          >
            A single operating layer for reception and clinicians: tokens,
            records, prescriptions, invoices, and WhatsApp—tight enough to feel
            obvious, deep enough for real clinic days.
          </motion.p>

          <motion.div
            variants={item}
            className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:col-start-1 lg:row-start-4 lg:justify-start"
          >
              <Button
                asChild
                size="lg"
                variant="primary"
                className="landing-hero-cta-primary h-12 w-full rounded-xl px-8 text-base font-semibold sm:w-auto"
              >
                <a href={`${appUrl}/onboarding`}>
                  Start clinic setup
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="landing-hero-cta-secondary h-12 w-full rounded-xl border-2 border-foreground/15 bg-background/70 px-8 text-base font-semibold backdrop-blur-sm sm:w-auto"
              >
                <a href="/contact">
                  <CalendarCheck className="h-5 w-5" />
                  Book guided demo
                </a>
              </Button>
          </motion.div>

          <motion.div
            variants={item}
            className={cn(
              "landing-command-bar-editorial mx-auto flex w-full max-w-xl items-center gap-3 lg:col-start-1 lg:row-start-5 lg:mx-0 lg:max-w-none lg:self-stretch",
            )}
          >
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 text-left font-mono text-xs font-medium uppercase tracking-wide text-foreground sm:text-sm">
              Ask what needs attention today
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-foreground/10 bg-foreground text-background shadow-sm">
              <ArrowRight className="h-4 w-4" />
            </span>
          </motion.div>

          <motion.div
            variants={frameVariants}
            className="relative mx-auto w-full max-w-lg lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:mx-0 lg:max-w-none"
          >
            <div className="landing-hero-brutal-frame relative">
              <div className="landing-hero-brutal-inner overflow-hidden rounded-[calc(var(--radius)+6px)] border-2 border-foreground/10 bg-card/90 p-4 shadow-inner sm:p-5">
                <HeroWorkflowVisual className="h-auto w-full" />
              </div>
            </div>

            <ul className="landing-hero-stat-strip mt-6 grid grid-cols-3 gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
              {[
                ["18", "today"],
                ["₹24k", "outstand."],
                ["6", "scripts"],
              ].map(([v, l]) => (
                <li
                  key={l}
                  className="rounded-lg border border-border/60 bg-muted/25 px-2 py-2.5 text-center sm:px-3"
                >
                  <span className="block text-lg font-bold tabular-nums tracking-tight text-foreground sm:text-xl">
                    {v}
                  </span>
                  {l}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
