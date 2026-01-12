"use client";

import { useAIAssistantLogic } from "@/features/ai-assistant/hooks/use-ai-assistant-logic";
import { AIAssistantUI } from "@/features/ai-assistant/components/AIAssistantUI";

export default function AIAssistantPage() {
  const { state, handlers } = useAIAssistantLogic();

  return (
    <AIAssistantUI
      state={state}
      handlers={handlers}
    />
  );
}
