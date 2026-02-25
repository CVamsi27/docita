"use client";

import { useEffect, useState } from "react";
import {
  usePrescriptionDefaults,
  useUpdatePrescriptionDefaults,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FileText, Save } from "lucide-react";
import { Checkbox } from "@workspace/ui/components/checkbox";

export interface PrescriptionDefaultsSettings {
  defaultInstructions: string;
  defaultFooterText: string;
  includeClinicHeader: boolean;
  includeDoctorSignature: boolean;
  includeQRCode: boolean;
}

export interface PrescriptionDefaultsSettingsUIProps {
  settings: PrescriptionDefaultsSettings;
  loading: boolean;
  saving: boolean;
  onSettingsChange: (settings: PrescriptionDefaultsSettings) => void;
  onSave: () => void;
}

export function PrescriptionDefaultsSettingsUI({
  settings,
  loading,
  saving,
  onSettingsChange,
  onSave,
}: PrescriptionDefaultsSettingsUIProps) {
  if (loading) {
    return (
      <div className="text-center py-8">Loading prescription defaults...</div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Prescription Defaults</CardTitle>
        </div>
        <CardDescription>
          Set default values for all prescriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="defaultInstructions">Default Instructions</Label>
          <Textarea
            id="defaultInstructions"
            value={settings.defaultInstructions}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                defaultInstructions: e.target.value,
              })
            }
            placeholder="e.g., Take medicines after food, Drink plenty of water, etc."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            These instructions will be pre-filled in every new prescription
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultFooterText">Footer Text</Label>
          <Textarea
            id="defaultFooterText"
            value={settings.defaultFooterText}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                defaultFooterText: e.target.value,
              })
            }
            placeholder="e.g., For any queries, please contact us at..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This text will appear at the bottom of every prescription
          </p>
        </div>

        <div className="space-y-4">
          <Label>Prescription Options</Label>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeClinicHeader"
              checked={settings.includeClinicHeader}
              onCheckedChange={(checked) =>
                onSettingsChange({
                  ...settings,
                  includeClinicHeader: checked as boolean,
                })
              }
            />
            <label
              htmlFor="includeClinicHeader"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include clinic header with logo and contact details
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeDoctorSignature"
              checked={settings.includeDoctorSignature}
              onCheckedChange={(checked) =>
                onSettingsChange({
                  ...settings,
                  includeDoctorSignature: checked as boolean,
                })
              }
            />
            <label
              htmlFor="includeDoctorSignature"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include doctor&apos;s signature and registration number
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeQRCode"
              checked={settings.includeQRCode}
              onCheckedChange={(checked) =>
                onSettingsChange({
                  ...settings,
                  includeQRCode: checked as boolean,
                })
              }
            />
            <label
              htmlFor="includeQRCode"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include QR code for verification
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Defaults"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrescriptionDefaultsSettingsContainer() {
  const {
    data: initialSettings,
    isLoading: loading,
    refetch,
  } = usePrescriptionDefaults();
  const { mutate: updateSettings, isPending: saving } =
    useUpdatePrescriptionDefaults();
  const [settings, setSettings] = useState<PrescriptionDefaultsSettings>({
    defaultInstructions: "",
    defaultFooterText: "",
    includeClinicHeader: true,
    includeDoctorSignature: true,
    includeQRCode: false,
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleSave = () => {
    updateSettings(settings, {
      onSuccess: () => {
        toast.success("Prescription defaults have been updated successfully.");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save prescription defaults.");
      },
    });
  };

  return (
    <PrescriptionDefaultsSettingsUI
      settings={settings}
      loading={loading}
      saving={saving}
      onSettingsChange={setSettings}
      onSave={handleSave}
    />
  );
}
