"use client";

import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
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
    <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <Label>Inc. users</Label>
              <Input
                value={form.includedUsers}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includedUsers: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Inc. consultations</Label>
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
              <Label>Inc. WhatsApp msgs</Label>
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
              <Label>Inc. storage GB</Label>
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
              <Label>Inc. branches</Label>
              <Input
                value={form.includedBranches}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includedBranches: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Inc. doctors</Label>
              <Input
                value={form.includedDoctors}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includedDoctors: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Inc. prescriptions</Label>
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
              <Label>Inc. invoices</Label>
              <Input
                value={form.includedInvoices}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includedInvoices: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Overage / user</Label>
              <Input
                value={form.overageUserINR}
                onChange={(e) =>
                  setForm((f) => ({ ...f, overageUserINR: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Overage / consult</Label>
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
              <Label>Overage / WA msg</Label>
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
              <Label>Overage / doctor</Label>
              <Input
                value={form.overageDoctorINR}
                onChange={(e) =>
                  setForm((f) => ({ ...f, overageDoctorINR: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Overage / prescription</Label>
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
              <Label>Overage / invoice</Label>
              <Input
                value={form.overageInvoiceINR}
                onChange={(e) =>
                  setForm((f) => ({ ...f, overageInvoiceINR: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Setup fee</Label>
              <Input
                value={form.setupFeeINR}
                onChange={(e) =>
                  setForm((f) => ({ ...f, setupFeeINR: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Support retainer</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Annual prepay discount %</Label>
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
              <Label>True-up threshold %</Label>
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

          <div>
            <Label>Signed document URL</Label>
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
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Change summary (revision log)</Label>
            <Input
              value={form.changeSummary}
              placeholder="Why this change?"
              onChange={(e) =>
                setForm((f) => ({ ...f, changeSummary: e.target.value }))
              }
            />
          </div>
    </>
  );
}
