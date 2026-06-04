"use client";

import { EnterpriseContractsEditorLimitsFormSections } from "./enterprise-contracts-editor-limits-form-sections";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsEditorLimitsFormProps = Pick<
  EnterpriseContractsPageState,
  "form" | "setForm"
>;

export function EnterpriseContractsEditorLimitsForm({
  form,
  setForm,
}: EnterpriseContractsEditorLimitsFormProps) {
  return (
    <EnterpriseContractsEditorLimitsFormSections form={form} setForm={setForm} />
  );
}
