"use client";

import { useMemo, useState } from "react";
import { useInternalEnterpriseContracts } from "@workspace/data-access/internal";
import { useDataAccessFetcher } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth";
import {
  computeContractTotals,
  deriveContractsLoadError,
  deriveContractsTableStatus,
  LOAD_CONTRACTS_ERROR,
} from "./enterprise-contracts-helpers";
import { useEnterpriseContractDialogs } from "./use-enterprise-contracts-dialogs";

export function useEnterpriseContractsPage() {
  const { token } = useAuth();
  const fetcher = useDataAccessFetcher();
  const contractsQuery = useInternalEnterpriseContracts(token);
  const rows = useMemo(() => contractsQuery.data ?? [], [contractsQuery.data]);
  const contractsLoadError = deriveContractsLoadError(contractsQuery.isError, contractsQuery.error);
  const contractsTableStatus = deriveContractsTableStatus(contractsQuery.isLoading, contractsLoadError, rows);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => { setRefreshing(true); setError(null); const r = await contractsQuery.refetch(); if (r.isError) setError(LOAD_CONTRACTS_ERROR); setRefreshing(false); };

  const dialogs = useEnterpriseContractDialogs(load, setError, setBusy, fetcher);
  const totals = useMemo(() => computeContractTotals(rows), [rows]);

  return { rows, contractsTableStatus, contractsLoadError, contractsQuery, refreshing, error, busy, totals, load, ...dialogs };
}

export type EnterpriseContractsPageState = ReturnType<typeof useEnterpriseContractsPage>;
