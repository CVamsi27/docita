"use client";

import {
  CreateLabRequest,
  Feature,
  type LabContractResponse,
  UpdateLabRequest,
} from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";
import { useDataAccessContext } from "../../provider/hooks";

export const useLabs = () => {
  const labOk = useDataAccessContext().isTierFeatureEnabled(Feature.LAB_TESTS);
  return useAPIQuery<LabContractResponse[]>(
    queryKeys.clinical.labTests.labs(),
    "/clinical/lab-tests/labs",
    { enabled: labOk },
  );
};

export const useCreateLab = () =>
  useAPIMutation<LabContractResponse, CreateLabRequest>(
    "/clinical/lab-tests/labs",
    "POST",
    { invalidateKeys: [queryKeys.clinical.labTests.labs()] },
  );

export const useUpdateLab = () =>
  useAPIMutation<LabContractResponse, { id: string } & UpdateLabRequest>(
    (vars) => `/clinical/lab-tests/labs/${vars.id}`,
    "PUT",
    {
      body: ({ id: _id, ...body }) => body,
      invalidateKeys: [queryKeys.clinical.labTests.labs()],
    },
  );
