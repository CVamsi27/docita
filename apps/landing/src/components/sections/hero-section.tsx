"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  MessageSquare,
  Receipt,
  Stethoscope,
} from "lucide-react";

import { Button } from "@workspace/ui/components/form/button";

import {
  landingFadeUpVariants,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface HeroSectionProps {
  appUrl: string;
}

const STATES = ["waiting", "consult", "checkout"] as const;
type ProductState = (typeof STATES)[number];

const STATE_DURATION_MS = 5200;

export function HeroSection({ appUrl }: HeroSectionProps) {
  const reduce = useReducedMotion();
  const [state, setState] = useState<ProductState>("waiting");
  const [paused, setPaused] = useState(false);
  const stateIndexRef = useRef(0);

  useEffect(() => {
    if (reduce === true || paused) {
      return;
    }
    const id = window.setInterval(() => {
      stateIndexRef.current = (stateIndexRef.current + 1) % STATES.length;
      setState(STATES[stateIndexRef.current]);
    }, STATE_DURATION_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const item = landingFadeUpVariants(reduce ?? false);
  const container = landingStaggerContainer(reduce ?? false, 0.07, 0.04);

  return (
    <section className="r2-hero" aria-labelledby="r2-hero-heading">
      <div className="ui-page-shell r2-hero-shell px-4 sm:px-6 lg:px-0">
        <motion.div
          className="r2-grid-12 items-center"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <div className="col-span-12 mt-0 sm:mt-4 lg:col-span-7 lg:mt-0 lg:pr-6 xl:col-span-6">
            <motion.div variants={item}>
              <span className="r2-eyebrow r2-eyebrow-accent">
                Clinics & Hospitals
              </span>
            </motion.div>

            <motion.h1
              id="r2-hero-heading"
              variants={item}
              className="mt-6 r2-display text-foreground"
            >
              <span className="block">
                One <em>rhythm</em> for your whole practice.
              </span>{" "}
              <span className="mt-2 block r2-display-sm text-muted-foreground">
                Queue, chart, bill, follow up&mdash;for any practice size.
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              A single operating layer for reception and clinicians: tokens,
              records, prescriptions, invoices, and WhatsApp&mdash;built for
              solo practices and multi-branch hospitals alike.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
            >
              <Button
                asChild
                size="lg"
                variant="primary"
                className="h-12 rounded-xl px-7 text-base font-semibold shadow-md"
              >
                <a href={`${appUrl}/onboarding`}>
                  Start setup
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-xl px-6 text-base font-semibold"
              >
                <a href="/contact">
                  <CalendarCheck className="h-5 w-5" />
                  Book guided demo
                </a>
              </Button>
            </motion.div>

            <motion.dl
              variants={item}
              className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-border/60 border-t border-border/60 pt-6"
            >
              {[
                ["48 h", "First workflow live"],
                ["Mumbai", "India residency"],
                ["DPDP", "Consent-aware"],
              ].map(([value, label], i) => (
                <div key={label} className={i === 0 ? "pr-4" : "px-4"}>
                  <dt className="r2-mono text-base font-semibold text-foreground">
                    {value}
                  </dt>
                  <dd className="mt-1 text-[var(--fs-2xs)] uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div
            variants={item}
            className="col-span-12 lg:col-span-5 xl:col-span-6"
          >
            <HeroProductCard
              state={state}
              onHoverStart={() => setPaused(true)}
              onHoverEnd={() => setPaused(false)}
              onSelect={(next) => {
                stateIndexRef.current = STATES.indexOf(next);
                setState(next);
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

interface HeroProductCardProps {
  state: ProductState;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect: (state: ProductState) => void;
}

function HeroProductCard({
  state,
  onHoverStart,
  onHoverEnd,
  onSelect,
}: HeroProductCardProps) {
  return (
    <div
      className="r2-product"
      data-state={state}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocusCapture={onHoverStart}
      onBlurCapture={onHoverEnd}
      role="region"                  aria-label="Live practice operations preview"
    >
      <div className="r2-product-chrome">
        <span className="r2-product-chrome-dot" aria-hidden />
        <span className="r2-product-chrome-dot" aria-hidden />
        <span className="r2-product-chrome-dot" aria-hidden />
        <span className="ml-2">CITY MEDICAL CENTER · MON 10:42</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-success"
            aria-hidden
          />
          <span>Live</span>
        </span>
      </div>
      <div className="r2-product-stage">
        <WaitingFrame />
        <ConsultFrame />
        <CheckoutFrame />
      </div>

      <div
        className="r2-product-rail"
        role="tablist"
        aria-label="Preview state"
      >
        {STATES.map((s, i) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={state === s}
            aria-label={`Show ${s} preview`}
            onClick={() => onSelect(s)}
            className="group flex flex-1 items-center gap-2 focus:outline-none"
          >
            <span className="r2-product-rail-dot" />
            <span className="sr-only">{`Step ${i + 1}: ${s}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WaitingFrame() {
  return (
    <div className="r2-product-frame" data-frame="waiting">
      <div className="flex items-center justify-between">
        <div>
          <p className="r2-eyebrow">OPD queue</p>
          <p className="text-sm font-semibold text-foreground">
            18 patients · avg wait 12 m
          </p>
        </div>
        <span className="r2-status-pill r2-status-pill--in">
          <ClipboardList className="h-3 w-3" /> Live
        </span>
      </div>

      {[
        { token: "07", name: "R. Iyer", status: "in", note: "Dr. Mehta" },
        { token: "08", name: "K. Patel", status: "waiting", note: "Walk-in" },
        { token: "09", name: "P. Rao", status: "waiting", note: "Follow-up" },
        { token: "10", name: "S. Khan", status: "waiting", note: "New" },
      ].map((row, i) => (
        <div
          key={row.token}
          className={i === 0 ? "r2-row r2-row-active" : "r2-row"}
        >
          <span className="r2-token">{row.token}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {row.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{row.note}</p>
          </div>
          <span
            className={
              row.status === "in"
                ? "r2-status-pill r2-status-pill--in"
                : "r2-status-pill r2-status-pill--waiting"
            }
          >
            {row.status === "in" ? "In room" : "Waiting"}
          </span>
        </div>
      ))}
    </div>
  );
}

function ConsultFrame() {
  return (
    <div className="r2-product-frame" data-frame="consult">
      <div className="flex items-center justify-between">
        <div>
          <p className="r2-eyebrow">Consult · Token 07</p>
          <p className="text-sm font-semibold text-foreground">R. Iyer · 42 · F · Follow-up</p>
        </div>
        <span className="r2-status-pill r2-status-pill--in">
          <Stethoscope className="h-3 w-3" /> In room
        </span>
      </div>
      <div className="r2-row">
        <div className="min-w-0 flex-1">
          <p className="r2-eyebrow">Last visit · 12 Apr</p>
          <p className="mt-1 text-sm text-foreground">
            HbA1c 7.2 · BP 138/86 · Metformin 500mg BD
          </p>
        </div>
      </div>
      <div className="r2-row">
        <FileText className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Prescription draft
          </p>
          <p className="text-xs text-muted-foreground">
            Metformin 500mg · 1-0-1 · 30 days
          </p>
        </div>
        <span className="r2-status-pill r2-status-pill--waiting">
          Review
        </span>
      </div>
      <div className="r2-row">
        <FileText className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Telmisartan 40mg · 1-0-0 · 30 days
          </p>
          <p className="text-xs text-muted-foreground">
            Tied to today&rsquo;s visit
          </p>
        </div>
        <span className="r2-status-pill r2-status-pill--done">Added</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-border/60 bg-muted px-3 py-2 text-xs">
          <p className="r2-eyebrow">Lab</p>
          <p className="mt-0.5 text-foreground">HbA1c · 6 weeks</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted px-3 py-2 text-xs">
          <p className="r2-eyebrow">Next visit</p>
          <p className="mt-0.5 text-foreground">28 May · 11:30</p>
        </div>
      </div>
    </div>
  );
}

function CheckoutFrame() {
  return (
    <div className="r2-product-frame" data-frame="checkout">
      <div className="flex items-center justify-between">
        <div>
          <p className="r2-eyebrow">Invoice · Token 07</p>
          <p className="text-sm font-semibold text-foreground">
            R. Iyer · paid via UPI
          </p>
        </div>
        <span className="r2-status-pill r2-status-pill--done">
          <CheckCircle2 className="h-3 w-3" /> Closed
        </span>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-3">
        <div className="space-y-2 text-sm">
          {[
            ["Consultation", "₹500"],
            ["Procedure · INJ", "₹250"],
            ["Discount", "−₹50"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between text-muted-foreground"
            >
              <span>{label}</span>
              <span className="r2-money text-foreground">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
          <span className="r2-eyebrow">Total</span>
          <span className="r2-money text-base text-foreground">₹700</span>
        </div>
      </div>

      <div className="r2-row r2-row-active">
        <Receipt className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Receipt sent on WhatsApp
          </p>
          <p className="text-xs text-muted-foreground">
            +91 98••• ••432 · just now
          </p>
        </div>
        <MessageSquare className="h-4 w-4 text-success" />
      </div>

      <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-xs leading-relaxed text-foreground">
        <p className="r2-eyebrow text-success">Follow-up scheduled</p>
        <p className="mt-1">
          HbA1c reminder &middot; 6 weeks &middot; opt-in confirmed.
        </p>
      </div>
    </div>
  );
}
