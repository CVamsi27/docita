"use client";

import { Tier } from "@/lib/subscription/tier-access";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import { ComparisonTable } from "@/features/subscription/components/pricing/comparison-table";
import { FaqSection } from "@/features/subscription/components/sections/faq-section";

export function PlanTabsSection({
  effectiveCurrentTier,
}: {
  effectiveCurrentTier: Tier;
}) {
  return (
    <Tabs defaultValue="compare" className="w-full">
      <TabsList className="flex h-auto w-full min-w-0 flex-nowrap justify-start gap-1 overflow-x-auto overscroll-x-contain rounded-none border-b bg-transparent p-0 [scrollbar-width:thin]">
        <TabsTrigger
          value="compare"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
        >
          Compare Plans
        </TabsTrigger>
        <TabsTrigger
          value="faq"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
        >
          FAQ
        </TabsTrigger>
      </TabsList>

      <TabsContent value="compare" className="pt-4">
        <ComparisonTable currentTier={effectiveCurrentTier} />
      </TabsContent>

      <TabsContent value="faq" className="pt-4">
        <FaqSection />
      </TabsContent>
    </Tabs>
  );
}
