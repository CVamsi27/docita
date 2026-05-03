"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  MessageSquare,
  ReceiptText,
  Settings2,
  Stethoscope,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";

const setupDeliverables = [
  {
    icon: FileSpreadsheet,
    title: "Import the current clinic list",
    description:
      "Patient Excel or CSV files are mapped, checked, and moved into the first usable patient workflow.",
  },
  {
    icon: Stethoscope,
    title: "Configure the doctor workflow",
    description:
      "Prescription format, visit notes, common templates, signature, and clinic letterhead are set up for real OPD use.",
  },
  {
    icon: MessageSquare,
    title: "Switch on WhatsApp follow-up",
    description:
      "Prescription sharing, appointment reminders, and follow-up messages are prepared with clinic-approved wording.",
  },
  {
    icon: ReceiptText,
    title: "Connect billing basics",
    description:
      "Invoices, payment links, receipts, and simple collections tracking are ready before the clinic goes live.",
  },
];

const setupOptions = [
  "Starter setup from INR 4,999 for one doctor and one core workflow",
  "Clinic setup from INR 9,999 for import, templates, billing, and WhatsApp",
  "Custom rollout for multi-doctor clinics, branches, or legacy data cleanup",
];

export function ClinicSetupSection() {
  return (
    <section className="landing-section bg-background" id="clinic-setup">
      <div className="ui-page-shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted px-4 py-2 text-sm text-primary">
              <Settings2 className="h-4 w-4" />
              <span className="font-medium">Paid clinic setup service</span>
            </div>
            <SectionHeading
              size="section"
              title="Sell a clinic outcome, not another login"
              description="Docita can be packaged as a hands-on rollout: migrate the clinic list, configure the prescription format, train reception, and make the first workflow useful quickly."
              className="mb-6"
            />
            <ul className="space-y-3 text-sm text-muted-foreground sm:text-base">
              {setupOptions.map((option) => (
                <li key={option} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{option}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="gap-2">
                <a href="/contact">
                  Book clinic setup
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/paper-to-cloud">See rollout playbook</a>
              </Button>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Setup fees are separate from monthly software subscriptions and
              are scoped after reviewing the clinic&apos;s current data and
              workflow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {setupDeliverables.map((item) => (
              <Card key={item.title} className="landing-card bg-muted/30">
                <CardHeader>
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-muted">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
