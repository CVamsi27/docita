"use client";

import { ArrowRight, MessageSquare, Shield, Upload } from "lucide-react";
import { SectionHeading } from "@workspace/ui/components/section-heading";

const resources = [
  {
    icon: Upload,
    title: "Paper to Cloud",
    description:
      "A one-page explanation of how Docita moves clinics from paper files and spreadsheets into a live workflow.",
    href: "/paper-to-cloud",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Workflows",
    description:
      "A focused page on reminders, prescriptions, receipts, and follow-up communication for Indian clinics.",
    href: "/whatsapp-workflows",
  },
  {
    icon: Shield,
    title: "Trust and Hosting",
    description:
      "Current backend hosting, data residency, privacy posture, and the trust claims we are comfortable making today.",
    href: "/trust",
  },
];

export function ResourceLinksSection() {
  return (
    <section className="landing-section bg-background">
      <div className="ui-page-shell">
        <SectionHeading
          align="center"
          size="section"
          title="Sales assets built into the site"
          description="Use these pages in founder-led demos, WhatsApp shares, and local outreach without overexplaining the product every time."
          className="mb-12"
          descriptionClassName="mx-auto max-w-2xl"
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {resources.map((resource) => (
            <a
              key={resource.title}
              href={resource.href}
              className="group rounded-lg border border-border/70 bg-muted/30 p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <resource.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {resource.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {resource.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Open page
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
