"use client";

import { parseStringEnumMember } from "@workspace/utils";
import { useTranslations } from "next-intl";
import {
  ENTERPRISE_BILLING_CYCLES,
  ENTERPRISE_CONTRACT_STATUSES,
  ENTERPRISE_QUOTE_PRESET_KEYS,
  ENTERPRISE_QUOTE_PRESETS,
} from "./enterprise-contracts-helpers";
import {
  Button,
  Input,
  IsoDatePickerField,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui/components";
import { EnterpriseContractsEditorLimitsForm } from "./enterprise-contracts-editor-limits-form";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsEditorFormProps = Pick<
  EnterpriseContractsPageState,
  "form" | "setForm" | "editorMode" | "applyPreset"
>;

/**
 * Phase 3 (per-feature): the enterprise contracts editor form
 * is the apps/internal admin view for creating/editing group
 * contracts (clinic group, contract number, status, billing
 * cycle, dates, currency, platform fee, quote presets). 20
 * literals converted to useTranslations.
 */
function useEnterpriseContractsTranslations() {
  return useTranslations("InternalEnterpriseContracts.editor");
}

export function EnterpriseContractsEditorForm({
  form,
  setForm,
  editorMode,
  applyPreset,
}: EnterpriseContractsEditorFormProps) {
  const t = useEnterpriseContractsTranslations();
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>{t("primaryClinicIdLabel")}</Label>
          <Input
            value={form.primaryClinicId}
            onChange={(e) =>
              setForm((f) => ({ ...f, primaryClinicId: e.target.value }))
            }
            disabled={editorMode === "edit"}
          />
        </div>
        <div>
          <Label>{t("groupNameLabel")}</Label>
          <Input
            value={form.groupName}
            placeholder={t("groupNamePlaceholder")}
            onChange={(e) =>
              setForm((f) => ({ ...f, groupName: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>{t("contractNumberLabel")}</Label>
          <Input
            value={form.contractNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, contractNumber: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>{t("statusLabel")}</Label>
          <Select
            value={form.status}
            onValueChange={(v) => {
              const status = parseStringEnumMember(
                ENTERPRISE_CONTRACT_STATUSES,
                v,
              );
              if (status) {
                setForm((f) => ({ ...f, status }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">{t("statusDraft")}</SelectItem>
              <SelectItem value="ACTIVE">{t("statusActive")}</SelectItem>
              <SelectItem value="EXPIRED">{t("statusExpired")}</SelectItem>
              <SelectItem value="TERMINATED">{t("statusTerminated")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("billingCycleLabel")}</Label>
          <Select
            value={form.billingCycle}
            onValueChange={(v) => {
              const billingCycle = parseStringEnumMember(
                ENTERPRISE_BILLING_CYCLES,
                v,
              );
              if (!billingCycle) return;
              setForm((f) => ({ ...f, billingCycle }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">{t("cycleMonthly")}</SelectItem>
              <SelectItem value="QUARTERLY">{t("cycleQuarterly")}</SelectItem>
              <SelectItem value="SEMI_ANNUAL">{t("cycleSemiAnnual")}</SelectItem>
              <SelectItem value="YEARLY">{t("cycleYearly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="enterprise-contract-start-date">{t("startDateLabel")}</Label>
          <IsoDatePickerField
            id="enterprise-contract-start-date"
            label=""
            showLabel={false}
            value={form.startDate}
            onChange={(startDate) => setForm((f) => ({ ...f, startDate }))}
            triggerClassName="sm:w-full"
          />
        </div>
        <div>
          <Label htmlFor="enterprise-contract-end-date">{t("endDateLabel")}</Label>
          <IsoDatePickerField
            id="enterprise-contract-end-date"
            label=""
            showLabel={false}
            value={form.endDate}
            onChange={(endDate) => setForm((f) => ({ ...f, endDate }))}
            triggerClassName="sm:w-full"
          />
        </div>
        <div>
          <Label>{t("currencyLabel")}</Label>
          <Input
            value={form.currency}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                currency: e.target.value.toUpperCase(),
              }))
            }
          />
        </div>
        <div>
          <Label>{t("platformFeeLabel", { currency: form.currency })}</Label>
          <Input
            value={form.platformFeeINR}
            onChange={(e) =>
              setForm((f) => ({ ...f, platformFeeINR: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="rounded-md border p-3">
        <p className="mb-2 text-sm font-medium">{t("quotePresetsLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {ENTERPRISE_QUOTE_PRESET_KEYS.map((k) => (
            <Button
              key={k}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(k)}
            >
              {ENTERPRISE_QUOTE_PRESETS[k].label}
            </Button>
          ))}
        </div>
      </div>
      <EnterpriseContractsEditorLimitsForm form={form} setForm={setForm} />
    </>
  );
}
