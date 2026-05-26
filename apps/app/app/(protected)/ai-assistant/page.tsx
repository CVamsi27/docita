"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useAIAssistantLogic } from "@/features/ai-assistant/hooks/use-ai-assistant-logic";
import { AIAssistantUI } from "@/features/ai-assistant/components/AIAssistantUI";

export default function AIAssistantPage() {
  return <AIAssistantPageContainer />;
}
