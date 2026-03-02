"use client";

import { Mic, AlertTriangle, Brain, Sparkles } from "lucide-react";
import { Card, CardHeader, CardContent } from "@workspace/ui/components/card";

export function AiAutomationSection() {
  return (
    <section className="px-6 py-24 bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm mb-6 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">
                Powered by Docita Intelligence
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6 bg-linear-to-r from-foreground to-primary bg-clip-text text-transparent">
              Experience the Future of Care
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Let our advanced AI handle the tedious tasks so you can focus
              entirely on your patients.
            </p>

            <div className="space-y-8">
              {}
              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center border border-info/20">
                  <Mic className="h-5 w-5 text-info" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Voice-to-Text Dictation
                  </h3>
                  <p className="text-muted-foreground">
                    Record consultations and let our AI transcribe and format
                    them into structured clinical notes automatically.
                  </p>
                </div>
              </div>

              {}
              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Drug Interaction Safety
                  </h3>
                  <p className="text-muted-foreground">
                    Real-time alerts for potential drug-drug and drug-allergy
                    interactions while you prescribe.
                  </p>
                </div>
              </div>

              {}
              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Clinical Decision Support
                  </h3>
                  <p className="text-muted-foreground">
                    Get smart suggestions for diagnoses and treatment plans
                    based on patient history and symptoms.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="relative">
            <div className="absolute -inset-4 bg-linear-to-r from-primary to-info rounded-2xl opacity-20 blur-xl" />
            <Card className="relative bg-card border-border shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-border bg-card/70">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive/20 border border-destructive/40" />
                  <div className="h-3 w-3 rounded-full bg-warning/20 border border-warning/40" />
                  <div className="h-3 w-3 rounded-full bg-success/20 border border-success/40" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    AI_Assistant.tsx
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {}
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-none p-3 text-sm text-muted-foreground max-w-[85%]">
                    Patient complains of severe headache and nausea for past 2
                    days. History of migraines.
                  </div>
                </div>

                <div className="flex gap-3 flex-row-reverse">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-2xl rounded-tr-none p-3 text-sm text-foreground max-w-[85%]">
                    <p className="mb-2 font-semibold text-primary">
                      Suggested Assessment:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      <li>Acute Migraine without aura (G43.009)</li>
                      <li>Tension-type headache (G44.2)</li>
                    </ul>
                  </div>
                </div>

                <div className="surface-warning rounded-lg p-3 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-warning">
                        Interaction Warning
                      </h4>
                      <p className="text-xs text-warning-foreground mt-1">
                        Potential risk between <strong>Sumatriptan</strong> and{" "}
                        <strong>SSRI</strong> (current med).
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
