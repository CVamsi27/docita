"use client";

import {
  ArrowRight,
  Calendar,
  ClipboardList,
  FileText,
  MessageSquare,
  Receipt,
  Users,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { SectionHeading } from "@workspace/ui/components/layout/section-heading";
import { cn } from "@workspace/ui/lib/utils";

import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface SignatureCapabilitiesSectionProps {
  appUrl: string;
}

type CellLink =
  | { kind: "app"; path: string }
  | { kind: "site"; path: string };

const cells: Array<{
  id: string;
  title: string;
  description: string;
  icon: typeof ClipboardList;
  link: CellLink;
  spanClass: string;
}> = [
  {
    id: "queue",
    title: "OPD queue and tokens",
    description:
      "Check-ins, walk-ins, and live status so reception and doctors share one queue.",
    icon: ClipboardList,
    link: { kind: "app", path: "/onboarding" },
    spanClass:
      "md:col-span-2 lg:col-span-7 lg:row-span-2 min-h-[220px] lg:min-h-[300px]",
  },
  {
    id: "emr",
    title: "Patient timeline (EMR)",
    description:
      "Visits, vitals, documents, and prescriptions in one place for the next consultation.",
    icon: Users,
    link: { kind: "app", path: "/onboarding" },
    spanClass: "md:col-span-1 lg:col-span-5 lg:col-start-8 lg:row-start-1",
  },
  {
    id: "appointments",
    title: "Appointments + walk-ins",
    description:
      "One schedule for booked slots and same-day visits without a side spreadsheet.",
    icon: Calendar,
    link: { kind: "app", path: "/onboarding" },
    spanClass: "md:col-span-1 lg:col-span-5 lg:col-start-8 lg:row-start-2",
  },
  {
    id: "prescriptions",
    title: "Digital prescriptions",
    description:
      "Clear PDFs patients can save or you can send after the visit.",
    icon: FileText,
    link: { kind: "app", path: "/onboarding" },
    spanClass: "md:col-span-1 lg:col-span-4",
  },
  {
    id: "billing",
    title: "Billing and collections",
    description:
      "Invoices and receipts tied to the visit so nothing gets lost between rooms.",
    icon: Receipt,
    link: { kind: "app", path: "/onboarding" },
    spanClass: "md:col-span-1 lg:col-span-4",
  },
  {
    id: "whatsapp",
    title: "WhatsApp follow-ups",
    description:
      "Reminders and documents from the same workflow—see the playbook.",
    icon: MessageSquare,
    link: { kind: "site", path: "/whatsapp-workflows" },
    spanClass: "md:col-span-2 lg:col-span-4",
  },
];

function resolveHref(link: CellLink, appUrl: string): string {
  if (link.kind === "app") {
    return `${appUrl}${link.path}`;
  }
  return link.path;
}

export function SignatureCapabilitiesSection({
  appUrl,
}: SignatureCapabilitiesSectionProps) {
  const reduce = useReducedMotion();
  const cellVariant = landingFadeUpVariants(reduce ?? false);
  const gridContainer = landingStaggerContainer(reduce ?? false, 0.06, 0.05);

  return (
    <section
      id="features"
      className="landing-features-shell landing-section landing-band-muted landing-section-divider-wave-top relative scroll-mt-24 overflow-hidden"
    >
      <div className="ui-page-shell relative z-10">
        <SectionHeading
          align="center"
          size="section"
          eyebrow="Product surface"
          title="Built around how Indian clinics actually run"
          description="Queue, records, prescriptions, billing, and WhatsApp—composed into one product surface instead of ten tabs."
          className="mb-12"
          descriptionClassName="mx-auto max-w-2xl"
        />

        <motion.div
          className="landing-bento-grid"
          variants={gridContainer}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {cells.map((cell) => {
            const Icon = cell.icon;
            const href = resolveHref(cell.link, appUrl);
            return (
              <motion.a
                key={cell.id}
                href={href}
                variants={cellVariant}
                className={cn(
                  "landing-bento-cell group",
                  `landing-bento-cell--${cell.id}`,
                  cell.spanClass,
                )}
              >
                <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card text-primary shadow-md ring-1 ring-primary/10">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <ArrowRight
                      className="mt-1.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-auto min-w-0 pt-5">
                    <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
                      {cell.title}
                    </h3>
                    <p className="mt-2 ui-helper-text text-pretty text-muted-foreground">
                      {cell.description}
                    </p>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
