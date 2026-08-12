import { useAskAi } from "./ask-ai-context";
import { Dialog, DialogContent } from "@workspace/ui/components/overlay/dialog";
import { Sparkles } from "lucide-react";

export function AskAiOverlay() {
  const { open, closeOverlay } = useAskAi();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) closeOverlay(); }}>
      <DialogContent showCloseButton className="sm:max-w-[640px] md:max-w-[900px] gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">Ask AI</span>
        </div>
        <div className="flex min-h-[300px] items-center justify-center p-8 text-sm text-muted-foreground">
          AI assistant is coming soon.
        </div>
      </DialogContent>
    </Dialog>
  );
}
