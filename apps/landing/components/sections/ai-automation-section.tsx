"use client";

import { Mic, AlertTriangle, Brain, Sparkles } from "lucide-react";
import { Card, CardHeader, CardContent } from "@workspace/ui/components/card";

export function AiAutomationSection() {
  return (
    <section className="px-6 py-24 bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-slate-950" />

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2 text-sm mb-6 border border-purple-500/20">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="font-medium text-purple-300">
                Powered by Docita Intelligence
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6 bg-linear-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Experience the Future of Care
            </h2>
            <p className="text-xl text-slate-400 mb-8 leading-relaxed">
              Let our advanced AI handle the tedious tasks so you can focus
              entirely on your patients.
            </p>

            <div className="space-y-8">
              {/* Voice Recorder Feature */}
              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Mic className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Voice-to-Text Dictation
                  </h3>
                  <p className="text-slate-400">
                    Record consultations and let our AI transcribe and format
                    them into structured clinical notes automatically.
                  </p>
                </div>
              </div>

              {/* Drug Interaction Feature */}
              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Drug Interaction Safety
                  </h3>
                  <p className="text-slate-400">
                    Real-time alerts for potential drug-drug and drug-allergy
                    interactions while you prescribe.
                  </p>
                </div>
              </div>

              {/* Smart Suggestions */}
              <div className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                  <Brain className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Clinical Decision Support
                  </h3>
                  <p className="text-slate-400">
                    Get smart suggestions for diagnoses and treatment plans
                    based on patient history and symptoms.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Side */}
          <div className="relative">
            <div className="absolute -inset-4 bg-linear-to-r from-purple-600 to-blue-600 rounded-2xl opacity-20 blur-xl" />
            <Card className="relative bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  <span className="ml-2 text-xs text-slate-500 font-mono">
                    AI_Assistant.tsx
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Chat Bubbles */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <Mic className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="bg-slate-800 rounded-2xl rounded-tl-none p-3 text-sm text-slate-300 max-w-[85%]">
                    Patient complains of severe headache and nausea for past 2
                    days. History of migraines.
                  </div>
                </div>

                <div className="flex gap-3 flex-row-reverse">
                  <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl rounded-tr-none p-3 text-sm text-purple-100 max-w-[85%]">
                    <p className="mb-2 font-semibold text-purple-300">
                      Suggested Assessment:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      <li>Acute Migraine without aura (G43.009)</li>
                      <li>Tension-type headache (G44.2)</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-400">
                        Interaction Warning
                      </h4>
                      <p className="text-xs text-amber-200/80 mt-1">
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
