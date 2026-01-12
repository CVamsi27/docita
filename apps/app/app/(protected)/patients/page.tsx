"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { apiHooks } from "@/lib/api-hooks";
import { Patient } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  FileText,
  Pencil,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import {
  AddPatientDialog,
  EditPatientDialog,
} from "@/features/patients/components";

import { useRouter, useSearchParams } from "next/navigation";

function PatientsContent() {
  const {
    data: patientsResponse,
    isLoading: loading,
    error: queryError,
    refetch,
  } = apiHooks.usePatients();
  // Note: Doctors should see all patients, not filtered by appointments
  // Appointments API call removed to improve performance
  const error = queryError ? (queryError as Error).message : null;
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Patient | "fullName";
    direction: "asc" | "desc";
  } | null>(null);
  const [filterType, setFilterType] = useState<"all" | "recent" | "new">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Open dialog from URL params
  const currentAction = searchParams.get("action");
  useEffect(() => {
    if (currentAction === "new") {
      setIsAddDialogOpen(true);
    }
  }, [currentAction]);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsAddDialogOpen(open);
      if (!open) {
        // Remove the query param when dialog closes
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("action");
        router.replace(`/patients?${newParams.toString()}`);
      }
    },
    [searchParams, router],
  );

  const handleSort = (key: keyof Patient | "fullName") => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    // Extract items from paginated responses
    const patients = patientsResponse?.items || [];
    let result = [...patients];

    // 1. Smart Filters (Pre-sort/Filter)
    if (filterType === "recent") {
      // Sort by updatedAt desc
      result.sort((a, b) => {
        const da = new Date(a.updatedAt || 0).getTime();
        const db = new Date(b.updatedAt || 0).getTime();
        return db - da;
      });
    } else if (filterType === "new") {
      // Sort by createdAt desc
      result.sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return db - da;
      });
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((patient) => {
        const fullName =
          `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const phoneNumber = patient.phoneNumber.toLowerCase();
        return fullName.includes(query) || phoneNumber.includes(query);
      });
    }

    // 3. Column Sort (Overrides Smart Filter sort if active)
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: string | number | Date | undefined;
        let bValue: string | number | Date | undefined;

        if (sortConfig.key === "fullName") {
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else {
          aValue = a[sortConfig.key as keyof Patient] as
            | string
            | number
            | Date
            | undefined;
          bValue = b[sortConfig.key as keyof Patient] as
            | string
            | number
            | Date
            | undefined;
        }

        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [patientsResponse, searchQuery, sortConfig, filterType]);

  const SortIcon = ({ column }: { column: keyof Patient | "fullName" }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            Manage your patient records and history.
          </p>
        </div>

        <AddPatientDialog
          open={isAddDialogOpen}
          onOpenChange={handleDialogChange}
          onPatientAdded={() => refetch()}
        />
        <EditPatientDialog
          patient={editingPatient}
          open={!!editingPatient}
          onOpenChange={(open: boolean) => !open && setEditingPatient(null)}
          onPatientUpdated={() => refetch()}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Patients</CardTitle>
              <CardDescription>
                A list of all patients in your practice including their name,
                contact, and medical history.
              </CardDescription>
            </div>
             <Tabs value={filterType} onValueChange={(v) => setFilterType(v as "all" | "recent" | "new")} className="w-[400px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="recent">Recently Active</TabsTrigger>
                <TabsTrigger value="new">New Patients</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                className="pl-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Clear
              </Button>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20 mb-6">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="rounded-md border border-border overflow-hidden">
            <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("fullName")}
                  >
                    <div className="flex items-center">
                      Name
                      <SortIcon column="fullName" />
                    </div>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("gender")}
                  >
                    <div className="flex items-center">
                      Gender
                      <SortIcon column="gender" />
                    </div>
                  </TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("updatedAt")}
                  >
                    <div className="flex items-center">
                      Last Updated
                      <SortIcon column="updatedAt" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading patients...
                    </TableCell>
                  </TableRow>
                ) : filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {searchQuery
                        ? `No patients found matching "${searchQuery}"`
                        : "No patients found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="hover:bg-muted/50 cursor-pointer group"
                      onClick={() => router.push(`/patients/${patient.id}`)}
                    >
                      <TableCell>
                        <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {patient.firstName.charAt(0)}
                            {patient.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{patient.phoneNumber}</span>
                          <span className="text-muted-foreground">
                            {patient.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {patient.gender}
                      </TableCell>
                      <TableCell>
                        {patient.bloodGroup ? (
                          <span className="font-medium">
                            {patient.bloodGroup}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            --
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.updatedAt
                          ? format(new Date(patient.updatedAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.info("Quick Note implementation coming soon");
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Quick Note (Stub)</TooltipContent>
                           </Tooltip>

                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPatient(patient);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Patient</TooltipContent>
                           </Tooltip>
                          
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 ml-1 rounded-full shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/appointments?action=new&patientId=${patient.id}`,
                                  );
                                }}
                              >
                                <Calendar className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Schedule Visit</TooltipContent>
                           </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PatientsContent />
    </Suspense>
  );
}
