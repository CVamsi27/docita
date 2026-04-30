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
    description:
      "Send reminders, prescriptions, and follow-ups from the clinic workflow.",
  },
];

export function ProductTourSection({ appUrl }: ProductTourSectionProps) {
  return (
    <section className="landing-section landing-section-muted landing-section-soft" id="tour">
      <div className="ui-page-shell grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,1.15fr)] lg:items-start">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/10 px-4 py-2 text-sm text-info">
            <span className="font-medium">What is already in the product</span>
          </div>
          <SectionHeading
            size="section"
            title="The workflow is the product"
            description="The strongest demo for Docita is concrete: import records, move through OPD, generate a prescription, send a reminder, and collect payment."
            className="mb-6"
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <a href={`${appUrl}/onboarding`}>
                Start setup
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/contact">Book guided demo</a>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {liveHighlights.map((item) => (
            <article
              key={item.title}
              className="landing-card p-5"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  Live
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
