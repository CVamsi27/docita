"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { FeedbackFormDialogDynamic } from "@/lib/dynamic-imports";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

export function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="fixed bottom-20 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-background border-2"
              onClick={() => setOpen(true)}
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Share Feedback</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <FeedbackFormDialogDynamic open={open} onOpenChange={setOpen} />
    </>
  );
}
