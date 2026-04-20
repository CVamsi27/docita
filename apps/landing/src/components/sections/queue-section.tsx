"use client";

import { CheckCircle2, Clock, Users } from "lucide-react";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function QueueSection() {
  return (
    <section className="px-6 py-24 bg-background relative overflow-hidden">
      <div className="ui-page-shell">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="rounded-2xl bg-linear-to-br from-warning/20 to-warning/10 p-8 backdrop-blur-sm border border-warning/30">
              <div className="bg-background rounded-xl p-6 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-warning" />
                    <span className="font-semibold">Live Queue Status</span>
                  </div>
                  <span
                    className="rounded-full border border-success bg-success px-2 py-1 text-xs font-medium animate-pulse"
                    style={{ color: "#000000" }}
                  >
                    Live
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-center text-foreground">
                    <div className="mb-1 text-xs uppercase tracking-wider text-foreground/80">
                      Current Token
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                      A-012
                    </div>
                    <div className="mt-1 text-xs text-foreground/80">
                      In Consultation
                    </div>
                  </div>
                  <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-center text-foreground">
                    <div className="mb-1 text-xs uppercase tracking-wider text-foreground/80">
                      Next Token
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                      A-013
                    </div>
                    <div className="mt-1 text-xs text-foreground/80">
                      Est. Wait: 10m
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Waiting List
                  </div>
                  {[
                    {
                      token: "A-013",
                      name: "Sarah Johnson",
                      status: "Next",
                      time: "10:30 AM",
                    },
                    {
                      token: "A-014",
                      name: "Michael Chen",
                      status: "Waiting",
                      time: "10:45 AM",
                    },
                    {
                      token: "A-015",
                      name: "Emma Davis",
                      status: "Waiting",
                      time: "11:00 AM",
                    },
                  ].map((patient, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-sm bg-background px-2 py-1 rounded border">
                          {patient.token}
                        </span>
                        <span className="text-sm">{patient.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {patient.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-foreground">
              <Users className="h-4 w-4 text-foreground" />
              <span className="font-medium text-foreground">
                Smart Queue Management
              </span>
            </div>
            <SectionHeading
              size="section"
              title="Reduce Wait Times & Chaos"
              description="Manage patient flow efficiently with our real-time token system. Handle walk-ins and scheduled appointments seamlessly while keeping patients informed."
              className="mb-6"
            />
            <ul className="space-y-4">
              {[
                {
                  title: "Real-time Tracking",
                  desc: "Live dashboard for reception and doctors",
                },
                {
                  title: "Smart Estimates",
                  desc: "AI-calculated wait times based on history",
                },
                {
                  title: "TV Display Mode",
                  desc: "Dedicated view for waiting room screens",
                },
                {
                  title: "Walk-in Support",
                  desc: "Seamlessly integrate walk-ins with appointments",
                },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="rounded-full icon-warning p-1.5 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <span className="font-medium">{item.title}</span>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
