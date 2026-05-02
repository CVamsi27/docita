"use client";

import { ArrowRight, MessageSquare, Shield, Upload } from "lucide-react";
import { SectionHeading } from "@workspace/ui/components/section-heading";

const resources = [
  {
    icon: Upload,
    title: "Paper to Cloud",
    description:
      "How clinics move from registers and Excel into a live workflow.",
    href: "/paper-to-cloud",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Workflows",
    description:
      "Reminders, prescriptions, and follow-ups without leaving Docita.",
    href: "/whatsapp-workflows",
  },
  {
    icon: Shield,
    title: "Trust and Hosting",
    description:
      "Hosting, residency posture, and what we publish for compliance reviews.",
    href: "/trust",
  },
];

export function ResourceLinksSection() {
  return (
    <section className="landing-section scroll-mt-24 bg-background">
      <div className="ui-page-shell">
        <SectionHeading
          align="center"
          size="section"
          eyebrow="Guides"
          title="Deep dives you can share"
          description="Short standalone pages for demos, WhatsApp forwards, and procurement questions."
          className="mb-10"
          descriptionClassName="mx-auto max-w-xl"
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {resources.map((resource) => (
            <a
              key={resource.title}
              href={resource.href}
              className="landing-resource-link group"
            >
              <div className="relative z-[1]">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 shadow-sm">
                  <resource.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  {resource.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {resource.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Open page
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
