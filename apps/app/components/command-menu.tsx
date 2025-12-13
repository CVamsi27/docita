"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  FileText,
  Pill,
  Plus,
  Settings,
  User,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command";
import { apiHooks } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { Patient } from "@workspace/types";

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: patientsResponse } = apiHooks.usePatients(
    isAuthenticated ? {} : null,
  ); // Only fetch when authenticated
  const paginatedResponse = patientsResponse as
    | PaginatedResponse<Patient>
    | undefined;
  const patients: Patient[] = paginatedResponse?.items || [];

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/patients?action=new"))
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>New Patient</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/appointments?action=new"))
            }
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>Schedule Appointment</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/patients"))}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Patients</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/appointments"))}
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>Appointments</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/prescriptions"))}
          >
            <Pill className="mr-2 h-4 w-4" />
            <span>Prescriptions</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/invoices"))}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>Invoices</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {patients && patients.length > 0 && (
          <CommandGroup heading="Patients">
            {patients.slice(0, 5).map((patient) => (
              <CommandItem
                key={patient.id}
                onSelect={() =>
                  runCommand(() => router.push(`/patients/${patient.id}`))
                }
              >
                <User className="mr-2 h-4 w-4" />
                <span>
                  {patient.firstName} {patient.lastName}
                </span>
                <span className="ml-2 text-muted-foreground text-xs">
                  {patient.phoneNumber}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
