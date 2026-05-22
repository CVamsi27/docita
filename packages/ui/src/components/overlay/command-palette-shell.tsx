"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./command";

export interface CommandPaletteAction {
  id: string;
  label: string;
  group: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string[];
  onRun: () => void;
  disabled?: boolean;
}

interface CommandPaletteShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandPaletteAction[];
  placeholder?: string;
  emptyText?: string;
  groupOrder?: string[];
}

export function CommandPaletteShell({
  open,
  onOpenChange,
  actions,
  placeholder = "Search or type a command",
  emptyText = "No matching commands",
  groupOrder,
}: CommandPaletteShellProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandPaletteAction[]>();
    for (const action of actions) {
      const arr = map.get(action.group) ?? [];
      arr.push(action);
      map.set(action.group, arr);
    }
    const groups = Array.from(map.entries());
    if (groupOrder?.length) {
      groups.sort(
        (a, b) =>
          (groupOrder.indexOf(a[0]) === -1 ? Infinity : groupOrder.indexOf(a[0])) -
          (groupOrder.indexOf(b[0]) === -1 ? Infinity : groupOrder.indexOf(b[0])),
      );
    }
    return groups;
  }, [actions, groupOrder]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={placeholder}
        value={query}
        onValueChange={setQuery}
        showClearButton
      />
      <CommandList>
        <CommandEmpty>{emptyText}</CommandEmpty>
        {grouped.map(([group, entries]) => (
          <CommandGroup heading={group} key={group}>
            {entries.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${(action.keywords ?? []).join(" ")}`}
                disabled={action.disabled}
                onSelect={() => {
                  onOpenChange(false);
                  action.onRun();
                }}
              >
                {action.icon ? (
                  <span className="mr-2 inline-flex size-4 items-center justify-center text-muted-foreground">
                    {action.icon}
                  </span>
                ) : null}
                <span className="flex-1 min-w-0 truncate">{action.label}</span>
                {action.shortcut ? (
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
