import { Feature } from "@workspace/types";
import { useTranslation } from "react-i18next";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";
import { useAIAssistantLogic } from "@/features/ai-assistant/hooks/use-ai-assistant-logic";
import { AIAssistantUI } from "@/features/ai-assistant/components/AIAssistantUI";

export function AIAssistantPageContainer() {
  const { t } = useTranslation("AiAssistant");
  const { state, handlers } = useAIAssistantLogic();

  return (
    <PageFeatureGate
      feature={Feature.AI_PRESCRIPTION_ASSISTANT}
      title={t("title")}
      description={t("description")}
    >
      <AIAssistantUI state={state} handlers={handlers} />
    </PageFeatureGate>
  );
}
