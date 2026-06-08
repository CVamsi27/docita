"use client";

import {
  CreateLabTestOrderRequest,
  Feature,
  type LabTest,
  type LabTestOrder,
  UpdateLabTestOrderRequest,
} from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";
import { withQueryString } from "../../lib/query-string";
import { useDataAccessContext } from "../../provider/hooks";

export const useLabTests = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{ id: string; status: string; createdAt: Date }[]>(
    queryKeys.clinical.labTests.orders(),
    "/clinical/lab-tests/orders",
    { enabled: labOk },
  );
};

export const useLabTestsStats = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{ totalOrders: number; pendingOrders: number }>(
    queryKeys.clinical.labTests.stats(),
    "/clinical/lab-tests/stats",
    { enabled: labOk },
  );
};

export const useCreateLabTestOrder = () =>
  useAPIMutation<{ id: string; status: string }, CreateLabTestOrderRequest>(
    "/clinical/lab-tests/orders",
    "POST",
    {
      invalidateKeys: [
        queryKeys.clinical.labTests.orders(),
        queryKeys.clinical.labTests.ordersInvalidation(),
      ],
    },
  );

export const useUpdateLabTestOrder = (id: string) =>
  useAPIMutation<{ id: string; status: string }, UpdateLabTestOrderRequest>(
    `/clinical/lab-tests/orders/${id}/status`,
    "PUT",
    {
      invalidateKeys: [
        queryKeys.clinical.labTests.orders(),
        queryKeys.clinical.labTests.ordersInvalidation(),
      ],
    },
  );

export const useLabTestOrders = (filters?: {
  search?: string;
  status?: string;
  date?: string;
  patientId?: string;
}) => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<LabTestOrder[]>(
    queryKeys.clinical.labTests.ordersList(filters),
    withQueryString("/clinical/lab-tests/orders", filters),
    { enabled: labOk },
  );
};

export const useLabTestStats = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<{
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
    total: number;
  }>(
    queryKeys.clinical.labTests.statsDashboard(),
    "/clinical/lab-tests/stats",
    {
      enabled: labOk,
    },
  );
};

export const useLabTestCatalog = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<LabTest[]>(
    queryKeys.clinical.labTests.catalog(),
    "/clinical/lab-tests",
    { enabled: labOk },
  );
};
