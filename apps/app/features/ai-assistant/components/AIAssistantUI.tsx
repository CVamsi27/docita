import React, { FC } from "react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Brain,
  FileText,
  LucideIcon,
  Pill,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { FeatureGuard } from "@/features/_shared/components/auth/feature-guard";
import { Feature } from "@/lib/stores/permission-store";
import { PrescriptionAssistantTab } from "./tabs/PrescriptionAssistantTab";
import { DiagnosisAssistantTab } from "./tabs/DiagnosisAssistantTab";
import { InsightsTab } from "./tabs/InsightsTab";
import { SmartTasksTab } from "./tabs/SmartTasksTab";
import type { AIAssistantHandlers, AIAssistantState } from "@workspace/types";

interface EmptyStateProps {
  icon: LucideIcon;
  label: string;
}

export const EmptyState = ({ icon: Icon, label }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
    <p className="text-muted-foreground text-center">{label}</p>
  </div>
);

interface AIAssistantUIProps {
  state: AIAssistantState;
  handlers: AIAssistantHandlers;
}

export const AIAssistantUI: FC<AIAssistantUIProps> = ({ state, handlers }) => {
  return (
    <FeatureGuard feature={Feature.AI_PRESCRIPTION_ASSISTANT}>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <AIAssistantHeader />

        <Tabs
          value={state.activeTab}
          onValueChange={handlers.setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger
              value="prescription"
              className="flex items-center gap-2"
            >
              <Pill className="h-4 w-4" />
              <span className="hidden sm:inline">Prescription</span>
            </TabsTrigger>
            <TabsTrigger value="diagnosis" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Diagnosis</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Smart Tasks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prescription" className="space-y-6">
            <PrescriptionAssistantTab state={state} handlers={handlers} />
          </TabsContent>

          <TabsContent value="diagnosis" className="space-y-6">
            <DiagnosisAssistantTab state={state} handlers={handlers} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <InsightsTab />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <SmartTasksTab state={state} handlers={handlers} />
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGuard>
  );
};

const AIAssistantHeader = () => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Sparkles className="h-8 w-8 text-primary" />
        AI Assistant
      </h1>
      <p className="text-muted-foreground">
        AI-powered clinical decision support for prescriptions, diagnoses, and
        workflow automation.
      </p>
    </div>
    <Badge
      variant="secondary"
      className="bg-linear-to-r from-destructive to-primary text-white"
    >
      <Sparkles className="h-3 w-3 mr-1" />
      Docita Intelligence
    </Badge>
  </div>
);
