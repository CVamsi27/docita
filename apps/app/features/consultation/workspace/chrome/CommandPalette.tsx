"use client";

import { useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@workspace/ui/components/command";
import {
  ClipboardList,
  Eye,
  HeartPulse,
  Pill,
  Save,
  Stethoscope,
  Target,
} from "lucide-react";

export interface CommandPaletteAction {
  id: string;
  label: string;
  group: "Navigate" | "Add" | "Action";
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  onRun: () => void | Promise<void>;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandPaletteAction[];
}

export function CommandPalette({
  open,
  onOpenChange,
  actions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const groups = actions.reduce<Record<string, CommandPaletteAction[]>>(
    (acc, action) => {
      if (!acc[action.group]) acc[action.group] = [];
      acc[action.group]!.push(action);
      return acc;
    },
    {},
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium">
        <CommandInput
          placeholder="Jump to section, add item, run action..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No matching commands.</CommandEmpty>
          {(["Navigate", "Add", "Action"] as const).map((groupName, idx) => {
            const groupActions = groups[groupName];
            if (!groupActions || groupActions.length === 0) return null;
            return (
              <div key={groupName}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={groupName}>
                  {groupActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <CommandItem
                        key={action.id}
                        value={`${action.group} ${action.label}`}
                        onSelect={async () => {
                          onOpenChange(false);
                          await action.onRun();
                        }}
                      >
                        {Icon ? (
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        ) : null}
                        <span>{action.label}</span>
                        {action.shortcut && (
                          <CommandShortcut>{action.shortcut}</CommandShortcut>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export const CONSULTATION_PALETTE_ICONS = {
  subjective: ClipboardList,
  objective: Stethoscope,
  assessment: Target,
  plan: Pill,
  specialty: Eye,
  vitals: HeartPulse,
  save: Save,
} as const;
