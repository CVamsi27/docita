"use client";

import { parseStringEnumMember } from "@workspace/utils";
import {
  ENTERPRISE_BILLING_CYCLES,
  ENTERPRISE_CONTRACT_STATUSES,
  ENTERPRISE_QUOTE_PRESET_KEYS,
  ENTERPRISE_QUOTE_PRESETS,
} from "./enterprise-contracts-helpers";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { EnterpriseContractsEditorLimitsForm } from "./enterprise-contracts-editor-limits-form";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type EnterpriseContractsEditorFormProps = Pick<
  EnterpriseContractsPageState,
  "form" | "setForm" | "editorMode" | "applyPreset"
>;

export function EnterpriseContractsEditorForm({
  form,
  setForm,
  editorMode,
  applyPreset,
}: EnterpriseContractsEditorFormProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>Primary clinic ID</Label>
          <Input
            value={form.primaryClinicId}
            onChange={(e) =>
              setForm((f) => ({ ...f, primaryClinicId: e.target.value }))
            }
            disabled={editorMode === "edit"}
          />
        </div>
        <div>
          <Label>Group name (optional)</Label>
          <Input
            value={form.groupName}
            placeholder="e.g. Apollo Group"
            onChange={(e) =>
              setForm((f) => ({ ...f, groupName: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Contract number</Label>
          <Input
            value={form.contractNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, contractNumber: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Status</Label>
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
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Billing cycle</Label>
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
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="SEMI_ANNUAL">Semi-annual</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="enterprise-contract-start-date">Start date</Label>
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
          <Label htmlFor="enterprise-contract-end-date">End date</Label>
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
          <Label>Currency</Label>
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
          <Label>Platform fee ({form.currency})</Label>
          <Input
            value={form.platformFeeINR}
            onChange={(e) =>
              setForm((f) => ({ ...f, platformFeeINR: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="rounded-md border p-3">
        <p className="mb-2 text-sm font-medium">Quote presets</p>
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
