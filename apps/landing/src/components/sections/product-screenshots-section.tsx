"use client";

import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, ClipboardList, FileText, Receipt, Stethoscope } from "lucide-react";

import { landingFadeUpVariants, landingInViewViewport, landingStaggerContainer } from "@/lib/motion-prefs";

interface ProductShot {
  id: string;
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof CalendarDays;
}

const PRODUCT_SHOTS: ProductShot[] = [
  {
    id: "today",
    src: "/product/today.png",
    alt: "Today workspace with OPD queue, in-room patient, and right-rail advisor cards.",
    eyebrow: "Today",
    title: "Your day, one screen.",
    description:
      "Today's queue, in-room patient, waiting count, and advisor cards in a single view. Doctor's morning landing page.",
    icon: ClipboardList,
  },
  {
    id: "consultation",
    src: "/product/consultation.png",
    alt: "Consultation workspace with patient context, SOAP notes, and quick actions.",
    eyebrow: "Consultation",
    title: "Patient context stays open.",
    description:
      "Timeline, vitals, last prescription, and the active complaint stay on the same screen as the notes you are writing.",
    icon: Stethoscope,
  },
  {
    id: "prescription",
    src: "/product/prescription.png",
    alt: "Prescription builder with templates, dose rules, and PDF preview.",
    eyebrow: "Prescription",
    title: "Prescriptions in two clicks.",
    description:
      "Templates fill the form, dose rules catch errors, the PDF is shareable on WhatsApp. No Word, no Photoshop, no print queue.",
    icon: FileText,
  },
  {
    id: "appointments",
    src: "/product/appointments.png",
    alt: "Appointments calendar with slots, status pills, and reschedule controls.",
    eyebrow: "Appointments",
    title: "Slots, status, follow-ups.",
    description:
      "Day, week, and list views. Each slot shows arrival, in-room, completed, and follow-up status. Reschedule in a click.",
    icon: CalendarDays,
  },
  {
    id: "invoices",
    src: "/product/invoices.png",
    alt: "Invoices dashboard with line items, payments, and receipt delivery.",
    eyebrow: "Invoices",
    title: "Billing tied to the visit.",
    description:
      "Line items inherit the consultation, invoice picks up the procedures, receipt is UPI-ready and sent on WhatsApp.",
    icon: Receipt,
  },
];

export function ProductScreenshotsSection() {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);
  const stagger = landingStaggerContainer(reduce ?? false, 0.08, 0.04);

  return (
    <section
      id="product-screenshots"
      className="r2-section r2-band-card"
      aria-labelledby="r2-product-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Inside the product</span>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-end lg:gap-12">
          <h2
            id="r2-product-heading"
            className="max-w-3xl r2-display-sm text-foreground"
          >
            The screens your <em>team will actually use</em>.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Real product captures, not mock-ups. Each one is a click or two
            away from a live workflow.
          </p>
        </div>

        <motion.div
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {PRODUCT_SHOTS.map((shot) => {
            const Icon = shot.icon;
            return (
              <motion.figure
                key={shot.id}
                variants={item}
                className="r2-product-shot group"
              >
                <div className="r2-product-shot-frame">
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-shot-chrome-label">
                    DOCITA &middot; {shot.eyebrow.toUpperCase()}
                  </span>
                </div>
                <div className="r2-product-shot-image-wrap">
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    loading="lazy"
                    decoding="async"
                    className="r2-product-shot-image"
                    width={1920}
                    height={1080}
                  />
                </div>
                <figcaption className="r2-product-shot-caption">
                  <p className="r2-eyebrow r2-eyebrow-accent flex items-center gap-1.5">
                    <Icon className="h-3 w-3" aria-hidden />
                    {shot.eyebrow}
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold tracking-tight text-foreground">
                    {shot.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {shot.description}
                  </p>
                </figcaption>
              </motion.figure>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
