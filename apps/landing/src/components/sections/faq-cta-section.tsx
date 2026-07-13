"use client";

import { ArrowRight, CalendarCheck } from "lucide-react";

import { Button } from "@workspace/ui/components/form/button";

interface FaqCtaSectionProps {
  appUrl: string;
}

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "How fast can my facility actually go live?",
    a: "Discovery call on day zero, first workflow live within 48 hours, and full rollout (queue + EMR + prescriptions + billing + WhatsApp) inside two weeks for standard practices. Larger or multi-doctor hospital rollouts plan around your team's calendar, not ours.",
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
  {
    q: "Do my reception staff need training, and is the UI in English?",
    a: "Reception and clinical workflows are in English today. The interface is built for non-technical staff: large primary actions, consistent left-to-right reading order, and inline help where it matters. We provide a 60-minute live training during setup and recorded walkthroughs you can replay during shifts.",
  },
  {
    q: "Can I keep using my existing WhatsApp Business number?",
    a: "Yes. We connect to your WhatsApp Business API credentials in Settings; the clinic becomes the sender, not a personal number. Templates, consent posture, and delivery health live in the same workspace. Sender credentials are admin-only.",
  },
  {
    q: "What happens if the internet goes down mid-consultation?",
    a: "The active consult keeps your last-saved draft and queues writes locally. The console surfaces a soft banner so the doctor knows what is queued, and the queue drains as soon as the connection returns. Critical actions are designed to fail safely, not silently.",
  },
  {
    q: "Can I export my data if I ever want to leave?",
    a: "Yes. Patients, prescriptions, invoices, and audit logs export to CSV. PDFs and structured FHIR-like bundles are available for prescriptions. There is no lock-in: data export is one of the trust controls we list publicly.",
  },
  {
    q: "Is there a free trial or demo I can show my partners?",
    a: "There is no time-limited free trial; instead, we offer guided setup so you evaluate with a real workflow, not a sandbox. Book a 30-minute walkthrough and we will show your actual flow on Docita with sample data tailored to your specialty.",
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
                Get your first workflow live on Docita this week.
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
                    Start setup
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
                  ["\u20B9499", "Software plan"],
                  ["\u20B94,999", "Setup from"],
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
