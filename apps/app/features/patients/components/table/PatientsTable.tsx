import { Patient } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  FileText,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PatientsTableProps {
  patients: Patient[];
  isLoading: boolean;
  sortConfig: {
    key: keyof Patient | "fullName";
    direction: "asc" | "desc";
  } | null;
  onSort: (key: keyof Patient | "fullName") => void;
  onEdit: (patient: Patient) => void;
  onSchedule: (patient: Patient) => void;
  onRowClick: (patientId: string) => void;
  emptyMessage?: string;
}

export function PatientsTable({
  patients,
  isLoading,
  sortConfig,
  onSort,
  onEdit,
  onSchedule,
  onRowClick,
  emptyMessage = "No patients found.",
}: PatientsTableProps) {
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
    <div className="rounded-md border border-border overflow-hidden">
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort("fullName")}
              >
                <div className="flex items-center">
                  Name
                  <SortIcon column="fullName" />
                </div>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort("gender")}
              >
                <div className="flex items-center">
                  Gender
                  <SortIcon column="gender" />
                </div>
              </TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort("updatedAt")}
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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading patients...
                </TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="hover:bg-muted/50 cursor-pointer group"
                  onClick={() => patient.id && onRowClick(patient.id)}
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
                  <TableCell className="capitalize">{patient.gender}</TableCell>
                  <TableCell>
                    {patient.bloodGroup ? (
                      <span className="font-medium">{patient.bloodGroup}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {patient.updatedAt
                      ? format(new Date(patient.updatedAt), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info(
                                "Quick Note implementation coming soon",
                              );
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
                              onEdit(patient);
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
                              onSchedule(patient);
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
  );
}
