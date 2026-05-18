import { Feature } from "@workspace/types";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { useDataAccessContext } from "../provider/hooks";

export const useMedicalCodingSettings = () => {
  const codingOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.MEDICAL_CODING,
  );
  return useAPIQuery<{
    enabled: boolean;
    provider: string;
    autoSuggest: boolean;
    preferredSystem: string;
  }>(["clinic", "medical-coding-settings"], "/clinical/medical-coding/settings", {
    enabled: codingOk,
  });
};

export const useUpdateMedicalCodingSettings = () =>
  useAPIMutation<
    { success: boolean },
    {
      enabled?: boolean;
      provider?: string;
      autoSuggest?: boolean;
      preferredSystem?: string;
    }
  >("/clinical/medical-coding/settings", "PUT");
