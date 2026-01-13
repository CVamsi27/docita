"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Calendar } from "lucide-react";

export function DoctorAvailabilitySettings() {
  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Doctor Availability</CardTitle>
              <CardDescription>
                Configure working hours and availability
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opening Time</Label>
              <Input type="time" defaultValue="09:00" />
            </div>
            <div className="space-y-2">
              <Label>Closing Time</Label>
              <Input type="time" defaultValue="18:00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Slot Duration (minutes)</Label>
            <Input type="number" defaultValue="15" min={5} max={60} step={5} />
          </div>
          <div className="space-y-2">
            <Label>Break Time</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input type="time" defaultValue="13:00" placeholder="Start" />
              <Input type="time" defaultValue="14:00" placeholder="End" />
            </div>
          </div>
          <Button className="w-full">Update Availability</Button>
        </CardContent>
      </Card>
    </div>
  );
}
