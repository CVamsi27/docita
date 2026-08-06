import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import { Feature } from "@workspace/types";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { deskApi } from "@/features/desk/api/desk.api";

export function useDeskOpenInvoices(
  patientId: string | null,
  options?: { enabled?: boolean },
) {
  const invoicingOk = useTierFeatureEnabled(Feature.INVOICING);
  return useQuery({
    queryKey: queryKeys.desk.openInvoices(patientId ?? undefined),
    queryFn: () =>
      deskApi.getOpenInvoices({
        patientId: patientId ?? "",
        limit: 50,
      }),
    enabled: invoicingOk && Boolean(patientId) && (options?.enabled ?? true),
  });
}
