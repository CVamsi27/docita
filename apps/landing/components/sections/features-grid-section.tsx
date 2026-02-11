"use client";

import {
  Calendar,
  Users,
  Receipt,
  MessageSquare,
  Upload,
  ShieldCheck,
  FlaskConical,
  Package,
  Star,
  Building2,
  Bell,
  Keyboard,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";

export function FeaturesGridSection() {
  return (
    <section className="px-6 py-24 bg-muted/50" id="features">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run a modern clinic
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete operating system for your medical practice, packed with
            powerful features.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Calendar,
              title: "Smart Scheduling",
              desc: "Drag-and-drop calendar with automated reminders to reduce no-shows.",
              color: "text-blue-600",
              bg: "bg-blue-100 dark:bg-blue-900/30",
            },
            {
              icon: Users,
              title: "Patient Records (EMR)",
              desc: "Comprehensive history, vitals, allergies, and digital prescriptions in one timeline.",
              color: "text-indigo-600",
              bg: "bg-indigo-100 dark:bg-indigo-900/30",
            },
            {
              icon: Receipt,
              title: "Billing & Invoicing",
              desc: "Generate professional invoices, track payments, and manage insurance claims.",
              color: "text-green-600",
              bg: "bg-green-100 dark:bg-green-900/30",
            },
            {
              icon: MessageSquare,
              title: "Patient Communication",
              desc: "Integrated WhatsApp messaging for prescriptions, reminders, and follow-ups.",
              color: "text-teal-600",
              bg: "bg-teal-100 dark:bg-teal-900/30",
            },
            {
              icon: Upload,
              title: "Easy Data Migration",
              desc: "Import your existing patient data from Excel or paper records in minutes.",
              color: "text-orange-600",
              bg: "bg-orange-100 dark:bg-orange-900/30",
            },
            {
              icon: ShieldCheck,
              title: "Enterprise Security",
              desc: "Role-based access control and encrypted data storage to keep patient info safe.",
              color: "text-red-600",
              bg: "bg-red-100 dark:bg-red-900/30",
            },
            {
              icon: FlaskConical,
              title: "Lab Management",
              desc: "Order tests, track samples, and manage results with integrated lab workflows.",
              color: "text-cyan-600",
              bg: "bg-cyan-100 dark:bg-cyan-900/30",
            },
            {
              icon: Package,
              title: "Pharmacy Inventory",
              desc: "Track medicine stock, manage suppliers, and get low-inventory alerts.",
              color: "text-amber-600",
              bg: "bg-amber-100 dark:bg-amber-900/30",
            },
            {
              icon: Star,
              title: "Patient Feedback",
              desc: "Collect and analyze patient feedback to improve your clinic's service quality.",
              color: "text-yellow-600",
              bg: "bg-yellow-100 dark:bg-yellow-900/30",
            },
            {
              icon: Building2,
              title: "Multi-Clinic Support",
              desc: "Manage multiple branches and doctors from a single admin dashboard.",
              color: "text-purple-600",
              bg: "bg-purple-100 dark:bg-purple-900/30",
            },
            {
              icon: Bell,
              title: "Smart Reminders",
              desc: "Automated SMS and email reminders to keep patients on track with their care.",
              color: "text-pink-600",
              bg: "bg-pink-100 dark:bg-pink-900/30",
            },
            {
              icon: Keyboard,
              title: "Keyboard Shortcuts",
              desc: "Power-user shortcuts to navigate and manage your clinic at lightning speed.",
              color: "text-slate-600",
              bg: "bg-slate-100 dark:bg-slate-800",
            },
          ].map((feature, i) => (
            <Card
              key={i}
              className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-background"
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
