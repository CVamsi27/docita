"use client";

import React, { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Activity, BedDouble, Calendar, Users } from "lucide-react";

interface Ward {
  id: string;
  name: string;
  floor: string;
}

interface Bed {
  id: string;
  bedNumber: string;
  status: string;
  wardId: string;
}

export interface IpdDashboardProps {
  wards?: Ward[];
  beds?: Bed[];
}

export const IpdDashboard: FC<IpdDashboardProps> = ({
  wards = [],
  beds = [],
}) => {
  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const dischargesCount = 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{beds.length}</p>
              <p className="text-xs text-muted-foreground">Total Beds</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{occupiedCount}</p>
              <p className="text-xs text-muted-foreground">Admitted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dischargesCount}</p>
              <p className="text-xs text-muted-foreground">Discharges Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{wards.length}</p>
              <p className="text-xs text-muted-foreground">Wards</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Ward Overview</CardTitle>
          <CardDescription>Current bed occupancy by ward</CardDescription>
        </CardHeader>
        <CardContent>
          {wards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No wards configured yet
            </p>
          ) : (
            <div className="space-y-4">
              {wards.map((ward) => {
                const wardBeds = beds.filter((b) => b.wardId === ward.id);
                const occupancy = wardBeds.filter(
                  (b) => b.status === "occupied",
                ).length;
                return (
                  <div
                    key={ward.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{ward.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Floor {ward.floor}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {occupancy}/{wardBeds.length}
                      </p>
                      <p className="text-sm text-muted-foreground">occupied</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
