import { Bed, CheckCircle2, Search, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { AdmissionModal } from ".";
import { WardWithRooms } from "../hooks/use-ipd-logic";

interface BedManagementUIProps {
  wards: WardWithRooms[] | undefined;
  isLoading: boolean;
  stats: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
  };
  showAdmissionModal: boolean;
  setShowAdmissionModal: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function BedManagementUI({
  wards,
  isLoading,
  stats,
  showAdmissionModal,
  setShowAdmissionModal,
  searchQuery,
  setSearchQuery,
}: BedManagementUIProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading bed status...
      </div>
    );
  }

  const { totalBeds, occupiedBeds, availableBeds, occupancyRate } = stats;

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bed Management</h1>
          <p className="text-muted-foreground mt-1">
            Real-time status of wards and beds
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search patients, beds..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">Manage Wards</Button>
          <Button variant="default" onClick={() => setShowAdmissionModal(true)}>
            New Admission
          </Button>
        </div>
      </div>

      <AdmissionModal
        open={showAdmissionModal}
        onOpenChange={setShowAdmissionModal}
      />

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeds}</div>
            <p className="text-xs text-muted-foreground">Across all wards</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">
              {occupancyRate}% Occupancy rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableBeds}</div>
            <p className="text-xs text-muted-foreground">Ready for admission</p>
          </CardContent>
        </Card>
      </div>

      {/* Wards Grid */}
      <div className="grid gap-6">
        {wards?.map((ward) => (
          <Card key={ward.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{ward.name}</CardTitle>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                  {ward.type}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Rooms */}
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
                        ₹{room.charges}/day
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {room.beds.map((bed) => (
                        <div
                          key={bed.id}
                          className={`
                                                relative p-2 rounded-md text-center text-xs font-medium border cursor-pointer transition-colors hover:bg-accent
                                                ${bed.status === "AVAILABLE" ? "bg-green-50/50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-400" : ""}
                                                ${bed.status === "OCCUPIED" ? "bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400" : ""}
                                                ${bed.status === "MAINTENANCE" ? "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-800" : ""}
                                            `}
                        >
                          <Bed className="h-4 w-4 mx-auto mb-1 opacity-70" />
                          {bed.bedNumber}
                          <span className="block text-[10px] opacity-70 mt-0.5 lowercase">
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
    </div>
  );
}
