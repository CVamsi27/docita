"use client";

import {
  Activity,
  BedDouble,
  Boxes,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileInput,
  Files,
  FlaskConical,
  type LucideIcon,
  MessageCircle,
  Pill,
  Receipt,
  ScanText,
  ShieldCheck,
  SmilePlus,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface SurfaceItem {
  label: string;
  icon: LucideIcon;
}

interface SurfaceColumn {
  role: string;
  title: string;
  description: string;
  items: SurfaceItem[];
}

const COLUMNS: SurfaceColumn[] = [
  {
    role: "Reception",
    title: "Front desk has one screen",
    description:
      "Walk-ins, appointments, intake forms, and the live queue stay in one place — no parallel register.",
    items: [
      { label: "OPD queue & tokens", icon: ClipboardList },
      { label: "Today board", icon: CalendarClock },
      { label: "Appointments", icon: CalendarDays },
      { label: "Patient list", icon: Users },
      { label: "Documents", icon: Files },
      { label: "WhatsApp inbox", icon: MessageCircle },
    ],
  },
  {
    role: "Doctor",
    title: "Consult with everything in reach",
    description:
      "Patient timeline, prescription templates, lab orders, and AI assist surfaces are wired into the consult — including specialty workflows.",
    items: [
      { label: "Consultation room", icon: Stethoscope },
      { label: "Prescriptions & PDF", icon: Pill },
      { label: "Lab tests & results", icon: FlaskConical },
      { label: "Dental charts", icon: SmilePlus },
      { label: "OCR & mobile upload", icon: ScanText },
      { label: "AI prescription assist", icon: Sparkles },
    ],
  },
  {
    role: "Admin",
    title: "Run the clinic, not a tab graveyard",
    description:
      "Multi-doctor, multi-location, billing, inventory, analytics, audit, and IPD beds — without leaving Docita.",
    items: [
      { label: "Invoices & payments", icon: Receipt },
      { label: "Inventory", icon: Boxes },
      { label: "Analytics", icon: TrendingUp },
      { label: "IPD bed management", icon: BedDouble },
      { label: "Audit & roles", icon: ShieldCheck },
      { label: "Imports (Excel · OCR)", icon: FileInput },
    ],
  },
];

const PORTAL_FEATURES = [
  "Appointments",
  "Prescriptions",
  "Bills & receipts",
  "Visit history",
  "Medications",
  "Consent forms",
];

export function SurfaceMapSection() {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);
  const stagger = landingStaggerContainer(reduce ?? false, 0.08, 0.04);

  return (
    <section
      id="surface-map"
      className="r2-section r2-band-base"
      aria-labelledby="r2-surface-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3 r2-section-marker">
          <span aria-hidden>R2 / 04</span>
          <span aria-hidden className="h-px w-10 bg-current opacity-40" />
          <span className="r2-eyebrow">Built for the whole clinic</span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-end lg:gap-12">
          <h2
            id="r2-surface-heading"
            className="max-w-3xl r2-display-sm text-foreground"
          >
            Reception, doctor, admin&mdash;
            <em>and your patients</em>&mdash;all on the same layer.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Most clinic stacks ship one role and bolt on the rest. Docita is
            built role-first, with deep surfaces for each side of the desk.
          </p>
        </div>

        <motion.div
          className="mt-10 r2-surface-grid"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {COLUMNS.map((col) => (
            <motion.article
              key={col.role}
              variants={item}
              className="r2-surface-col"
            >
              <p className="r2-eyebrow r2-eyebrow-accent">{col.role}</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                {col.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {col.description}
              </p>
              <ul className="r2-surface-list" role="list">
                {col.items.map((surface) => (
                  <li key={surface.label} className="r2-surface-chip">
                    <surface.icon className="r2-surface-chip-icon" aria-hidden />
                    <span className="truncate">{surface.label}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          variants={item}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex items-start gap-4">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary"
              aria-hidden
            >
              <Activity className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="r2-eyebrow r2-eyebrow-accent">
                And the fourth role: your patients
              </p>
              <p className="mt-1 text-sm font-medium text-foreground sm:text-base">
                Patients log into Docita too &mdash; appointments, prescriptions,
                bills, history, and consent in one place.
              </p>
            </div>
          </div>
          <ul
            className="flex flex-wrap items-center gap-1.5 sm:justify-end"
            role="list"
          >
            {PORTAL_FEATURES.map((f) => (
              <li
                key={f}
                className="r2-mono rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-foreground"
              >
                {f}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
