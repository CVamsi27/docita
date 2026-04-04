"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

export function DoctorManagementSettings() {
  const doctors = [
    { name: "Dr. Vamsi Krishna", specialty: "Cardiology", patients: 87 },
    { name: "Dr. Priya Sharma", specialty: "Pediatrics", patients: 124 },
    { name: "Dr. Arun Menon", specialty: "Dental", patients: 65 },
  ];

  return (
    <Card >
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Doctor Management</CardTitle>
          <CardDescription>
            Manage doctor profiles and assignments
          </CardDescription>
        </div>
        <Button size="sm">Add Doctor</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {doctors.map((doctor, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{doctor.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doctor.specialty} • {doctor.patients} patients
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  Schedule
                </Button>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
