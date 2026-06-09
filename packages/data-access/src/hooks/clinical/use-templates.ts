"use client";

import {
  CreateTemplateRequest,
  type TemplateContractResponse,
  ListTemplatesContractQuery,
  UpdateTemplateRequest,
} from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";
import { withQueryString } from "../../lib/query-string";

export const useTemplates = (filters?: ListTemplatesContractQuery) =>
  useAPIQuery<TemplateContractResponse[]>(
    queryKeys.clinical.templates.list(filters),
    withQueryString("/templates", filters),
  );

export const useTemplate = (id: string) =>
  useAPIQuery<TemplateContractResponse>(
    queryKeys.clinical.templates.detail(id),
    `/templates/${id}`,
  );

export const useCreateTemplate = () =>
  useAPIMutation<TemplateContractResponse, CreateTemplateRequest>(
    "/templates",
    "POST",
    {
      invalidateKeys: [queryKeys.clinical.templates.all()],
    },
  );

export const useUpdateTemplate = () =>
  useAPIMutation<
    TemplateContractResponse,
    UpdateTemplateRequest & { id: string }
  >((template) => `/templates/${template.id}`, "PATCH", {
    body: ({ id: _id, ...body }) => body,
    invalidateKeys: [queryKeys.clinical.templates.all()],
  });

export const useDeleteTemplate = () =>
  useAPIMutation<void, { id: string }>(
    (variables) => `/templates/${variables.id}`,
    "DELETE",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.clinical.templates.all()],
    },
  );
