import React, { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export type BedStatus = "available" | "occupied" | "maintenance" | "reserved";

export interface Bed {
  id: string;
  bedNumber: string;
  status: BedStatus;
  wardId: string;
}

export interface Ward {
  id: string;
  name: string;
  floor: string;
}

export interface BedMapProps {
  ward?: Ward;
  beds?: Bed[];
}

export const BedMap: FC<BedMapProps> = ({ ward, beds = [] }) => {
  const getStatusColor = (status: BedStatus) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700";
      case "occupied":
        return "bg-red-100 text-red-700";
      case "maintenance":
        return "bg-amber-100 text-amber-700";
      case "reserved":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Bed Map{ward ? `: ${ward.name}` : ""}</CardTitle>
        <CardDescription>Visual bed occupancy</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {beds.length > 0
            ? beds.map((bed) => (
                <div
                  key={bed.id}
                  className={`h-16 rounded-lg flex items-center justify-center font-medium ${getStatusColor(bed.status)}`}
                >
                  {bed.bedNumber}
                </div>
              ))
            : [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-medium"
                >
                  Bed {i}
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  );
};
