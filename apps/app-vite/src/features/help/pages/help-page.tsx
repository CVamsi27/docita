import { AppPageScaffold } from "@workspace/ui/components";
import { FAQSection, HelpCenter } from "@/features/help/components";

export function HelpPage() {
  return (
    <AppPageScaffold>
      <HelpCenter />
      <div className="mx-auto mt-8 max-w-4xl">
        <FAQSection />
      </div>
    </AppPageScaffold>
  );
}
