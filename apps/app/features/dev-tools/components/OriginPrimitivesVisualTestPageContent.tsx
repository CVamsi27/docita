"use client";

import { useState } from "react";
import { CalendarClock, FlaskConical, Pill, Stethoscope } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import {
  PageTabs,
  type PageTabItem,
} from "@workspace/ui/components/navigation/page-tabs";
import { ProgressGauge } from "@workspace/ui/components/feedback/progress-gauge";
import { PromptInput } from "@workspace/ui/components/form/prompt-input";
import {
  RightRailCard,
  RightRailCardStack,
} from "@workspace/ui/components/data-display/right-rail-card";
import { WizardDialog } from "@workspace/ui/components/overlay/wizard-dialog";

const TABS: PageTabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "reports", label: "Reports" },
];

const WIZARD_STEPS = [
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
  { id: "confirm", label: "Confirm" },
];

export default function OriginPrimitivesVisualTestPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<string>("details");

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Origin primitives"
          description="Reference compositions for the Origin-inspired UI/UX standard."
        />
      }
    >
      <div className="space-y-10">
        <section data-testid="micro-label-and-tabs" className="space-y-4">
          <MicroLabel as="h2">Micro label + page tabs</MicroLabel>
          <PageTabs items={TABS} activeId={activeTab} onSelect={setActiveTab} />
        </section>

        <section data-testid="category-avatars" className="space-y-4">
          <MicroLabel as="h2">Category avatars</MicroLabel>
          <div className="flex flex-wrap items-center gap-4">
            <CategoryAvatar
              icon={<CalendarClock />}
              tone="info"
              ariaLabel="Today"
            />
            <CategoryAvatar
              icon={<Stethoscope />}
              tone="success"
              ariaLabel="Consultation"
            />
            <CategoryAvatar
              icon={<Pill />}
              tone="warning"
              ariaLabel="Prescription"
            />
            <CategoryAvatar
              icon={<FlaskConical />}
              tone="primary"
              ariaLabel="Lab"
            />
          </div>
        </section>

        <section data-testid="progress-gauge" className="space-y-4">
          <MicroLabel as="h2">Progress gauge</MicroLabel>
          <Card>
            <CardHeader>
              <CardTitle>Inventory utilization</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <ProgressGauge
                value={0.62}
                ariaValueText="62 percent of inventory budget used"
                label={
                  <div>
                    <p className="text-2xl font-semibold">62%</p>
                    <p className="text-xs text-muted-foreground">used</p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </section>

        <section data-testid="right-rail" className="space-y-4">
          <MicroLabel as="h2">Right-rail advisor cards</MicroLabel>
          <div className="max-w-sm">
            <RightRailCardStack>
              <RightRailCard
                category="Verification"
                headline="Upload signature"
                description="Required to send digital prescriptions."
                action={<Button size="sm">Upload now</Button>}
                onDismiss={() => undefined}
                tone="warning"
              />
              <RightRailCard
                category="Weekly recap"
                headline="Your week in review"
                description="14 consultations · 8 follow-ups closed."
                onDismiss={() => undefined}
              />
            </RightRailCardStack>
          </div>
        </section>

        <section data-testid="prompt-input" className="space-y-4">
          <MicroLabel as="h2">Prompt input</MicroLabel>
          <PromptInput
            onSubmitPrompt={() => undefined}
            placeholder="Ask anything…"
          />
        </section>

        <section data-testid="wizard-dialog" className="space-y-4">
          <MicroLabel as="h2">Wizard dialog</MicroLabel>
          <Button onClick={() => setWizardOpen(true)}>Open wizard</Button>
          <WizardDialog
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            category="Patient onboarding"
            title="Add a new patient"
            description="Capture identity, contact, and consent."
            steps={WIZARD_STEPS}
            activeStepId={wizardStep}
            onBack={() => {
              const idx = WIZARD_STEPS.findIndex((s) => s.id === wizardStep);
              const prev = WIZARD_STEPS.at(idx - 1);
              if (prev) setWizardStep(prev.id);
            }}
            footer={
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setWizardOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const idx = WIZARD_STEPS.findIndex(
                      (s) => s.id === wizardStep,
                    );
                    const next = WIZARD_STEPS.at(idx + 1);
                    if (next) {
                      setWizardStep(next.id);
                    } else {
                      setWizardOpen(false);
                    }
                  }}
                >
                  {wizardStep === WIZARD_STEPS.at(-1)?.id ? "Finish" : "Next"}
                </Button>
              </div>
            }
          >
            <p className="text-sm text-muted-foreground">
              Step content for:{" "}
              <span className="font-semibold text-foreground">
                {wizardStep}
              </span>
            </p>
          </WizardDialog>
        </section>
      </div>
    </AppPageScaffold>
  );
}
