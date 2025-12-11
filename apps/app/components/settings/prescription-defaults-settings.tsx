"use client";

import { useState, useCallback, useRef, useSyncExternalStore } from "react";
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
import { API_URL } from "@/lib/api";
import { Save, FileText } from "lucide-react";
import { Checkbox } from "@workspace/ui/components/checkbox";

export function PrescriptionDefaultsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultInstructions: "",
    defaultFooterText: "",
    includeClinicHeader: true,
    includeDoctorSignature: true,
    includeQRCode: false,
  });
  const hasFetchedRef = useRef(false);

  const loadSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem("docita_token");
      const response = await fetch(`${API_URL}/clinic/prescription-defaults`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          defaultInstructions:
            data.defaultInstructions ?? prev.defaultInstructions,
          defaultFooterText: data.defaultFooterText ?? prev.defaultFooterText,
          includeClinicHeader:
            data.includeClinicHeader ?? prev.includeClinicHeader,
          includeDoctorSignature:
            data.includeDoctorSignature ?? prev.includeDoctorSignature,
          includeQRCode: data.includeQRCode ?? prev.includeQRCode,
        }));
      }
    } catch (error) {
      console.error("Failed to load prescription defaults:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useSyncExternalStore to trigger initial fetch
  useSyncExternalStore(
    useCallback(() => {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        loadSettings();
      }
      return () => {};
    }, [loadSettings]),
    () => settings,
    () => settings,
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("docita_token");
      const response = await fetch(`${API_URL}/clinic/prescription-defaults`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert("Prescription defaults have been updated successfully.");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save prescription defaults. Please try again.";
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

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
              setSettings({ ...settings, defaultInstructions: e.target.value })
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
              setSettings({ ...settings, defaultFooterText: e.target.value })
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
                setSettings({
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
                setSettings({
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
                setSettings({ ...settings, includeQRCode: checked as boolean })
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
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Defaults"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
