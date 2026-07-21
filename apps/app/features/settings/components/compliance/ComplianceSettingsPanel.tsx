"use client";

// jscpd:ignore-start
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@workspace/ui/components";
import { FileText, CheckCircle2 } from "lucide-react";
import { formatDate } from "@workspace/utils";
import { ClinicSlaSignatureQR } from "@/features/settings/components/clinic-sla-signature-qr";
import { useAPIMutation, useAPIQuery } from "@/lib/api/api-core";
import { queryKeys } from "@/lib/api/query-keys";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  createDataSubjectRequestSchema,
// jscpd:ignore-end
  type CreateDataSubjectRequest,
  type DataSubjectRequestStatus,
} from "@workspace/types";
import type {
  AppAuditLogSummary,
  AppComplianceSummary,
  AppDataSubjectRequest,
} from "@workspace/types";
import {
  INITIAL_REQUEST_FORM,
  type UpdateRequestPayload,
} from "./compliance-settings-constants";
import {
  PatientRightsCard,
  LogRequestDialog,
  ConsentTemplateCard,
  DpdpConsentCard,
  DataRetentionCard,
  AuditLogCard,
} from "./compliance-settings-sections";

export function ComplianceSettingsPanel() {
  const { user } = useAuth();
  const clinicId = user?.clinicId ?? "";
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] =
    useState<CreateDataSubjectRequest>(INITIAL_REQUEST_FORM);

  const { data: compliance } = useAPIQuery<AppComplianceSummary>(
    queryKeys.compliance.summary(clinicId),
    `/clinics/${clinicId}/compliance`,
    { enabled: !!clinicId },
  );

  const { data: recentAuditLogs } = useAPIQuery<AppAuditLogSummary[]>(
    queryKeys.compliance.recentAuditLogs(clinicId),
    `/audit/recent?limit=5`,
    { enabled: !!clinicId },
  );

  const { data: dataSubjectRequests = [] } = useAPIQuery<
    AppDataSubjectRequest[]
  >(
    queryKeys.compliance.dataSubjectRequests(clinicId),
    `/clinics/${clinicId}/data-subject-requests`,
    { enabled: !!clinicId },
  );

  const invalidateComplianceData = [
    queryKeys.compliance.summary(clinicId),
    queryKeys.compliance.dataSubjectRequests(clinicId),
    queryKeys.compliance.recentAuditLogs(clinicId),
  ] as const;

  const createRequestMutation = useAPIMutation<
    AppDataSubjectRequest,
    CreateDataSubjectRequest
  >(`/clinics/${clinicId}/data-subject-requests`, "POST", {
    invalidateKeys: invalidateComplianceData,
    onSuccess: () => {
      toast.success("Patient rights request logged");
      setRequestDialogOpen(false);
      setRequestForm(INITIAL_REQUEST_FORM);
    },
    onError: (error) => {
      showUserFacingErrorToast(
        error,
        "We could not log this patient rights request. Please try again.",
        "form",
      );
    },
  });

  const updateRequestMutation = useAPIMutation<
    AppDataSubjectRequest,
    UpdateRequestPayload
  >(
    (variables) =>
      `/clinics/${clinicId}/data-subject-requests/${variables.requestId}`,
    "PATCH",
    {
      invalidateKeys: invalidateComplianceData,
      onSuccess: () => {
        toast.success("Patient rights request updated");
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not update this patient rights request. Please try again.",
          "form",
        );
      },
    },
  );

  const handleCreateRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = createDataSubjectRequestSchema.safeParse({
      ...requestForm,
      patientId: requestForm.patientId || undefined,
      requestedByName: requestForm.requestedByName || undefined,
      requestedByRelation: requestForm.requestedByRelation || undefined,
      requestChannel: requestForm.requestChannel || undefined,
      requestDetails: requestForm.requestDetails || undefined,
      dueAt: requestForm.dueAt || undefined,
    });

    if (!parsed.success) {
      showUserFacingErrorToast(
        null,
        "Please check the request details and try again",
        "form",
      );
      return;
    }

    createRequestMutation.mutate(parsed.data);
  };

  const updateRequestStatus = (
    requestId: string,
    status: DataSubjectRequestStatus,
  ) => {
    updateRequestMutation.mutate({ requestId, status });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {compliance?.slaSignatureUrl && compliance.slaSignatureAcceptedAt && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            SLA accepted and signed on
            <span className="ml-1">
              {formatDate(compliance.slaSignatureAcceptedAt, "dd MMMM yyyy")}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Service Level Agreement Signature
          </CardTitle>
          <CardDescription>
            Your SLA signature is a legally binding record of your acceptance of
            Docita&apos;s service terms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compliance?.slaSignatureUrl && (
            <div className="mb-4 rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Current signature on file
              </p>
              <img
                src={compliance.slaSignatureUrl}
                alt="Current SLA signature"
                className="max-h-20 object-contain"
              />
            </div>
          )}
          <ClinicSlaSignatureQR clinicId={clinicId} />
        </CardContent>
      </Card>

      <PatientRightsCard
        compliance={compliance}
        dataSubjectRequests={dataSubjectRequests}
        updateRequestMutation={updateRequestMutation}
        onLogRequest={() => setRequestDialogOpen(true)}
        onUpdateStatus={updateRequestStatus}
        clinicId={clinicId}
      />

      <LogRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        requestForm={requestForm}
        onRequestFormChange={setRequestForm}
        onSubmit={handleCreateRequest}
        isPending={createRequestMutation.isPending}
      />

      <DpdpConsentCard compliance={compliance} />

      <ConsentTemplateCard />

      <DataRetentionCard />

      <AuditLogCard recentAuditLogs={recentAuditLogs} />
    </div>
  );
}
