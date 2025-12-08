"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Search,
  Eye,
  Pill,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { apiHooks } from "@/lib/api-hooks";
import { FeatureGate } from "@/components/common/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { WhatsAppButton } from "@/components/common/whatsapp-button";
import { format } from "date-fns";

type SortKey = "date" | "patient" | "diagnosis" | "medications";
type SortDirection = "asc" | "desc";

export default function PrescriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: prescriptions = [], isLoading: loading } =
    apiHooks.usePrescriptions();
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "date",
    direction: "desc",
  });

  const downloadPDF = async (prescriptionId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/prescriptions/${prescriptionId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("docita_token")}`,
          },
        },
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescription-${prescriptionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAndSortedPrescriptions = useMemo(() => {
    let result = [...prescriptions];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const patientName = item.patient?.firstName
          ? `${item.patient.firstName} ${item.patient.lastName}`.toLowerCase()
          : "";
        const diagnosis = (item.diagnosis || "").toLowerCase();
        const phone = (item.patient?.phoneNumber || "").toLowerCase();
        return (
          patientName.includes(query) ||
          diagnosis.includes(query) ||
          phone.includes(query)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortConfig.key) {
        case "date":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "patient":
          aValue =
            `${a.patient?.firstName || ""} ${a.patient?.lastName || ""}`.toLowerCase();
          bValue =
            `${b.patient?.firstName || ""} ${b.patient?.lastName || ""}`.toLowerCase();
          break;
        case "diagnosis":
          aValue = (a.diagnosis || "").toLowerCase();
          bValue = (b.diagnosis || "").toLowerCase();
          break;
        case "medications":
          aValue = a.medications?.length || 0;
          bValue = b.medications?.length || 0;
          break;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [prescriptions, searchQuery, sortConfig]);

  const SortableHeader = ({
    column,
    label,
  }: {
    column: SortKey;
    label: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(column)}
      className="gap-1 h-8 px-0 font-medium hover:bg-transparent"
    >
      {label}
      {sortConfig.key === column ? (
        sortConfig.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );

  return (
    <FeatureGate
      feature={Feature.DIGITAL_PRESCRIPTIONS}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <Pill className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Digital Prescriptions</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create and manage digital prescriptions for your patients. Upgrade
            to Core tier to unlock this feature.
          </p>
          <Button asChild>
            <Link href="/settings?tab=subscription">Upgrade to Core</Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
            <p className="text-muted-foreground">
              View and manage all patient prescriptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, diagnosis, or phone..."
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>All Prescriptions</CardTitle>
            <CardDescription>
              A list of all prescriptions generated for patients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead>Prescription ID</TableHead>
                  <TableHead>
                    <SortableHeader column="patient" label="Patient" />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="diagnosis" label="Diagnosis" />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="medications" label="Medications" />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column="date" label="Date" />
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
                      Loading prescriptions...
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedPrescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No prescriptions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedPrescriptions.map((prescription) => (
                    <TableRow
                      key={prescription.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="font-mono text-sm">
                        {(prescription.id || "").slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {prescription.patient?.firstName}{" "}
                            {prescription.patient?.lastName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {prescription.patient?.phoneNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {prescription.diagnosis || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Pill className="h-3 w-3 mr-1" />
                          {prescription.medications?.length || 0} meds
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(prescription.createdAt),
                          "MMM d, yyyy",
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="gap-2"
                        >
                          <Link href={`/prescriptions/${prescription.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadPDF(prescription.id || "")}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                        {prescription.patient?.phoneNumber && (
                          <WhatsAppButton
                            phoneNumber={prescription.patient.phoneNumber}
                            message={`Hello ${prescription.patient.firstName}, here is your prescription from ${process.env.NEXT_PUBLIC_CLINIC_NAME || "Docita Clinic"}.`}
                            variant="ghost"
                            label=""
                            className="h-8 w-8 p-0"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredAndSortedPrescriptions.length} of{" "}
            {prescriptions.length} prescriptions
          </p>
        </div>
      </div>
    </FeatureGate>
  );
}
