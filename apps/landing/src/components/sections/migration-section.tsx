"use client";

import {
  ArrowRight,
  Clock3,
  FileSearch,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { SectionHeading } from "@workspace/ui/components/section-heading";

const rolloutPoints = [
  {
    icon: FileSpreadsheet,
    title: "Bring your current data",
    description:
      "Start with Excel, CSV, and uploaded documents instead of asking the clinic to rebuild records from zero.",
  },
  {
    icon: FileSearch,
    title: "Review before import",
    description:
      "Map columns, inspect duplicates, and check extracted OCR fields before they land in patient records.",
  },
  {
    icon: Users,
    title: "Roll out by role",
    description:
      "Train reception, doctors, and admins around their day-to-day jobs rather than one generic onboarding flow.",
  },
];

export function MigrationSection() {
  return (
    <section className="landing-section bg-background" id="migration">
      <div className="ui-page-shell grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Clock3 className="h-4 w-4" />
            <span className="font-medium">Rollout target: first value in 48 hours</span>
          </div>
          <SectionHeading
            size="section"
            title="A migration story small clinics can say yes to"
            description="Docita is leading with migration and usability, not with asking clinics to change everything overnight. The first job is getting existing records and everyday operations into one calmer workflow."
            className="mb-6"
          />
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            For standard spreadsheet-based rollouts, the goal is simple: review
            the data quickly, get the first workflow live fast, and let the team
            learn on real clinic work instead of a long implementation project.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <a href="/paper-to-cloud">
                See the rollout playbook
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/contact">Talk about migration</a>
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {rolloutPoints.map((point) => (
            <article
              key={point.title}
              className="landing-card p-6"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <point.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {point.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
