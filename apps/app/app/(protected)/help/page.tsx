export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { HelpCenter } from "@/features/help/components";

export const metadata: Metadata = {
  title: "Help",
};

export default function HelpPage() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Help"
          description="Search guides, browse FAQs, and reach the Docita support team."
        />
      }
    >
      <HelpCenter />
    </AppPageScaffold>
  );
}
