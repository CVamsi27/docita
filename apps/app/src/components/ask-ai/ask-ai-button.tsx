import { Button } from "@workspace/ui/components";
import { SidebarRailAction } from "@workspace/ui/components/navigation/sidebar-rail-action";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";

export function AskAiButton({ onOpen, compact = false }: { onOpen?: () => void; compact?: boolean } = {}) {
  const { openOverlay } = useAskAi();
  const button = (
    <Button
      variant="ghost"
      aria-label="Ask AI"
      onClick={(event) => {
        event.currentTarget.focus();
        onOpen?.();
        openOverlay();
      }}
      className={`flex w-full items-center gap-3 rounded-xl py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors ${compact ? "justify-center px-0" : "px-2.5"}`}
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 2a10 10 0 0 0-6.88 17.23l.9-1.2A2 2 0 0 1 7.62 17h8.76a2 2 0 0 1 1.6.83l.9 1.2A10 10 0 0 0 12 2z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </span>
      {!compact && <span className="flex-1 truncate">Ask AI</span>}
    </Button>
  );
  return <SidebarRailAction label="Ask AI" showTooltip={compact}>{button}</SidebarRailAction>;
}
