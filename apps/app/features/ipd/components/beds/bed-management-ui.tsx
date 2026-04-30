import { Bed, CheckCircle2, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { LoadingState } from "@workspace/ui/components/empty-state";
import { StatGrid, type StatItem } from "@workspace/ui/components/stat-grid";
import { AdmissionModal } from "@/features/ipd/components/modals/admission-modal";
import type { AdmitPatientRequest, Admission } from "@workspace/types";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";

interface BedInfo {
  id: string;
  bedNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
}

interface RoomInfo {
  id: string;
  roomNumber: string;
  charges: number;
  beds: BedInfo[];
}

export interface WardInfo {
  id: string;
  name: string;
  type: string;
  rooms: RoomInfo[];
}

interface BedManagementUIProps {
  wards: WardInfo[] | undefined;
  isLoading: boolean;
  stats: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    maintenanceBeds?: number;
    occupancyRate: number;
    activeAdmissions?: number;
  };
  showAdmissionModal: boolean;
  setShowAdmissionModal: (show: boolean) => void;
  onAdmitPatient: (data: AdmitPatientRequest) => Promise<Admission>;
  isAdmitting: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function BedManagementUI({
  wards,
  isLoading,
  stats,
  showAdmissionModal,
  setShowAdmissionModal,
  onAdmitPatient,
  isAdmitting,
  searchQuery,
  setSearchQuery,
}: BedManagementUIProps) {
  const { formatCurrency } = useClinicCurrency();

  if (isLoading) {
    return <LoadingState message="Loading bed status..." className="min-h-[40vh]" />;
  }

  const {
    totalBeds,
    occupiedBeds,
    availableBeds,
    occupancyRate,
    activeAdmissions,
  } = stats;

  const statItems: StatItem[] = [
    {
      id: "total",
      label: "Total Beds",
      value: totalBeds,
      description: "Across all wards",
      icon: <Bed className="h-4 w-4" />,
    },
    {
      id: "occupied",
      label: "Occupied",
      value: occupiedBeds,
      description: `${occupancyRate}% Occupancy rate`,
      icon: <Users className="h-4 w-4" />,
      accent: "warning",
    },
    {
      id: "available",
      label: "Available",
      value: availableBeds,
      description: "Ready for admission",
      icon: <CheckCircle2 className="h-4 w-4" />,
      accent: "success",
    },
    {
      id: "admissions",
      label: "Active Admissions",
      value: activeAdmissions ?? occupiedBeds,
      description: "Patients currently admitted",
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Bed Management"
          description="Real-time status of wards and beds."
          actions={
            <div className="flex flex-wrap gap-2">
              <Input
                type="search"
                placeholder="Search patients, beds..."
                className="w-full sm:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="outline">Manage Wards</Button>
              <Button onClick={() => setShowAdmissionModal(true)}>
                New Admission
              </Button>
            </div>
          }
        />
      }
    >
      <AdmissionModal
        open={showAdmissionModal}
        onOpenChange={setShowAdmissionModal}
        wards={wards}
        isSubmitting={isAdmitting}
        onSubmit={async (data) => {
          await onAdmitPatient(data);
          setShowAdmissionModal(false);
        }}
      />

      <StatGrid items={statItems} columns={4} />

      <div className="grid gap-6">
        {wards?.map((ward) => (
          <Card key={ward.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{ward.name}</CardTitle>
                <span className="badge-info border px-2.5 py-0.5 text-xs font-medium uppercase">
                  {ward.type}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ward.rooms?.map((room) => (
                  <div
                    key={room.id}
                    className="border rounded-lg p-3 space-y-3"
                  >
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                      <span className="font-semibold text-sm">
                        Room {room.roomNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                          {formatCurrency(room.charges, {
                            fractionDigits: 0,
                          })}
                          /day
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {room.beds.map((bed) => (
                        <div
                          key={bed.id}
                          className={`
                            relative p-2 rounded-md text-center text-xs font-medium border cursor-pointer transition-colors hover:bg-accent
                            ${bed.status === "AVAILABLE" ? "badge-success" : ""}
                            ${bed.status === "OCCUPIED" ? "badge-warning" : ""}
                            ${bed.status === "MAINTENANCE" ? "badge-muted" : ""}
                          `}
                        >
                          <Bed className="h-4 w-4 mx-auto mb-1 opacity-70" />
                          {bed.bedNumber}
                          <span className="block text-[var(--fs-2xs)] opacity-70 mt-0.5 lowercase">
                            {bed.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppPageScaffold>
  );
}
