"use client";

import { useTranslations } from "next-intl";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import type { EnterpriseContractsPageState } from "./use-enterprise-contracts-page";

type FormFields = EnterpriseContractsPageState["form"];
type SetForm = EnterpriseContractsPageState["setForm"];

/**
 * Phase 3 (per-feature): the enterprise contracts limits form is
 * the apps/internal admin sub-form for tier inclusions, overage
 * pricing, billing config, and document/notes. 21 literals
 * converted to useTranslations.
 */
function useEnterpriseContractsLimitsTranslations() {
  return useTranslations("InternalEnterpriseContracts.limits");
}

// jscpd:ignore-start
function IncludedLimitsFields({
  form,
  setForm,
}: {
  form: FormFields;
  setForm: SetForm;
}) {
  const t = useEnterpriseContractsLimitsTranslations();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div>
        <Label>{t("incUsers")}</Label>
        <Input
          value={form.includedUsers}
          onChange={(e) =>
            setForm((f) => ({ ...f, includedUsers: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>{t("incConsultations")}</Label>
        <Input
          value={form.includedConsultations}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              includedConsultations: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("incWhatsappMsgs")}</Label>
        <Input
          value={form.includedWhatsappMessages}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              includedWhatsappMessages: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("incStorageGB")}</Label>
        <Input
          value={form.includedStorageGB}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              includedStorageGB: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("incBranches")}</Label>
        <Input
          value={form.includedBranches}
          onChange={(e) =>
            setForm((f) => ({ ...f, includedBranches: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>{t("incDoctors")}</Label>
        <Input
          value={form.includedDoctors}
          onChange={(e) =>
            setForm((f) => ({ ...f, includedDoctors: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>{t("incPrescriptions")}</Label>
        <Input
          value={form.includedPrescriptions}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              includedPrescriptions: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("incInvoices")}</Label>
        <Input
          value={form.includedInvoices}
          onChange={(e) =>
            setForm((f) => ({ ...f, includedInvoices: e.target.value }))
          }
        />
      </div>
    </div>
  );
}
// jscpd:ignore-end

function OverageAndPricingFields({
  form,
  setForm,
}: {
  form: FormFields;
  setForm: SetForm;
}) {
  const t = useEnterpriseContractsLimitsTranslations();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div>
        <Label>{t("overageUser")}</Label>
        <Input
          value={form.overageUserINR}
          onChange={(e) =>
            setForm((f) => ({ ...f, overageUserINR: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>{t("overageConsult")}</Label>
        <Input
          value={form.overageConsultationINR}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              overageConsultationINR: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("overageWhatsapp")}</Label>
        <Input
          value={form.overageWhatsappINR}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              overageWhatsappINR: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("overageDoctor")}</Label>
        <Input
          value={form.overageDoctorINR}
          onChange={(e) =>
            setForm((f) => ({ ...f, overageDoctorINR: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>{t("overagePrescription")}</Label>
        <Input
          value={form.overagePrescriptionINR}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              overagePrescriptionINR: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("overageInvoice")}</Label>
        <Input
          value={form.overageInvoiceINR}
          onChange={(e) =>
            setForm((f) => ({ ...f, overageInvoiceINR: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>{t("setupFee")}</Label>
        <Input
          value={form.setupFeeINR}
          onChange={(e) =>
            setForm((f) => ({ ...f, setupFeeINR: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>{t("supportRetainer")}</Label>
        <Input
          value={form.dedicatedSupportINR}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              dedicatedSupportINR: e.target.value,
            }))
          }
        />
      </div>
    </div>
  );
}

function BillingConfigFields({
  form,
  setForm,
}: {
  form: FormFields;
  setForm: SetForm;
}) {
  const t = useEnterpriseContractsLimitsTranslations();
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label>{t("annualPrepayDiscount")}</Label>
        <Input
          value={form.annualPrepayDiscountPercent}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              annualPrepayDiscountPercent: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("trueUpThreshold")}</Label>
        <Input
          value={form.trueUpThresholdPercent}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              trueUpThresholdPercent: e.target.value,
            }))
          }
        />
      </div>
    </div>
  );
}

function DocumentAndNotesFields({
  form,
  setForm,
}: {
  form: FormFields;
  setForm: SetForm;
}) {
  const t = useEnterpriseContractsLimitsTranslations();
  return (
    <>
      <div>
        <Label>{t("signedDocumentUrl")}</Label>
        <Input
          value={form.signedDocumentUrl}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              signedDocumentUrl: e.target.value,
            }))
          }
        />
      </div>
      <div>
        <Label>{t("notes")}</Label>
        <Textarea
          value={form.notes}
          onChange={(e) =>
            setForm((f) => ({ ...f, notes: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>{t("changeSummary")}</Label>
        <Input
          value={form.changeSummary}
          placeholder={t("changeSummaryPlaceholder")}
          onChange={(e) =>
            setForm((f) => ({ ...f, changeSummary: e.target.value }))
          }
        />
      </div>
    </>
  );
}

export function EnterpriseContractsEditorLimitsFormSections({
  form,
  setForm,
}: {
  form: FormFields;
  setForm: SetForm;
}) {
  return (
    <>
      <IncludedLimitsFields form={form} setForm={setForm} />
      <OverageAndPricingFields form={form} setForm={setForm} />
      <BillingConfigFields form={form} setForm={setForm} />
      <DocumentAndNotesFields form={form} setForm={setForm} />
    </>
  );
}
