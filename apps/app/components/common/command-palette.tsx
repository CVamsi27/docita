"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
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
  Users,
  Calendar,
  FileText,
  Settings,
  Receipt,
  Activity,
  ClipboardList,
  Home,
  Package,
  TestTube2,
  UserPlus,
  CalendarPlus,
  FileTextIcon,
} from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface CommandPaletteProps {
  children?: React.ReactNode;
}

export function CommandPalette({ children }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  // Define all navigation shortcuts
  const shortcuts = React.useMemo(
    () => [
      {
        key: "k",
        modifiers: ["meta"] as ("meta" | "ctrl" | "alt" | "shift")[],
        description: "Open command palette",
        action: () => setOpen((o) => !o),
      },
      {
        key: "h",
        modifiers: ["meta"] as ("meta" | "ctrl" | "alt" | "shift")[],
        description: "Go to Dashboard",
        action: () => router.push("/"),
      },
      {
        key: "p",
        modifiers: ["meta"] as ("meta" | "ctrl" | "alt" | "shift")[],
        description: "Go to Patients",
        action: () => router.push("/patients"),
      },
      {
        key: "a",
        modifiers: ["meta"] as ("meta" | "ctrl" | "alt" | "shift")[],
        description: "Go to Appointments",
        action: () => router.push("/appointments"),
      },
    ],
    [router],
  );

  useKeyboardShortcuts({ shortcuts });

  // Commands for the palette
  const navigationCommands = [
    {
      icon: Home,
      label: "Dashboard",
      shortcut: "⌘H",
      action: () => router.push("/"),
    },
    {
      icon: Users,
      label: "Patients",
      shortcut: "⌘P",
      action: () => router.push("/patients"),
    },
    {
      icon: Calendar,
      label: "Appointments",
      shortcut: "⌘A",
      action: () => router.push("/appointments"),
    },
    {
      icon: FileText,
      label: "Prescriptions",
      action: () => router.push("/prescriptions"),
    },
    {
      icon: Receipt,
      label: "Invoices",
      action: () => router.push("/invoices"),
    },
    {
      icon: ClipboardList,
      label: "Coding Queue",
      action: () => router.push("/coding-queue"),
    },
    {
      icon: Activity,
      label: "Analytics",
      action: () => router.push("/analytics"),
    },
    {
      icon: TestTube2,
      label: "Lab Tests",
      action: () => router.push("/lab-tests"),
    },
    {
      icon: Package,
      label: "Inventory",
      action: () => router.push("/inventory"),
    },
    {
      icon: Settings,
      label: "Settings",
      action: () => router.push("/settings"),
    },
  ];

  const actionCommands = [
    {
      icon: UserPlus,
      label: "New Patient",
      action: () => router.push("/patients?action=new"),
    },
    {
      icon: CalendarPlus,
      label: "Schedule Appointment",
      action: () => router.push("/appointments?action=new"),
    },
    {
      icon: FileTextIcon,
      label: "New Prescription",
      action: () => router.push("/prescriptions?action=new"),
    },
  ];

  return (
    <>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a command or search..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick Actions">
            {actionCommands.map((command) => (
              <CommandItem
                key={command.label}
                onSelect={() => runCommand(command.action)}
                className="gap-3"
              >
                <command.icon className="h-4 w-4 text-muted-foreground" />
                <span>{command.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigation">
            {navigationCommands.map((command) => (
              <CommandItem
                key={command.label}
                onSelect={() => runCommand(command.action)}
                className="gap-3"
              >
                <command.icon className="h-4 w-4 text-muted-foreground" />
                <span>{command.label}</span>
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
