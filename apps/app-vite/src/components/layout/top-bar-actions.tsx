import { Button } from "@workspace/ui/components/form/button";
import { Sparkles } from "lucide-react";

export function TopBarActions({ compact: _compact = false }: { compact?: boolean }) {
  return (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label="Open Ask AI" className="touch-manipulation">
        <Sparkles className="size-4" aria-hidden />
      </Button>
    </>
  );
}

export function openCommandPaletteFromUi() {
  window.dispatchEvent(new Event("docita:open-command-palette"));
}
