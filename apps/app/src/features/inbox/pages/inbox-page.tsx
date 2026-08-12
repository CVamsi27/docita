import { PageMeta } from "@/components/layout/page-meta";
import { InboxPageContent } from "@/features/inbox";

export function InboxPage() {
  return (
    <>
      <PageMeta title="Inbox" description="Messages and notifications." />
      <InboxPageContent />
    </>
  );
}
