"use client";

import {
  ArrowRight,
  Brain,
  Mic,
  ScanText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function AiAutomationSection() {
  const roadmapItems = [
    {
      icon: ScanText,
      title: "OCR extraction and review",
      description:
        "Live now on supported plans for digitizing prescriptions, case sheets, and uploaded documents with human review.",
      status: "Live now",
      statusTone: "badge-success",
    },
    {
      icon: Brain,
      title: "Prescription drafting and interaction checks",
      description:
        "Planned as a reviewable assistant flow, focused on medication suggestions and safety checks before final sign-off.",
      status: "Planned",
      statusTone: "badge-warning",
    },
    {
      icon: Mic,
      title: "Voice dictation to structured notes",
      description:
        "Planned for clinics that want faster documentation without turning diagnosis support into the headline promise.",
      status: "Planned",
      statusTone: "badge-warning",
    },
    {
      icon: ShieldAlert,
      title: "Operational AI with guardrails",
      description:
        "Docita is avoiding broad diagnosis-led claims and keeping AI limited to workflows teams can review and trust.",
      status: "Policy",
      statusTone: "badge-info",
    },
  ];

  return (
    <section className="landing-section bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-muted/20" />

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">AI, rolled out carefully</span>
            </div>
            <SectionHeading
              size="section"
              title="Keep AI narrow, reviewable, and useful"
              description="Docita is treating AI as workflow support, not as a substitute for clinical judgment. The current focus is OCR digitization and carefully-scoped assistance that teams can verify before use."
              className="mb-8"
              descriptionClassName="text-xl leading-relaxed"
            />

            <div className="space-y-5">
              {roadmapItems.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-full border border-border/70 bg-background/70 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <span
                        className={`${item.statusTone} rounded-full px-2.5 py-1 text-xs font-semibold`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Button asChild variant="outline" className="gap-2 bg-background/60">
                <a href="/trust">
                  See trust and rollout details
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-xl border border-border/60 bg-muted/20" />
            <Card className="relative bg-card border-border shadow-lg overflow-hidden">
              <CardHeader className="border-b border-border bg-card/70">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive/20 border border-destructive/40" />
                  <div className="h-3 w-3 rounded-full bg-warning/20 border border-warning/40" />
                  <div className="h-3 w-3 rounded-full bg-success/20 border border-success/40" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    AI rollout snapshot
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Live now
                      </p>
                      <p className="text-sm text-muted-foreground">
                        OCR-assisted document digitization with review before
                        save.
                      </p>
                    </div>
                    <span className="badge-success rounded-full px-2.5 py-1 text-xs font-semibold">
                      Shipping
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Next
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Prescription drafting, interaction review, and
                        documentation help with clinician sign-off.
                      </p>
                    </div>
                    <span className="badge-warning rounded-full px-2.5 py-1 text-xs font-semibold">
                      Planned
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-info/20 bg-info/5 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Not the headline promise
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Docita is not leading with broad diagnosis claims. The
                    product strategy stays centered on migration, workflow
                    reliability, and trust.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
