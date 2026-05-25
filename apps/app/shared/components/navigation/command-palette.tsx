"use client";

import { CommandPaletteShell } from "@workspace/ui/components/overlay/command-palette-shell";
import { useCommandPalette } from "./use-command-palette";

export type { QuickAction } from "./command-palette-config";
export { QUICK_ACTIONS } from "./command-palette-config";

export function CommandPalette() {
  const { open, setOpen, actions, groupOrder } = useCommandPalette();

  return (
    <CommandPaletteShell
      open={open}
      onOpenChange={setOpen}
      actions={actions}
      placeholder="Enter command"
      groupOrder={[...groupOrder]}
    />
  );
}
