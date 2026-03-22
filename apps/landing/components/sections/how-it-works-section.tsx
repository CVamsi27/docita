"use client";

import { ClipboardList, Pill, Receipt, Stethoscope } from "lucide-react";

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Streamlined Clinical Workflow
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From patient check-in to final billing, Docita optimizes every step
            of your practice.
          </p>
        </div>

        <div className="relative">
          {}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden lg:block" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative z-10">
            {[
              {
                step: "01",
                title: "Check-in & Queue",
                desc: "Patient arrives, gets a token, and enters the smart queue system.",
                icon: ClipboardList,
              },
              {
                step: "02",
                title: "Consultation",
                desc: "Doctor reviews history, records vitals, and adds clinical notes.",
                icon: Stethoscope,
              },
              {
                step: "03",
                title: "Prescription",
                desc: "Digital prescription generated instantly with AI assistance.",
                icon: Pill,
              },
              {
                step: "04",
                title: "Billing & Leave",
                desc: "Automated invoice generation and payment collection.",
                icon: Receipt,
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-muted group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="absolute top-4 right-4 text-4xl font-bold text-muted/20 select-none">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
