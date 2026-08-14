import { PageMeta } from "@/components/layout/page-meta";
import { AIAssistantPageContainer } from "../components/AIAssistantPageContainer";

export function AiAssistantPage() {
  return (
    <>
      <PageMeta
        title="AI Assistant"
        description="AI-powered clinical assistant"
      />
      <AIAssistantPageContainer />
    </>
  );
}
