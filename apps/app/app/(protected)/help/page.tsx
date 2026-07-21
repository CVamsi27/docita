export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import {
  AppPageScaffold,
  PageHeader
} from "@workspace/ui/components";
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
