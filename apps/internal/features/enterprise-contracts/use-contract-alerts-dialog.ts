"use client";

import { useState } from "react";
import type { DataAccessConfig } from "@workspace/data-access";
import {
  type InternalEnterpriseTrueUpAlertRow as EnterpriseTrueUpAlertRow,
  fetchInternalEnterpriseContractTrueUpAlerts,
} from "@workspace/data-access/internal";
import { LOAD_ALERTS_ERROR } from "./enterprise-contracts-helpers";

export function useContractAlertsDialog(
  setError: (e: string | null) => void,
  fetcher: DataAccessConfig["fetcher"],
) {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<EnterpriseTrueUpAlertRow[]>([]);

  const showAlerts = async (contractId: string) => {
    setAlerts([]);
    setAlertsOpen(true);
    try {
      setAlerts(
        await fetchInternalEnterpriseContractTrueUpAlerts(fetcher, contractId),
      );
    } catch {
      setError(LOAD_ALERTS_ERROR);
    }
  };

  return {
    alertsOpen,
    setAlertsOpen,
    alerts,
    showAlerts,
  };
}
