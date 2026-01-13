"use client";

import React, { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { BedDouble, Users, Activity, Calendar } from "lucide-react";

// Import shared types from ipdRules
// Adjusting import path since we are in components folder now: ../rules/ipdRules matches
import type {
  Bed,
  Ward,
  BedStatus,
  BedType,
  WardType,
} from "../rules/ipdRules";

// Additional types for form data and component props
interface AdmissionFormData {
  patientId: string;
  wardId: string;
  bedId: string;
  attendingDoctorId: string;
  diagnosis?: string;
  notes?: string;
}

interface IpdDashboardProps {
  wards?: Ward[];
  beds?: Bed[];
}

interface AdmissionFormProps {
  onSubmit?: (data: AdmissionFormData) => void;
}

interface BedMapProps {
  ward?: Ward;
  beds?: Bed[];
}

// IPD Dashboard
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

// Admission Form
export const AdmissionForm: FC<AdmissionFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    patientId: "",
    wardId: "",
    bedId: "",
    attendingDoctorId: "",
    diagnosis: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData as AdmissionFormData);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>New Admission</CardTitle>
        <CardDescription>Admit a patient to the hospital</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Patient</label>
            <input
              className="w-full p-2 rounded-md border bg-background"
              placeholder="Search patient by name or phone..."
              value={formData.patientId}
              onChange={(e) =>
                setFormData({ ...formData, patientId: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ward</label>
              <select
                className="w-full p-2 rounded-md border bg-background"
                value={formData.wardId}
                onChange={(e) =>
                  setFormData({ ...formData, wardId: e.target.value })
                }
              >
                <option value="">Select Ward</option>
                <option value="general">General Ward</option>
                <option value="icu">ICU</option>
                <option value="private">Private Room</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bed</label>
              <select
                className="w-full p-2 rounded-md border bg-background"
                value={formData.bedId}
                onChange={(e) =>
                  setFormData({ ...formData, bedId: e.target.value })
                }
              >
                <option value="">Select Bed</option>
                <option value="bed-1">Bed 101</option>
                <option value="bed-2">Bed 102</option>
                <option value="bed-3">Bed 103</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Attending Doctor</label>
            <select
              className="w-full p-2 rounded-md border bg-background"
              value={formData.attendingDoctorId}
              onChange={(e) =>
                setFormData({ ...formData, attendingDoctorId: e.target.value })
              }
            >
              <option value="">Select Doctor</option>
              <option value="dr1">Dr. Vamsi Krishna</option>
              <option value="dr2">Dr. Priya Sharma</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Admission Diagnosis</label>
            <textarea
              className="w-full p-2 rounded-md border bg-background min-h-[80px]"
              placeholder="Primary diagnosis for admission..."
              value={formData.diagnosis}
              onChange={(e) =>
                setFormData({ ...formData, diagnosis: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="w-full p-2 rounded-md border bg-background min-h-[60px]"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
          <Button type="submit" className="w-full">
            Admit Patient
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Bed Map
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

// Export types
export type {
  Bed,
  Ward,
  BedStatus,
  BedType,
  WardType,
  AdmissionFormData,
  IpdDashboardProps,
  AdmissionFormProps,
  BedMapProps,
};
