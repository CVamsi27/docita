export type {
  APIClientConfig,
  RequestConfig,
  APIError,
  PaginatedResponse,
  APIClient,
} from "./lib/types";
export {
  ErrorCodes,
  parseApiErrorResponse,
  getErrorCode,
  APIRequestError,
} from "./lib/errors";
export { createAPIClient } from "./lib/client-factory";
export { getAPIClient } from "./lib/singleton";
export { createCRUDResource } from "./lib/crud-resource";
export { createBrowserSessionManager } from "./lib/browser-session";
export type { BrowserSessionConfig, BrowserSessionManager } from "./lib/browser-session";
export { queryKeys, appQueryKeys } from "./lib/query-keys";

export { toQueryString, withQueryString } from "./lib/query-string";
export type {
  QueryPrimitive,
  QueryValue,
  QueryParams,
} from "./lib/query-string";

export * from "./partner";
export {
  IDEMPOTENCY_HEADER,
  generateIdempotencyKey,
  withIdempotencyKey,
} from "./lib/idempotency";

export { DataAccessProvider } from "./provider/data-access-provider";
export type { DataAccessConfig } from "./provider/context";
export { useDataAccessContext, useDataAccessFetcher } from "./provider/hooks";

export { useAPIQuery } from "./core/use-api-query";
export { useAPIQueryValidated } from "./core/use-api-query-validated";
export { QUERY_GC_TIMES, inferStaleTime } from "./core/stale-time";
export {
  useAPIMutation,
  type UseAPIMutationOptions,
} from "./core/use-api-mutation";

export type {
  AppConstants,
} from "./types/app-types";

// hooks barrel
export {
  useEffectivePermissions,
  clearEffectivePermissionsCache,
} from "./hooks/use-effective-permissions";
export {
  useAnalyticsOverview,
  useDiseaseTrends,
  useRevenueByCPT,
  useComplianceMetrics,
  useRevenueMetrics,
  useAppointmentMetrics,
  usePatientDemographics,
  useTopConditions,
  useAuditLogs,
} from "./hooks/use-analytics";
export {
  useAbdmCareContexts,
  useCreateAbdmCareContext,
  useRequestAbdmCareContextLink,
  useRequestAbdmCareContextShare,
  useCreateAbdmConsentRequest,
  useAbdmOpsInbox,
  useAbdmExternalRecords,
} from "./hooks/use-abdm";
export {
  useAppointments,
  useAppointment,
  usePatientAppointments,
  useTodayAppointments,
  useInfiniteAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useConsultationAutosaveUpdateAppointment,
  useCancelAppointment,
  useCheckInAppointment,
  useStartConsultation,
  useSyncDiagnoses,
  useFollowUps,
  useCompleteFollowUp,
  useCancelFollowUp,
  useBookFollowUp,
  useAppointmentRequests,
  useApproveAppointmentRequest,
  useRejectAppointmentRequest,
  useQueue,
  useQueueByDoctor,
  useCallPatient,
  useCompletePatient,
  useResetQueue,
} from "./hooks/use-appointments";
export type { AppointmentWithRelations, DiagnosisSyncItem, DiagnosesSyncRequestBody, QueueItem, AppointmentListItem } from "./hooks/use-appointments";
export { useActiveDelays, useActiveDoctorDelay, useMarkDoctorDelay, useClearDoctorDelay } from "./hooks/use-doctor-delays";
export type { DoctorDelayResponse, MarkDoctorDelayInput } from "./hooks/use-doctor-delays";
export {
  useInvoices,
  useInvoice,
  useInvoicePaymentActivity,
  useCollectionsByModeReport,
  useInvoiceClaimReadiness,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useBillingStatus,
  usePaymentHistory,
  useProrationPreview,
  useCreateCheckout,
  useActivateSubscription,
  useCancelSubscription,
  useInfiniteInvoices,
  normalizeInvoicesListResponse,
} from "./hooks/use-billing";
export type { InvoiceClaimReadiness } from "./hooks/use-billing";
export type { InvoiceListRow } from "./hooks/use-billing";
export { useBillingHistory } from "./hooks/use-billing-history";
export type { BillingHistoryItem } from "./hooks/use-billing-history";
export {
  useSaveVitals,
  usePrescriptions,
  usePatientPrescriptions,
  usePrescription,
  useCreatePrescription,
  useUpdatePrescription,
  useDeletePrescription,
  useDownloadPrescriptionPDF,
  useLabTests,
  useLabTestsStats,
  useCreateLabTestOrder,
  useUpdateLabTestOrder,
  useLabTestOrders,
  useLabTestStats,
  useLabTestCatalog,
  useCreateLabTest,
  useUpdateLabTest,
  useDeleteLabTest,
  useLabQueue,
  useRecordSampleCollection,
  useVerifyLabOrderPayment,
  useReleaseLabResult,
  useUploadLabResult,
  useLabs,
  useCreateLab,
  useUpdateLab,
  useDocuments,
  useDocument,
  useMedicalDocuments,
  useSignMedicalDocument,
  useRevokeMedicalDocument,
  useCreateMedicalDocument,
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "./hooks/use-clinical";
export type { LabQueueItem, MedicalDocument, CreateMedicalDocumentInput } from "./hooks/use-clinical";
export { useConstants, useFormOptions } from "./hooks/use-common";
export { useCreateContactInquiry } from "./hooks/use-contact";
export { useDashboardStats } from "./hooks/use-dashboard";
export { useResolvedFeatureFlags } from "./hooks/use-feature-flags";
export type { ResolvedFeatureFlagsResponse } from "./hooks/use-feature-flags";
export {
  useGuidedTourState,
  useUpdateGuidedTour,
} from "./hooks/use-guided-tour";
export {
  useInsuranceClaims,
  useInsuranceClaimsByPatient,
  useInsuranceClaim,
  useCreateInsuranceClaim,
  useUpdateInsuranceClaim,
  useTransitionInsuranceClaim,
  useAttachClaimDocument,
  useAttachableClaimDocuments,
} from "./hooks/use-insurance-claims";
export type { InsuranceClaimFilters } from "./hooks/use-insurance-claims";
export {
  useProcessOCR,
  useOcrCommitImport,
  useBulkImportTemplate,
  useBulkImport,
  useBulkImportJobStatus,
} from "./hooks/use-import";
export type {
  ProcessOcrMedication,
  ProcessOcrVitals,
  ProcessOcrInvoiceItem,
  ProcessOcrInvoice,
  ProcessOcrFields,
  ProcessOcrResponse,
} from "./hooks/use-import";
export {
  useInventory,
  useInventoryStats,
  useInventoryItem,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useAddInventoryMovement,
} from "./hooks/use-inventory";
export {
  useLeaves,
  useLeaveBalance,
  useApplyLeave,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
  useLeavePlans,
  useCreateLeavePlan,
  useUpdateLeavePlan,
} from "./hooks/use-leaves";
export {
  useICDCodes,
  useCPTCodes,
  useICDFavorites,
  useCPTFavorites,
  useAddICDFavorite,
  useRemoveICDFavorite,
  useAddCPTFavorite,
  useRemoveCPTFavorite,
  useCodingQueue,
  useSearchIcdCodes,
  useSearchCptCodes,
} from "./hooks/use-medical-coding";
export {
  useNotifications,
  useAllNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  usePendingJoinRequestCount,
} from "./hooks/use-notifications";
export type { StaffNotification } from "./hooks/use-notifications";
export {
  usePatientPortalDashboard,
  usePatientPortalAppointments,
  usePatientPortalAppointmentById,
  useRequestAppointment,
  usePatientPortalPrescriptions,
  usePatientPortalPrescriptionById,
  usePatientPortalInvoices,
  useUpdatePatientProfile,
  usePatientConsentSettings,
  useUpdatePatientConsent,
  useRequestDataDeletion,
  usePatientMedicalHistory,
  usePortalMetricCategories,
  usePortalMetricHistory,
  usePortalSelectedMetrics,
  useUpdatePortalSelectedMetrics,
  useRecordPortalMetricValue,
  useCreatePortalMetricDefinition,
  usePortalVitalsHistory,
  usePortalTimeline,
  usePortalSnapshot,
  usePortalActiveMedications,
  usePortalDoseHistory,
  useRecordPortalDose,
  usePortalAdherence,
} from "./hooks/use-patient-portal";
export {
  usePatientTimeline,
  usePatientSnapshot,
  useActiveMedications,
  useMedicationAdherence,
  useUpdateDoseStatus,
} from "./hooks/use-patient-timeline";
export {
  usePatientTags,
  useCreatePatientTag,
  useUpdatePatientTag,
  useDeletePatientTag,
} from "./hooks/use-patient-tags";
export {
  usePatients,
  useInfinitePatients,
  useRecentPatients,
  usePatient,
  usePatientWithMedicalHistory,
  usePatientMedicalHistoryFull,
  useCreatePatient,
  useUpdatePatient,
  useVerifyPatientAbha,
  useRequestAbhaOtp,
  useVerifyAbhaOtp,
  useDeletePatient,
  useTodaysPatients,
} from "./hooks/use-patients";
export type { VerifyPatientAbhaVariables, RequestAbhaOtpVariables, VerifyAbhaOtpVariables, PatientMedicalHistoryFull } from "./hooks/use-patients";
export {
  useCreatePatientCondition,
  useDeletePatientCondition,
  useCreatePatientAllergy,
  useUpdatePatientAllergy,
  useDeletePatientAllergy,
  useCreatePatientSurgicalHistory,
  useDeletePatientSurgicalHistory,
  useCreatePatientFamilyHistory,
  useDeletePatientFamilyHistory,
  useUpsertPatientSocialHistory,
} from "./hooks/use-patient-medical-history-mutations";
export {
  usePatientMetricCategories,
  usePatientMetricHistory,
  usePatientSelectedMetrics,
  useCreatePatientMetricCategory,
  useCreatePatientMetricDefinition,
  useUpdatePatientSelectedMetrics,
  useRecordPatientMetricValue,
} from "./hooks/use-patient-metrics";
export {
  usePublicBookingClinic,
  usePublicBookingDoctors,
  usePublicBookingSlots,
  usePublicBookingContext,
  usePublicBookingPhoneCheck,
  usePublicBookingOtpRequest,
  usePublicBookingOtpVerify,
  usePublicBookingSubmit,
} from "./hooks/use-public-booking";
export {
  useClinicSettings,
  useClinicAbdmDashboard,
  useClinicMembers,
  useCreateClinicDoctor,
  useCreateClinicReceptionist,
  useCreateClinicMember,
  useUpdateClinicMember,
  useDeleteClinicMember,
  useUpdateClinicSettings,
} from "./hooks/use-clinic-settings";
export type { ClinicAppSettings } from "./hooks/use-clinic-settings";
export {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
} from "./hooks/use-custom-fields";
export { usePrescriptionDefaults, useUpdatePrescriptionDefaults } from "./hooks/use-prescription-defaults";
export type { PrescriptionDefaults } from "./hooks/use-prescription-defaults";
export { useOpdSlipSettings, useUpdateOpdSlipSettings } from "./hooks/use-opd-slip-settings";
export type { OpdSlipSettings } from "./hooks/use-opd-slip-settings";
export {
  useDoctors,
  useDoctor,
  useCreateDoctor,
  useUpdateDoctor,
  useDeleteDoctor,
  useCreateDoctorSignatureUploadSession,
  useReverifyDoctorRegistration,
} from "./hooks/use-doctors";
export type { SignatureUploadSessionResponse } from "./hooks/use-doctors";
export {
  useDoctorSchedules,
  useClinicSchedules,
  useCreateDoctorSchedule,
  useBulkDoctorSchedules,
  useUpdateDoctorSchedule,
  useDeleteDoctorSchedule,
  useDoctorTimeOffs,
  useCreateDoctorTimeOff,
  useDeleteDoctorTimeOff,
  useDeleteDoctorTimeOffMutation,
  useUnavailableDoctorIdsForDate,
  useDoctorAvailabilitySlots,
} from "./hooks/use-doctor-availability";
export type { DoctorSchedule, DoctorTimeOff } from "./hooks/use-doctor-availability";
export { useMedicalCodingSettings, useUpdateMedicalCodingSettings } from "./hooks/use-medical-coding-settings";
export { useSubscription } from "./hooks/use-subscription";
export { usePricingConfig, useEstimate, useTierEstimates, useCurrentUsage } from "./hooks/use-pricing";
export type {
  EstimateUsageInputs,
  PricingConfig,
  TierPricing,
  EstimateRequest,
  EstimateResponse,
} from "./hooks/use-pricing";
export { useResumeSubscriptionPayment, useSchedulePlanChange, useCancelScheduledPlanChange } from "./hooks/use-subscription-billing-mutations";
export type { SchedulePlanChangeInput, SchedulePlanChangeResponse } from "./hooks/use-subscription-billing-mutations";
export { useUpdateProfile, useUserProfile, useRequestStaffAccountDeletion } from "./hooks/use-user-profile";
export {
  useGenerateSignatureToken,
  useActiveSignatureTokens,
  useRevokeSignatureToken,
  useGenerateSlaSignatureToken,
  useClinicActiveSignatureTokens,
  useRevokeClinicSignatureToken,
} from "./hooks/use-signature-upload";
export type { SignatureUploadToken, ActiveToken, UploadResult } from "./hooks/use-signature-upload";
export {
  useSendPrescriptionWhatsApp,
  useSendInvoiceWhatsApp,
  useResendPrescriptionWhatsApp,
  useResendInvoiceWhatsApp,
  useApprovePrescriptionWhatsApp,
  useApproveInvoiceWhatsApp,
  useResendAppointmentReminder,
  useWhatsappSender,
  useSendCustomWhatsAppMessage,
  usePatientWhatsappSentMessages,
  useClinicRecentSentMessages,
  useClinicWhatsappTemplates,
  useCreateWhatsappTemplate,
  useUpdateWhatsappTemplate,
  useDeleteWhatsappTemplate,
  useWhatsappStats,
  useUpdateWhatsappSender,
  useVerifyWhatsappSender,
  useRevokeWhatsappSender,
  useClinicWhatsappConversations,
  useClinicWhatsappConversationMessages,
  useMarkClinicWhatsappConversationRead,
  useReplyToClinicWhatsappConversation,
  useClinicWhatsappCampaigns,
  usePreviewClinicWhatsappCampaign,
  useCreateClinicWhatsappCampaign,
  useCancelClinicWhatsappCampaign,
} from "./hooks/use-whatsapp";

// File upload hooks
export { useUploadFile } from "./hooks/use-file-upload";
export type { UploadFileResult } from "./hooks/use-file-upload";

// Web Vitals RUM (shared reporter for app + internal; P4.5/P5.4e)
export {
  installWebVitalsReporter,
  postWebVitalsRum,
} from "./lib/monitoring/web-vitals";
export type {
  WebVitalsRumPayload,
  WebVitalsMetricName,
  WebVitalsMetricRating,
  WebVitalsReporterOptions,
} from "./lib/monitoring/web-vitals";

// Platform availability (shared outage store for app + internal)
export {
  buildApiHealthProbeUrl,
  createApiAvailabilityStore,
  createOutageRecoveryState,
  createReadinessProber,
  isPlatformOutageError,
  recoverFromApiOutage,
} from "./lib/api-availability";
export type {
  ApiAvailabilitySnapshot,
  ApiAvailabilityStatus,
  ApiAvailabilityStore,
  ApiProbeOutcome,
  ApiUnavailableReason,
  OutageRecoveryState,
} from "./lib/api-availability";
export {
  createApiAvailability,
  createUseApiAvailability,
  useNetworkStatus,
} from "./hooks/use-api-availability";
export { createApiAvailabilityGate } from "./provider/api-availability-gate";
