"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Calendar,
  ClipboardList,
  FileText,
  Home,
  Package,
  PlusCircle,
  Receipt,
  Search,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Appointments", href: "/appointments", icon: Calendar },
  { label: "Queue", href: "/queue", icon: ClipboardList },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

const quickActions = [
  { label: "New Patient", action: "/patients?new=true", icon: PlusCircle },
  {
    label: "New Appointment",
    action: "/appointments?new=true",
    icon: PlusCircle,
  },
  { label: "Start Consultation", action: "/consultation", icon: Stethoscope },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => runCommand(() => router.push(item.href))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => (
            <CommandItem
              key={item.action}
              onSelect={() => runCommand(() => router.push(item.action))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
