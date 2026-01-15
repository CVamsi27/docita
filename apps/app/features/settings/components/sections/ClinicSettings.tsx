import React from "react";
import { toast } from "sonner";
import { useClinicSettings, useUpdateClinicSettings } from "@/hooks/api/use-settings";
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
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateClinic, isPending } = useUpdateClinicSettings();
  const [formData, setFormData] = React.useState({
    name: "",
    address: "",
    phoneNumber: "",
  });

  React.useEffect(() => {
    if (clinic) {
      setFormData({
        name: clinic.name || "",
        address: clinic.address || "",
        phoneNumber: clinic.phoneNumber || "",
      });
    }
  }, [clinic]);

  const handleSubmit = () => {
    updateClinic(formData, {
      onSuccess: () => {
        toast.success("Clinic settings updated successfully");
      },
      onError: (error) => {
        toast.error("Failed to update settings: " + (error as Error).message);
      },
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Clinic Information</CardTitle>
        <CardDescription>Basic clinic settings and information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Clinic Name</Label>
          <Input 
            placeholder="Enter clinic name" 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input 
            placeholder="Enter address" 
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input 
            placeholder="Enter phone number" 
            value={formData.phoneNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
          />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
