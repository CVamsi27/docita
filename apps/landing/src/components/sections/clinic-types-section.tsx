"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  BedDouble,
  Hospital,
  type LucideIcon,
  Sparkles,
  Stethoscope,
  Users,
  UsersRound,
} from "lucide-react";

import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface ClinicType {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  surfaces: string[];
}

const CLINIC_TYPES: ClinicType[] = [
  {
    id: "solo",
    icon: Stethoscope,
    title: "Solo practitioner",
    description:
      "A single doctor with a small front desk. Appointments, EMR, prescriptions, and WhatsApp in one workspace.",
    surfaces: [
      "Today + queue",
      "Prescriptions + PDF",
      "Patient portal",
      "Invoices + UPI",
    ],
  },
  {
    id: "multi-doctor",
    icon: Users,
    title: "Multi-doctor clinic",
    description:
      "Several doctors, shared reception, daybook, and per-doctor analytics. Each doctor keeps their own patient list.",
    surfaces: [
      "Multi-doctor schedule",
      "Per-doctor daybook",
      "Broadcast campaigns",
      "Coding queue",
    ],
  },
  {
    id: "specialty",
    icon: Sparkles,
    title: "Specialty practice",
    description:
      "Dental charts, vision, IPD beds, vaccine schedules, and other specialty workflows baked into the consult.",
    surfaces: [
      "Dental charts",
      "Vaccine schedules",
      "Specialty forms",
      "Procedure notes",
    ],
  },
  {
    id: "front-desk",
    icon: UsersRound,
    title: "Front-desk-only",
    description:
      "Reception-only mode for setups that handle scheduling and billing but not the clinical workspace. Plan-switchable later.",
    surfaces: [
      "Queue + tokens",
      "Appointments + calendar",
      "Invoices + receipts",
      "WhatsApp inbox",
    ],
  },
  {
    id: "hospital",
    icon: Hospital,
    title: "Multi-branch hospital",
    description:
      "Pooled WhatsApp, multi-OPD routing, shift handover, multi-location analytics, and a dedicated success manager.",
    surfaces: [
      "IPD bed management",
      "Multi-location queue",
      "Shift handover",
      "Audit + RBAC",
    ],
  },
  {
    id: "dialysis",
    icon: BedDouble,
    title: "Dialysis & day-care",
    description:
      "Recurring slot patterns, machine scheduling, vitals trend capture, and patient follow-up reminders.",
    surfaces: [
      "Recurring slots",
      "Vitals trends",
      "Follow-up reminders",
      "Insurance claims",
    ],
  },
];

export function ClinicTypesSection() {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);
  const stagger = landingStaggerContainer(reduce ?? false, 0.06, 0.04);

  return (
    <section
      id="clinic-types"
      className="r2-section r2-band-tint"
      aria-labelledby="r2-types-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Who it is for</span>
        </div>

        <h2
          id="r2-types-heading"
          className="mt-4 max-w-3xl r2-display-sm text-foreground"
        >
          One platform, <em>many practice shapes</em>.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Solo OPDs and multi-branch hospitals run on the same backbone. Each
          picks the surfaces they need on day one&mdash;the rest is there when
          you grow into it.
        </p>

        <motion.div
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {CLINIC_TYPES.map((ct) => {
            const Icon = ct.icon;
            return (
              <motion.article
                key={ct.id}
                variants={item}
                className="r2-type-card"
              >
                <div className="r2-type-card-head">
                  <span
                    className="r2-type-card-icon"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {ct.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {ct.description}
                </p>
                <ul className="r2-type-card-list" role="list">
                  {ct.surfaces.map((s) => (
                    <li key={s} className="r2-type-card-chip">
                      <span className="h-1 w-1 rounded-full bg-primary" aria-hidden />
                      <span className="truncate">{s}</span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
