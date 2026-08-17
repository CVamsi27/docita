import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { complianceApi } from "@/features/settings/api/settings.api";
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataState,
} from "@workspace/ui/components";
import { FileText, CheckCircle2 } from "lucide-react";
import { formatDate } from "@workspace/utils";
import {
  createDataSubjectRequestSchema,
  type CreateDataSubjectRequest,
  type DataSubjectRequestStatus,
} from "@workspace/types";
import type {
  AppAuditLogSummary,
  AppComplianceSummary,
  AppDataSubjectRequest,
} from "@workspace/types";
import { INITIAL_REQUEST_FORM, type UpdateRequestPayload } from "./compliance-settings-constants";
import {
  PatientRightsCard,
  LogRequestDialog,
  ConsentTemplateCard,
  DpdpConsentCard,
  DataRetentionCard,
  AuditLogCard,
} from "./compliance-settings-sections";

export function ComplianceSettingsPanel() {
  const clinicId = "current";
  const queryClient = useQueryClient();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] =
    useState<CreateDataSubjectRequest>(INITIAL_REQUEST_FORM);

  const { data: compliance, isLoading, error } = useQuery<AppComplianceSummary>({
    queryKey: ["compliance", clinicId],
    queryFn: () => complianceApi.getSummary<AppComplianceSummary>(),
    enabled: !!clinicId,
  });

  const { data: recentAuditLogs } = useQuery<AppAuditLogSummary[]>({
    queryKey: ["audit", "recent"],
    queryFn: () => complianceApi.getRecentAuditLogs<AppAuditLogSummary[]>(),
    enabled: !!clinicId,
  });

  const { data: dataSubjectRequests = [] } = useQuery<AppDataSubjectRequest[]>(
    {
      queryKey: ["compliance", "data-subject-requests"],
      queryFn: () =>
        complianceApi.getDataSubjectRequests<AppDataSubjectRequest[]>(),
      enabled: !!clinicId,
    },
  );

  const invalidateComplianceData = () => {
    queryClient.invalidateQueries({ queryKey: ["compliance", clinicId] });
    queryClient.invalidateQueries({ queryKey: ["audit", "recent"] });
    queryClient.invalidateQueries({
      queryKey: ["compliance", "data-subject-requests"],
    });
  };

  const createRequestMutation = useMutation<
    AppDataSubjectRequest,
    Error,
    CreateDataSubjectRequest
  >({
    mutationFn: (data) =>
      complianceApi.createDataSubjectRequest<AppDataSubjectRequest>(data),
    onSuccess: () => {
      toast.success("Patient rights request logged");
      setRequestDialogOpen(false);
      setRequestForm(INITIAL_REQUEST_FORM);
      invalidateComplianceData();
    },
    onError: (error) => {
      showUserFacingErrorToast(
        error,
        "We could not log this patient rights request. Please try again.",
        "save",
      );
    },
  });

  const updateRequestMutation = useMutation<
    AppDataSubjectRequest,
    Error,
    UpdateRequestPayload
  >({
    mutationFn: (data) =>
      complianceApi.updateDataSubjectRequestStatus<AppDataSubjectRequest>(
        data.requestId,
        data.status,
      ),
    onSuccess: () => {
      toast.success("Patient rights request updated");
      invalidateComplianceData();
    },
    onError: (error) => {
      showUserFacingErrorToast(
        error,
        "We could not update this patient rights request. Please try again.",
        "save",
      );
    },
  });

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
      showUserFacingErrorToast(undefined, "Please check the request details and try again.");
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

  const dataStateStatus = isLoading ? "loading" : error ? "error" : "success";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DataState
        status={dataStateStatus}
        errorMessage="We could not load your compliance settings. Please try again."
        onRetry={() => window.location.reload()}
      >
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
      </DataState>
    </div>
  );
}
