import { Button } from "@workspace/ui/components";
import { openCommandPaletteFromUi } from "@/components/layout/command-palette-launcher";

/**
 * Sidebar-consistent "Ask AI" trigger. Opens the command palette (which
 * hosts the Ask AI surface) — the same behavior the sidebar footer used
 * before this extraction. Keeping the trigger in one component means the
 * pinned Ask AI entry and any future Ask AI affordance stay visually and
 * behaviorally identical.
 */
export function AskAiButton({ onOpen }: { onOpen?: () => void } = {}) {
  return (
    <Button
      variant="ghost"
      onClick={() => {
        // Mobile callers dismiss the navigation sheet before the palette opens
        // so the overlay does not stack on top of it.
        onOpen?.();
        openCommandPaletteFromUi();
      }}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
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
      <span className="flex-1 truncate">Ask AI</span>
    </Button>
  );
}
