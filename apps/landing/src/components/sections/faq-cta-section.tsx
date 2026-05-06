"use client";

import { ArrowRight, CalendarCheck } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

interface FaqCtaSectionProps {
  appUrl: string;
}

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "How fast can my clinic actually go live?",
    a: "Discovery call on day zero, first OPD day live within 48 hours, and full rollout (queue + EMR + prescriptions + billing + WhatsApp) inside two weeks for standard clinics. Larger or multi-doctor rollouts plan around your team's calendar, not ours.",
  },
  {
    q: "What about my existing patient list and scans?",
    a: "Bring Excel, CSV, and uploaded scans on day one. We import the patient list, run OCR on prior prescriptions and case sheets, and review duplicates and extracted fields before anything lands in records. No starting from zero.",
  },
  {
    q: "Is patient data safe and India-compliant?",
    a: "Backend services and database are co-located in Mumbai (ap-south-1) for India residency. Encrypted in transit and at rest, role-based access for reception/doctor/admin, audit logs on sensitive actions, consent-aware WhatsApp, and one-click data export. We describe what we operate today rather than claim unsupported certifications.",
  },
  {
    q: "How does pricing work, and what does setup include?",
    a: "Monthly software plans from \u20B9499. Guided setup (patient import, prescription templates, letterhead, signature, WhatsApp templates, billing config, and staff training) is scoped separately and starts from \u20B94,999. Higher tiers add multi-doctor, lab tests, inventory, analytics, and broader rollouts.",
  },
];

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

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div>
            <h2
              id="r2-faq-heading"
              className="max-w-xl r2-display-sm text-foreground"
            >
              Quick answers <em>before</em> you book the call.
            </h2>
            <div className="mt-8">
              {FAQS.map((faq) => (
                <details key={faq.q} className="r2-faq-item">
                  <summary className="r2-faq-summary">
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
            <div className="r2-cta-card">
              <p className="r2-eyebrow">Ready when you are</p>
              <h3
                id="r2-cta-heading"
                className="mt-3 r2-display-sm"
                style={{ color: "inherit" }}
              >
                Get one OPD day on Docita this week.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-background/80 sm:text-base">
                Book a guided setup. We will walk your current workflow,
                import your records, and have the front desk and at least one
                doctor live before week&rsquo;s end.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  variant="primary"
                  className="h-12 rounded-xl px-7 text-base font-semibold"
                >
                  <a href={`${appUrl}/onboarding`}>
                    Start clinic setup
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-12 rounded-xl px-6 text-base font-semibold text-background hover:bg-background/15 hover:text-background"
                >
                  <a href="/contact">
                    <CalendarCheck className="h-5 w-5" />
                    Book guided demo
                  </a>
                </Button>
              </div>

              <dl className="mt-8 grid grid-cols-3 gap-x-3 gap-y-4 border-t border-background/15 pt-6 sm:gap-x-4">
                {[
                  ["48 h", "First workflow"],
                  ["₹499", "Software plan"],
                  ["₹4,999", "Setup from"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="r2-mono text-sm font-semibold">{value}</dt>
                    <dd className="mt-0.5 text-[var(--fs-2xs)] uppercase tracking-[0.14em] text-background/65">
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
