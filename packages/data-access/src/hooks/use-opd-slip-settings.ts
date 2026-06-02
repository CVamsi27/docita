import { useAPIMutation } from "../core/use-api-mutation";
import { queryKeys } from "../lib/query-keys";
import { useAPIQuery } from "../core/use-api-query";

export interface OpdSlipSettings {
  /** Free-revisit window printed on the slip, in days. 0 hides the notice. */
  revisitValidityDays: number;
  /** Optional extra footer line. */
  footerNote: string;
}

export const useOpdSlipSettings = () =>
  useAPIQuery<OpdSlipSettings>(
    queryKeys.clinic.opdSlipSettings(),
    "/clinic/opd-slip-settings",
  );

export const useUpdateOpdSlipSettings = () =>
  useAPIMutation<{ success: boolean }, Partial<OpdSlipSettings>>(
    "/clinic/opd-slip-settings",
    "PUT",
    {
      invalidateKeys: [queryKeys.clinic.opdSlipSettings()],
    },
  );
