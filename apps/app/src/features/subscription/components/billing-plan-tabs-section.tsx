import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/navigation/tabs";
import { FaqSection } from "./sections/faq-section";

export function PlanTabsSection({ effectiveCurrentTier: _effectiveCurrentTier }: { effectiveCurrentTier: number }) {
  return (
    <Tabs defaultValue="faq" className="w-full">
      <TabsList className="flex h-auto w-full min-w-0 flex-nowrap justify-start gap-1 overflow-x-auto overscroll-x-contain rounded-none border-b bg-transparent p-0 [scrollbar-width:thin]">
        <TabsTrigger value="faq" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2">FAQ</TabsTrigger>
      </TabsList>
      <TabsContent value="faq" className="pt-4"><FaqSection /></TabsContent>
    </Tabs>
  );
}
