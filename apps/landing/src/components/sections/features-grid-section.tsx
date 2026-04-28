"use client";

import {
  Bell,
  Building2,
  Calendar,
  FlaskConical,
  Keyboard,
  MessageSquare,
  Package,
  Receipt,
  ShieldCheck,
  Star,
  Upload,
  Users,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function FeaturesGridSection() {
  return (
    <section className="landing-section bg-muted/50" id="features">
      <div className="ui-page-shell">
        <SectionHeading
          align="center"
          size="section"
          title="Everything a small clinic needs—nothing you don’t"
          description="OPD to billing to follow-ups, with records that stay clean and searchable."
          className="mb-16"
          descriptionClassName="mx-auto max-w-2xl"
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Calendar,
              title: "Appointments + Walk-ins",
              desc: "One view for scheduled visits and walk-ins, so reception can keep the day moving.",
              color: "text-info",
              bg: "badge-info",
            },
            {
              icon: Users,
              title: "Patient Records (EMR)",
              desc: "History, vitals, documents, and prescriptions in one timeline—ready for the next visit.",
              color: "text-primary",
              bg: "tier-pro",
            },
            {
              icon: Receipt,
              title: "Billing + Receipts",
              desc: "Generate invoices and receipts from the same visit workflow and track collections.",
              color: "text-success",
              bg: "badge-success",
            },
            {
              icon: MessageSquare,
              title: "WhatsApp Follow-ups",
              desc: "Share prescriptions and visit instructions, and send reminders without switching tools.",
              color: "text-success",
              bg: "tier-plus",
            },
            {
              icon: Upload,
              title: "Easy Data Migration",
              desc: "Import from Excel/CSV and attach scanned documents so you don’t lose old context.",
              color: "text-warning",
              bg: "badge-warning",
            },
            {
              icon: ShieldCheck,
              title: "Enterprise Security",
              desc: "Role-based access and secure data handling designed for sensitive clinic workflows.",
              color: "text-destructive",
              bg: "badge-danger",
            },
            {
              icon: FlaskConical,
              title: "Lab Management",
              desc: "Order tests and keep results attached to the patient timeline for quick review.",
              color: "text-info",
              bg: "tier-core",
            },
            {
              icon: Package,
              title: "Pharmacy Inventory",
              desc: "Track stock and get low-inventory alerts so dispensing stays smooth.",
              color: "text-warning",
              bg: "tier-enterprise",
            },
            {
              icon: Star,
              title: "Patient Feedback",
              desc: "Collect feedback to improve experience and reduce repeat support calls.",
              color: "text-warning",
              bg: "badge-warning",
            },
            {
              icon: Building2,
              title: "Multi-doctor Clinics",
              desc: "Support multiple doctors and staff roles with clear responsibilities and access.",
              color: "text-primary",
              bg: "tier-pro",
            },
            {
              icon: Bell,
              title: "Reminders",
              desc: "Send reminders for follow-ups and next steps so patients come back on time.",
              color: "text-primary",
              bg: "tier-intelligence",
            },
            {
              icon: Keyboard,
              title: "Keyboard Shortcuts",
              desc: "Fast navigation for doctors and staff who want to move quickly between visits.",
              color: "text-muted-foreground",
              bg: "badge-muted",
            },
          ].map((feature, i) => (
            <Card
              key={i}
              className="bg-background hover:-translate-y-1 hover:shadow-md transition-all"
            >
              <CardHeader>
                <div
                  className={`mb-4 inline-block rounded-lg p-3 w-fit ${feature.bg}`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
