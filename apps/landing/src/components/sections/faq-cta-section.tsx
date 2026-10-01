"use client";

import { ArrowRight, CalendarCheck } from "lucide-react";

import { Button } from "@workspace/ui/components/form/button";

import { HOMEPAGE_FAQS } from "@/lib/faqs";

interface FaqCtaSectionProps {
  appUrl: string;
}

export function FaqCtaSection({ appUrl }: FaqCtaSectionProps) {
  return (
    <section
      id="faq"
      className="r2-section r2-band-tint"
      aria-labelledby="r2-faq-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Last things, then start</span>
        </div>

        <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div>
            <h2
              id="r2-faq-heading"
              className="max-w-xl r2-display-sm text-foreground"
            >
              Quick answers <em>before</em> you book the call.
            </h2>
            <div className="mt-8">
              {HOMEPAGE_FAQS.map((faq) => (
                <details key={faq.q} className="group r2-faq-item">
                  <summary className="r2-faq-summary group-open:text-primary transition-colors duration-150">
                    <span>{faq.q}</span>
                    <span className="r2-faq-icon" aria-hidden />
                  </summary>
                  <p className="r2-faq-body">{faq.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Still have questions?{" "}
              <a
                href="/contact"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Send a note
              </a>{" "}
              and we will reply within a working day.
            </p>
          </div>

          <aside aria-labelledby="r2-cta-heading" className="lg:sticky lg:top-28 lg:self-start">
            <div className="r2-cta-card shadow-lg">
              <div className="flex items-center gap-2">
                <span className="r2-eyebrow text-primary">Ready when you are</span>
                <span className="rounded-full border border-background/25 bg-background/15 px-2 py-0.5 text-[var(--fs-2xs)] font-medium text-background">
                  48-hour onboarding
                </span>
              </div>
              <h3
                id="r2-cta-heading"
                className="mt-3 r2-display-xs text-background"
                style={{ color: "inherit" }}
              >
                Get your first workflow live on Docita this week.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-background/85 sm:text-base">
                Book a guided setup. We will walk your current workflow,
                import your records, and have the front desk and at least one
                doctor live before week&rsquo;s end.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  variant="primary"
                  className="h-12 rounded-xl px-7 text-base font-semibold shadow-xs"
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
                  className="h-12 rounded-xl border border-background/20 px-6 text-base font-semibold text-background hover:bg-background/15 hover:text-background"
                >
                  <a href="/contact#book-demo">
                    <CalendarCheck className="h-5 w-5" />
                    Book guided demo
                  </a>
                </Button>
              </div>

              <dl className="mt-8 grid grid-cols-3 gap-x-3 gap-y-4 border-t border-background/15 pt-6 sm:gap-x-4">
                {[
                  ["48 h", "First workflow"],
                  ["\u20B9499", "Software plan"],
                  ["\u20B94,999", "Setup from"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border border-background/10 bg-background/5 p-2.5">
                    <dt className="r2-mono text-sm font-semibold">{value}</dt>
                    <dd className="mt-0.5 text-[var(--fs-2xs)] uppercase tracking-[0.14em] text-background/70">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
