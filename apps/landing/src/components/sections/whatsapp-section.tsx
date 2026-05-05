"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageSquare,
  Stethoscope,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function WhatsappSection() {
  return (
    <section className="landing-section landing-section-soft relative overflow-hidden bg-success/10">
      <div className="ui-page-shell relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full badge-success px-4 py-2 text-sm mb-4">
              <MessageSquare className="h-4 w-4 text-success" />
              <span className="font-medium text-success">
                WhatsApp Integration
              </span>
            </div>
            <SectionHeading
              size="section"
              title="Run patient communication where Indian clinics already operate"
              description="Share prescriptions, appointment reminders, receipts, and follow-up instructions in one familiar channel instead of chasing calls and paper slips."
              className="mb-6"
            />
            <ul className="space-y-4">
              {[
                "Instant prescription delivery via WhatsApp",
                "Automated appointment reminders",
                "Follow-up care instructions",
                "Payment receipts and invoices",
                "Consent-aware patient communication settings",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="gap-2">
                <a href="/whatsapp-workflows">
                  See WhatsApp workflows
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="bg-card">
                <a href="/contact">Book a WhatsApp demo</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Patient consent and message configuration remain under clinic
              control.
            </p>
          </div>
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-[280px] aspect-[1/2] rounded-[2.5rem] sm:rounded-[3rem] border-8 border-card bg-card shadow-lg overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-card rounded-b-xl z-20" />
              <div className="flex h-full w-full flex-col overflow-hidden bg-muted">
                <div className="bg-primary p-4 pt-12 text-primary-foreground flex items-center gap-3 shadow-md z-10">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                    <Stethoscope className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Docita</div>
                    <div className="text-[var(--fs-2xs)] text-primary-foreground/95">
                      Business Account
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-4 overflow-hidden">
                  <div className="bg-background p-3 rounded-[var(--radius)] rounded-tl-none shadow-sm max-w-[85%] text-xs border border-border/60">
                    <p>
                      Hello Ananya, your appointment is confirmed for tomorrow at
                      10:00 AM.
                    </p>
                    <div className="text-[var(--fs-2xs)] text-muted-foreground text-right mt-1">
                      09:30 AM
                    </div>
                  </div>
                  <div className="bg-success/15 p-3 rounded-[var(--radius)] rounded-tr-none shadow-sm max-w-[85%] ml-auto text-xs border border-success/20">
                    <p>Thank you doctor! I&apos;ll be there</p>
                    <div className="mt-1 text-[var(--fs-2xs)] text-foreground/80 text-right">
                      09:32 AM
                    </div>
                  </div>
                  <div className="bg-background p-2 rounded-[var(--radius)] rounded-tl-none shadow-sm max-w-[85%] text-xs border border-border/60">
                    <div className="flex items-center gap-3 bg-muted p-2 rounded-[var(--radius)] mb-2">
                      <FileText className="h-8 w-8 text-destructive" />
                      <div>
                        <div className="font-medium">Prescription.pdf</div>
                        <div className="text-[var(--fs-2xs)] text-foreground/80">
                          1 page • 120 KB
                        </div>
                      </div>
                    </div>
                    <p>
                      Here is your digital prescription from today&apos;s visit.
                    </p>
                    <div className="text-[var(--fs-2xs)] text-muted-foreground text-right mt-1">
                      10:45 AM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
