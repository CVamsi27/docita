"use client";

import {
  Activity,
  Database,
  Lock,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function TrustSecuritySection() {
  return (
    <section className="landing-section bg-background" id="security">
      <div className="ui-page-shell">
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm text-foreground">
            <Shield className="h-4 w-4 text-success" />
            <span className="font-medium text-foreground">
              Practical trust controls
            </span>
          </div>
          <SectionHeading
            align="center"
            size="section"
            title="Trust built for Indian healthcare operations"
            description="We focus on controls and infrastructure details we can stand behind today: India-hosted backend systems, role-based access, audit trails, consent-aware workflows, and exportable records."
            descriptionClassName="mx-auto max-w-2xl"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
          {[
            { label: "India-hosted", sublabel: "Mumbai region" },
            { label: "DPDP-aware", sublabel: "Consent controls" },
            { label: "Role access", sublabel: "Staff permissions" },
            { label: "Audit logs", sublabel: "Traceable actions" },
            { label: "256-bit", sublabel: "Encryption" },
          ].map((badge, i) => (
            <div
              key={i}
              className="landing-card flex h-28 w-28 flex-col items-center justify-center border-2 bg-muted/30 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <ShieldCheck className="h-8 w-8 text-success mb-2" />
              <span className="font-bold text-sm">{badge.label}</span>
              <span className="text-xs text-muted-foreground">
                {badge.sublabel}
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Lock,
              title: "Encrypted transport and storage",
              description:
                "Sensitive records are protected in transit and at rest with modern encryption controls.",
            },
            {
              icon: Shield,
              title: "Role-Based Access Control",
              description:
                "Define who can see what. Doctors, receptionists, and admins each have appropriate access levels.",
            },
            {
              icon: Activity,
              title: "Complete Audit Trail",
              description:
                "Every action is logged. Know who accessed what data and when for full accountability.",
            },
            {
              icon: Database,
              title: "India-hosted backend systems",
              description:
                "Current production backend services and database infrastructure are co-located in Mumbai for Indian data residency.",
            },
            {
              icon: Users,
              title: "Consent-aware communication",
              description:
                "WhatsApp and patient communication settings are designed to work with explicit patient consent flows.",
            },
            {
              icon: ShieldCheck,
              title: "Your data stays portable",
              description:
                "Export your data anytime in standard formats. No vendor lock-in, ever.",
            },
          ].map((feature, i) => (
            <Card key={i} className="landing-card bg-muted/30">
              <CardHeader>
                <div className="mb-2 inline-block rounded-lg bg-success/10 p-2 w-fit">
                  <feature.icon className="h-5 w-5 text-success" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="max-w-2xl text-sm text-muted-foreground">
            We do not use unsupported certification badges as a shortcut for
            trust. See the current deployment and privacy posture in one place.
          </p>
          <Button asChild variant="outline">
            <a href="/trust">View trust details</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
