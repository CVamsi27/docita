"use client";

import {
  Activity,
  Clock,
  Lock,
  Server,
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

export function TrustSecuritySection() {
  return (
    <section className="px-6 py-24 bg-background" id="security">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm text-foreground">
            <Shield className="h-4 w-4 text-success" />
            <span className="font-medium text-foreground">
              Enterprise-Grade Security
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Your Data is Safe With Us
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We take data security seriously. Your patient information is
            protected by industry-leading security measures.
          </p>
        </div>

        {}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
          {[
            { label: "HIPAA", sublabel: "Compliant" },
            { label: "ISO 27001", sublabel: "Certified" },
            { label: "SOC 2", sublabel: "Type II" },
            { label: "GDPR", sublabel: "Ready" },
            { label: "256-bit", sublabel: "Encryption" },
          ].map((badge, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center w-28 h-28 rounded-xl border-2 border-muted bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <ShieldCheck className="h-8 w-8 text-success mb-2" />
              <span className="font-bold text-sm">{badge.label}</span>
              <span className="text-xs text-muted-foreground">
                {badge.sublabel}
              </span>
            </div>
          ))}
        </div>

        {}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Lock,
              title: "End-to-End Encryption",
              description:
                "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Your patient information is never exposed.",
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
              icon: Server,
              title: "Enterprise Data Centers",
              description:
                "Hosted on AWS/GCP with 99.99% uptime SLA, redundant backups, and disaster recovery.",
            },
            {
              icon: Clock,
              title: "Daily Encrypted Backups",
              description:
                "Automatic daily backups with 30-day retention. Your data is safe even in worst-case scenarios.",
            },
            {
              icon: Users,
              title: "Your Data, Your Control",
              description:
                "Export your data anytime in standard formats. No vendor lock-in, ever.",
            },
          ].map((feature, i) => (
            <Card key={i} className="border-none shadow-sm bg-muted/30">
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
      </div>
    </section>
  );
}
