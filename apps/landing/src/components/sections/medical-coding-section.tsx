"use client";

import { Activity, CheckCircle2, Code2 } from "lucide-react";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function MedicalCodingSection() {
  return (
    <section className="landing-section landing-section-muted relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      <div className="ui-page-shell relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-4 py-2 text-sm text-foreground">
              <Code2 className="h-4 w-4 text-info" />
              <span className="font-medium text-foreground">
                ICD-10 Compliant
              </span>
            </div>
            <SectionHeading
              size="section"
              title="Standardized Medical Coding"
              description="Document diagnoses and procedures with internationally recognized ICD-10 and CPT codes. Improve billing accuracy, insurance claims processing, and clinical documentation quality."
              className="mb-6"
            />
            <ul className="space-y-4 mb-8">
              {[
                {
                  title: "ICD-10 Diagnosis Codes",
                  desc: "Search and assign standardized diagnosis codes for accurate documentation",
                },
                {
                  title: "CPT Procedure Codes",
                  desc: "Track procedures with proper coding for billing and insurance claims",
                },
                {
                  title: "Coding Queue",
                  desc: "Review and finalize codes before submission with built-in workflow",
                },
                {
                  title: "Insurance Ready",
                  desc: "Generate properly coded claims for faster insurance reimbursement",
                },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="rounded-full badge-info p-1.5 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <span className="font-medium">{item.title}</span>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground border-l-2 border-info/50 pl-4">
              Available from{" "}
              <span className="font-semibold text-foreground">Core tier</span>{" "}
              and above. AI-assisted coding suggestions available with{" "}
              <span className="font-semibold text-foreground">
                Docita Intelligence
              </span>{" "}
              add-on.
            </p>
          </div>
          <div className="relative">
            <div className="landing-card border-info/20 bg-linear-to-br from-info/20 to-info/10 p-8">
              <div className="rounded-xl bg-background p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <Activity className="h-5 w-5 text-info" />
                  <span className="font-semibold">Medical Coding</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Diagnosis
                      </div>
                      <div className="font-mono text-sm font-medium">J06.9</div>
                    </div>
                    <div className="text-sm text-right">
                      <div className="font-medium">
                        Upper respiratory infection
                      </div>
                      <div className="text-xs text-muted-foreground">Acute</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Diagnosis
                      </div>
                      <div className="font-mono text-sm font-medium">R50.9</div>
                    </div>
                    <div className="text-sm text-right">
                      <div className="font-medium">Fever, unspecified</div>
                      <div className="text-xs text-muted-foreground">
                        Primary
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-info/30 bg-info/10 p-3 text-foreground">
                    <div>
                      <div className="text-xs text-foreground/80">
                        Procedure
                      </div>
                      <div className="font-mono text-sm font-medium">99213</div>
                    </div>
                    <div className="text-sm text-right">
                      <div className="font-medium">
                        Office visit - Established
                      </div>
                      <div className="text-xs text-foreground/80">Level 3</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 rounded-full border border-info/30 bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg">
              ICD-10 & CPT
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
