import { useEffect, useState } from "react";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";
import {
  PrescriptionDefaultsSettingsUI,
  PrescriptionDefaultsSettings,
} from "./PrescriptionDefaultsSettingsUI";

export function PrescriptionDefaultsSettingsContainer() {
  const { data: initialSettings, isLoading: loading, refetch } = apiHooks.usePrescriptionDefaults();
  const { mutate: updateSettings, isPending: saving } = apiHooks.useUpdatePrescriptionDefaults();
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
      }
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
