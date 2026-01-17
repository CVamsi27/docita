import { useEffect, useState } from "react";
import { usePrescriptionDefaults, useUpdatePrescriptionDefaults } from "@/hooks/api/use-settings";
import { toast } from "sonner";
import {
  PrescriptionDefaultsSettings,
  PrescriptionDefaultsSettingsUI,
} from "./PrescriptionDefaultsSettingsUI";

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
