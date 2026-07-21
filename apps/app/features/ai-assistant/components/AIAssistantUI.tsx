import React, { FC } from "react";
import { useTranslations } from "next-intl";
import {
  AppPageScaffold,
  Badge,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@workspace/ui/components";
import { Brain, FileText, Pill, Sparkles, TrendingUp } from "lucide-react";
import { FeatureGuard } from "@/components/auth/feature-guard";
import { Feature } from "@/lib/stores/permission-store";
import { EmptyState } from "./empty-state";
import { PrescriptionAssistantTab } from "./tabs/PrescriptionAssistantTab";
import { DiagnosisAssistantTab } from "./tabs/DiagnosisAssistantTab";
import { InsightsTab } from "./tabs/InsightsTab";
import { SmartTasksTab } from "./tabs/SmartTasksTab";
import type { AIAssistantHandlers, AIAssistantState } from "@workspace/types";

export { EmptyState };

interface AIAssistantUIProps {
  state: AIAssistantState;
  handlers: AIAssistantHandlers;
}

/**
 * Phase 3 (per-feature): apps/app AI Assistant > main page UI.
 * 5 literals converted to useTranslations("AiAssistant").
 */
function useAiAssistantTranslations() {
  return useTranslations("AiAssistant");
}

export const AIAssistantUI: FC<AIAssistantUIProps> = ({ state, handlers }) => {
  const t = useAiAssistantTranslations();
  return (
    <FeatureGuard feature={Feature.AI_PRESCRIPTION_ASSISTANT}>
      <AppPageScaffold
        header={
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-primary" aria-hidden />
                {t("title")}
              </span>
            }
            description={t("description")}
            actions={
              <Badge variant="secondary" className="tier-intelligence border">
                <Sparkles className="h-3 w-3 mr-1" />
                {t("intelligenceBadge")}
              </Badge>
            }
          />
        }
      >
        <Tabs
          value={state.activeTab}
          onValueChange={handlers.setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4 lg:w-[min(100vw-2rem,600px)]">
            <TabsTrigger
              value="prescription"
              className="flex items-center gap-2"
            >
              <Pill className="h-4 w-4" />
              <span className="hidden sm:inline">{t("prescriptionTab")}</span>
            </TabsTrigger>
            <TabsTrigger value="diagnosis" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">{t("diagnosisTab")}</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">{t("insightsTab")}</span>
              <Badge variant="outline" className="ml-1 hidden sm:inline-flex">
                {t("soonBadge")}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t("smartTasksTab")}</span>
              <Badge variant="outline" className="ml-1 hidden sm:inline-flex">
                {t("soonBadge")}
              </Badge>
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
      </AppPageScaffold>
    </FeatureGuard>
  );
};
