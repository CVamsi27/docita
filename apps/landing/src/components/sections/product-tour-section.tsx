"use client";

import {
  ArrowRight,
  FileText,
  MessageSquare,
  ReceiptText,
  Rows4,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { SectionHeading } from "@workspace/ui/components/section-heading";

interface ProductTourSectionProps {
  appUrl: string;
}

const liveHighlights = [
  {
    icon: Rows4,
    title: "Queue and patient workflow",
    description: "Check-in, appointments, and patient history in one surface.",
  },
  {
    icon: FileText,
    title: "Digital prescriptions and documents",
    description: "Generate, archive, and share patient-facing records clearly.",
  },
  {
    icon: ReceiptText,
    title: "Billing and collections",
    description: "Move from consultation to invoice without switching tools.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp communication",
    description: "Send reminders, prescriptions, and follow-ups from the clinic workflow.",
  },
];

export function ProductTourSection({ appUrl }: ProductTourSectionProps) {
  return (
    <section className="px-6 py-24 bg-muted/30" id="tour">
      <div className="ui-page-shell grid gap-12 lg:grid-cols-[minmax(320px,1fr)_minmax(0,0.95fr)] lg:items-center">
        <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-background p-3 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)]">
          <img
            src="/demo-thumbnail.png"
            alt="Docita application tour preview"
            className="w-full rounded-[1.35rem] border border-border/60 object-cover"
            loading="lazy"
          />
        </div>

        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/10 px-4 py-2 text-sm text-info">
            <span className="font-medium">What is already in the product</span>
          </div>
          <SectionHeading
            size="section"
            title="Show the workflow, not just a promise"
            description="The strongest demo for Docita is concrete: import records, move through OPD, generate a prescription, send a reminder, and collect payment."
            className="mb-6"
          />

          <div className="grid gap-4">
            {liveHighlights.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-border/70 bg-background/70 p-5"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                    Live today
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <a href={`${appUrl}/onboarding`}>
                Start trial
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/contact">Book the 90-second demo</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
