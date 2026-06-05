import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalEnterpriseContractEstimate,
  InternalEnterpriseContractInvoiceRow,
  InternalEnterpriseContractRevisionRow,
  InternalEnterpriseContractRow,
  InternalEnterpriseTrueUpAlertRow,
} from "../enterprise-contracts.types";

export function useInternalEnterpriseContracts(
  token: string | null | undefined,
  options?: Omit<
    UseQueryOptions<InternalEnterpriseContractRow[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.enterpriseContracts(),
    queryFn: () =>
      fetcher<InternalEnterpriseContractRow[]>(
        "/internal/enterprise-contracts",
      ),
    enabled: Boolean(token),
    ...options,
  });
}

export async function fetchInternalEnterpriseContractEstimate(
  fetcher: <T>(endpoint: string) => Promise<T>,
  contractId: string,
): Promise<InternalEnterpriseContractEstimate> {
  return fetcher<InternalEnterpriseContractEstimate>(
    `/internal/enterprise-contracts/${contractId}/estimate`,
  );
}

export async function fetchInternalEnterpriseContractRevisions(
  fetcher: <T>(endpoint: string) => Promise<T>,
  contractId: string,
): Promise<InternalEnterpriseContractRevisionRow[]> {
  return fetcher<InternalEnterpriseContractRevisionRow[]>(
    `/internal/enterprise-contracts/${contractId}/revisions`,
  );
}

export async function fetchInternalEnterpriseContractInvoices(
  fetcher: <T>(endpoint: string) => Promise<T>,
  contractId: string,
): Promise<InternalEnterpriseContractInvoiceRow[]> {
  return fetcher<InternalEnterpriseContractInvoiceRow[]>(
    `/internal/enterprise-contracts/${contractId}/invoices`,
  );
}

export async function fetchInternalEnterpriseContractTrueUpAlerts(
  fetcher: <T>(endpoint: string) => Promise<T>,
  contractId: string,
): Promise<InternalEnterpriseTrueUpAlertRow[]> {
  return fetcher<InternalEnterpriseTrueUpAlertRow[]>(
    `/internal/enterprise-contracts/${contractId}/true-up-alerts`,
  );
}
