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

export function ClinicGeneralSettings() {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Clinic Information</CardTitle>
        <CardDescription>Basic clinic settings and information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Clinic Name</Label>
          <Input placeholder="Enter clinic name" />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input placeholder="Enter address" />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input placeholder="Enter phone number" />
        </div>
        <Button className="w-full">Save Changes</Button>
      </CardContent>
    </Card>
  );
}
