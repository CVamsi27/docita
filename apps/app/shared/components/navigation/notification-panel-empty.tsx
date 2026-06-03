"use client";

import Link from "next/link";
import { BellIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";

interface NotificationPanelEmptyProps {
  onClose: () => void;
}

export function NotificationPanelEmpty({ onClose }: NotificationPanelEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <BellIcon className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        You&apos;re all caught up
      </p>
      <Button asChild variant="outline" size="sm" onClick={onClose}>
        <Link href="/inbox?tab=notifications">
          <ExternalLinkIcon className="mr-2 h-4 w-4" />
          View notification history
        </Link>
      </Button>
    </div>
  );
}
