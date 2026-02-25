"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { useAIAssistantLogic } from "@/features/ai-assistant/hooks/use-ai-assistant-logic";
import { AIAssistantUI } from "@/features/ai-assistant/components/AIAssistantUI";

export default function AIAssistantPage() {
  const { state, handlers } = useAIAssistantLogic();

  return (
    <FeatureGate feature={Feature.AI_PRESCRIPTION_ASSISTANT} showLockedCard>
      <AIAssistantUI state={state} handlers={handlers} />
    </FeatureGate>
  );
}
