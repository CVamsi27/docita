import { useMemo, useState } from "react";
import type { CommandPaletteAction } from "@workspace/ui/components/overlay/command-palette-shell";

export function usePaletteSearch(actions: CommandPaletteAction[]) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return actions;
    const q = search.toLowerCase();
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.keywords?.some((k) => k.toLowerCase().includes(q)),
    );
  }, [actions, search]);

  return { search, setSearch, filtered };
}
