import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { Button } from "@workspace/ui/components/form/button";
import { Sparkles } from "lucide-react";

export function TopBarActions({
  compact: _compact = false,
}: {
  compact?: boolean;
}) {
  const { openOverlay } = useAskAi();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={(event) => {
          event.currentTarget.focus();
          openOverlay();
        }}
        aria-label="Open Ask AI"
        className="touch-manipulation"
      >
        <Sparkles className="size-4" aria-hidden />
      </Button>
    </>
  );
}
