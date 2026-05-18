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
} from "@workspace/ui/components/overlay/command";
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
          placeholder="Enter command"
          value={query}
          onValueChange={setQuery}
          showClearButton
        />
        <CommandList>
          <CommandEmpty>
            <span className="block">No matching commands.</span>
            <span className="mt-2 block text-[var(--fs-xs)] text-muted-foreground">
              Tip: press{" "}
              <kbd className="rounded border border-border/70 bg-muted px-1 font-mono text-[var(--fs-2xs)]">
                g
              </kbd>{" "}
              then a SOAP letter, or{" "}
              <kbd className="rounded border border-border/70 bg-muted px-1 font-mono text-[var(--fs-2xs)]">
                q
              </kbd>{" "}
              for the OPD queue.
            </span>
          </CommandEmpty>
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
                          <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
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
